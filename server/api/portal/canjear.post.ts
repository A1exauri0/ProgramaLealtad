// ==============================================================================
// Endpoint API · Canjear Recompensa desde el Portal (POST /api/portal/canjear)
// Transacción Todo o Nada con bloqueo pesimista SELECT ... FOR UPDATE
// Previene condiciones de carrera cuando 2 clientes canjean la última unidad
// ==============================================================================

import crypto from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { clientes, recompensas, canjes, cupones, movimientosPuntos } from '~~/database/schema/index'
import { exigirSesionPortal } from '~~/server/utils/jwtPortal'
import { convertirUtcAUgc6Fecha } from '~~/server/utils/fidelizacion'

// Jerarquía numérica de niveles de fidelización
const JERARQUIA_NIVELES: Record<string, number> = {
  Bronce: 1,
  Plata: 2,
  Oro: 3,
}

/**
 * Genera un código alfanumérico único con formato LEAL-XXXX-XXXX
 */
function generarCodigoCuponUnico(): string {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(8)
  let bloque1 = ''
  let bloque2 = ''
  for (let i = 0; i < 4; i++) {
    bloque1 += caracteres[bytes[i]! % caracteres.length]
    bloque2 += caracteres[bytes[i + 4]! % caracteres.length]
  }
  return `LEAL-${bloque1}-${bloque2}`
}

export default defineEventHandler(async (event) => {
  const sesion = await exigirSesionPortal(event)
  const body = await readBody(event)

  const recompensaId = Number(body?.recompensaId)
  if (!recompensaId || isNaN(recompensaId)) {
    throw createError({ statusCode: 400, statusMessage: 'ID de recompensa inválido.' })
  }

  // Ejecutar TODA la validación y descuento dentro de una sola transacción SQL con FOR UPDATE
  const resultadoCanje = await db.transaction(async (tx) => {
    // 1. Bloquear la fila de la recompensa (SELECT ... FOR UPDATE) para serializar canjes simultáneos
    const [recompensa] = await tx
      .select()
      .from(recompensas)
      .where(eq(recompensas.id, recompensaId))
      .for('update')

    if (!recompensa || !recompensa.activo) {
      throw createError({ statusCode: 400, statusMessage: 'La recompensa no está disponible para canje.' })
    }

    // 2. Validar stock bajo bloqueo exclusivo
    if (recompensa.stock !== null && recompensa.stock <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Lo sentimos, esta recompensa se encuentra agotada (sin stock disponible).',
      })
    }

    // 3. Bloquear la fila del cliente (SELECT ... FOR UPDATE) para evitar saldo negativo concurrente
    const [cliente] = await tx
      .select()
      .from(clientes)
      .where(eq(clientes.id, sesion.clienteId))
      .for('update')

    if (!cliente) {
      throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado.' })
    }

    // 4. Validar nivel mínimo requerido
    const nivelClienteNum = JERARQUIA_NIVELES[cliente.nivel] || 1
    const nivelMinimoNum = JERARQUIA_NIVELES[recompensa.nivelMinimo] || 1
    if (nivelClienteNum < nivelMinimoNum) {
      throw createError({
        statusCode: 400,
        statusMessage: `Esta recompensa requiere nivel ${recompensa.nivelMinimo}. Tu nivel actual es ${cliente.nivel}.`,
      })
    }

    // 5. Validar límite de canjes por cliente (si está definido en la recompensa)
    if (recompensa.limitePorCliente !== null && recompensa.limitePorCliente !== undefined && recompensa.limitePorCliente > 0) {
      const [conteoPrevios] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(canjes)
        .where(
          sql`${canjes.clienteId} = ${cliente.id} AND ${canjes.recompensaId} = ${recompensa.id} AND ${canjes.estatus} != 'cancelado'`
        )

      if ((conteoPrevios?.total || 0) >= recompensa.limitePorCliente) {
        throw createError({
          statusCode: 400,
          statusMessage: `Has alcanzado el límite máximo permitido (${recompensa.limitePorCliente}) para esta recompensa.`,
        })
      }
    }

    // 6. Validar saldo de puntos disponibles
    const puntosDisponibles = cliente.puntosDisponibles || 0
    if (puntosDisponibles < recompensa.puntosRequeridos) {
      throw createError({
        statusCode: 400,
        statusMessage: `Puntos insuficientes. Requieres ${recompensa.puntosRequeridos} pts y cuentas con ${puntosDisponibles} pts.`,
      })
    }

    // 7. Descontar puntos al cliente
    const [clienteActualizado] = await tx
      .update(clientes)
      .set({
        puntosDisponibles: sql`${clientes.puntosDisponibles} - ${recompensa.puntosRequeridos}`,
        actualizadoEn: new Date(),
      })
      .where(eq(clientes.id, cliente.id))
      .returning({ puntosRestantes: clientes.puntosDisponibles })

    // 8. Si tiene stock finito, decrementar en 1
    if (recompensa.stock !== null) {
      await tx
        .update(recompensas)
        .set({
          stock: sql`${recompensas.stock} - 1`,
          actualizadoEn: new Date(),
        })
        .where(eq(recompensas.id, recompensa.id))
    }

    // 9. Crear el registro de canje
    const estatusInicial = recompensa.tipo === 'descuento' ? 'entregado' : 'pendiente'
    const [nuevoCanje] = await tx
      .insert(canjes)
      .values({
        clienteId: cliente.id,
        recompensaId: recompensa.id,
        puntosGastados: recompensa.puntosRequeridos,
        estatus: estatusInicial,
        fechaCanje: new Date(),
        fechaEntrega: recompensa.tipo === 'descuento' ? new Date() : null,
      })
      .returning()

    // 10. Registrar el movimiento negativo 'canje' en el historial de puntos
    const fechaHoy = convertirUtcAUgc6Fecha(new Date().toISOString()) || '2026-04-30'
    await tx
      .insert(movimientosPuntos)
      .values({
        clienteId: cliente.id,
        fecha: fechaHoy,
        tipo: 'canje',
        referencia: `canje:${nuevoCanje!.id}`,
        puntos: -recompensa.puntosRequeridos,
        origen: 'canje',
      })
      .onConflictDoNothing()

    // 11. Si es cupón de descuento, generar el cupón único LEAL-XXXX-XXXX
    let cuponGenerado = null
    if (recompensa.tipo === 'descuento') {
      const codigoAleatorio = generarCodigoCuponUnico()
      const diasVigencia = recompensa.vigenciaDias || 30
      const fechaVencimiento = new Date(Date.now() + diasVigencia * 24 * 60 * 60 * 1000)

      const [cupon] = await tx
        .insert(cupones)
        .values({
          canjeId: nuevoCanje!.id,
          clienteId: cliente.id,
          codigo: codigoAleatorio,
          descuentoTipo: recompensa.descuentoTipo || 'porcentaje',
          descuentoValor: String(recompensa.descuentoValor || 10),
          compraMinimaMxn: recompensa.compraMinimaMxn ? String(recompensa.compraMinimaMxn) : null,
          fechaVencimiento,
          estatus: 'vigente',
        })
        .returning()

      cuponGenerado = cupon
    }

    return {
      tipoRecompensa: recompensa.tipo,
      canje: nuevoCanje,
      cupon: cuponGenerado,
      puntosRestantes: clienteActualizado?.puntosRestantes ?? 0,
    }
  })

  return {
    ok: true,
    mensaje:
      resultadoCanje.tipoRecompensa === 'descuento'
        ? `¡Canje exitoso! Tu cupón ${resultadoCanje.cupon?.codigo} ha sido generado.`
        : '¡Canje registrado con éxito! El personal de la tienda preparará tu entrega.',
    datos: resultadoCanje,
  }
})
