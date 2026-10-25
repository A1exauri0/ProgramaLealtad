// ==============================================================================
// Endpoint API · Canjear Recompensa desde el Portal (POST /api/portal/canjear)
// Valida saldo, nivel y stock; descuenta puntos y genera canje y cupón atómicamente
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

export default defineEventHandler(async (event) => {
  const sesion = await exigirSesionPortal(event)
  const body = await readBody(event)

  const recompensaId = Number(body?.recompensaId)
  if (!recompensaId || isNaN(recompensaId)) {
    throw createError({ statusCode: 400, statusMessage: 'ID de recompensa inválido.' })
  }

  // 1. Obtener datos actuales del cliente
  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, sesion.clienteId))
    .limit(1)

  if (!cliente) {
    throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado.' })
  }

  // 2. Obtener la recompensa solicitada
  const [recompensa] = await db
    .select()
    .from(recompensas)
    .where(eq(recompensas.id, recompensaId))
    .limit(1)

  if (!recompensa || !recompensa.activo) {
    throw createError({ statusCode: 400, statusMessage: 'La recompensa no está disponible para canje.' })
  }

  // 3. Validar disponibilidad de stock
  if (recompensa.stock !== null && recompensa.stock <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Lo sentimos, esta recompensa se encuentra agotada temporalmente.',
    })
  }

  // 4. Validar nivel de lealtad requerido
  const nivelClienteNum = JERARQUIA_NIVELES[cliente.nivel] || 1
  const nivelMinimoNum = JERARQUIA_NIVELES[recompensa.nivelMinimo] || 1
  if (nivelClienteNum < nivelMinimoNum) {
    throw createError({
      statusCode: 400,
      statusMessage: `Esta recompensa requiere nivel ${recompensa.nivelMinimo}. Tu nivel actual es ${cliente.nivel}.`,
    })
  }

  // 5. Validar saldo de puntos disponibles
  const puntosDisponibles = cliente.puntosDisponibles || 0
  if (puntosDisponibles < recompensa.puntosRequeridos) {
    throw createError({
      statusCode: 400,
      statusMessage: `Puntos insuficientes. Requieres ${recompensa.puntosRequeridos} pts y cuentas con ${puntosDisponibles} pts.`,
    })
  }

  // 6. Transacción atómica de canje
  const resultadoCanje = await db.transaction(async (tx) => {
    // A. Descontar puntos al cliente
    const [clienteActualizado] = await tx
      .update(clientes)
      .set({
        puntosDisponibles: sql`${clientes.puntosDisponibles} - ${recompensa.puntosRequeridos}`,
        actualizadoEn: new Date(),
      })
      .where(eq(clientes.id, cliente.id))
      .returning({ puntosRestantes: clientes.puntosDisponibles })

    // B. Si tiene stock finito, decrementar en 1
    if (recompensa.stock !== null) {
      await tx
        .update(recompensas)
        .set({
          stock: sql`${recompensas.stock} - 1`,
          actualizadoEn: new Date(),
        })
        .where(eq(recompensas.id, recompensa.id))
    }

    // C. Crear el registro de canje
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

    // D. Registrar el movimiento en el historial de puntos
    const fechaHoy = convertirUtcAUgc6Fecha(new Date().toISOString()) || '2026-04-30'
    await tx
      .insert(movimientosPuntos)
      .values({
        clienteId: cliente.id,
        fecha: fechaHoy,
        tipo: 'canje',
        referencia: `canje:${nuevoCanje.id}`,
        puntos: -recompensa.puntosRequeridos,
        origen: 'canje',
      })
      .onConflictDoNothing()

    // E. Si es cupón de descuento, generar el cupón único
    let cuponGenerado = null
    if (recompensa.tipo === 'descuento') {
      const codigoAleatorio = `LEAL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
      const diasVigencia = recompensa.vigenciaDias || 30
      const fechaVencimiento = new Date(Date.now() + diasVigencia * 24 * 60 * 60 * 1000)

      const [cupon] = await tx
        .insert(cupones)
        .values({
          canjeId: nuevoCanje.id,
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
      canje: nuevoCanje,
      cupon: cuponGenerado,
      puntosRestantes: clienteActualizado.puntosRestantes,
    }
  })

  return {
    ok: true,
    mensaje:
      recompensa.tipo === 'descuento'
        ? `¡Canje exitoso! Tu cupón ${resultadoCanje.cupon?.codigo} ha sido generado.`
        : '¡Canje registrado con éxito! El personal de la tienda preparará tu entrega.',
    datos: resultadoCanje,
  }
})
