// ==============================================================================
// Endpoint API · Datos del Dashboard del Portal del Cliente (GET /api/portal/dashboard)
// Consolida perfil, saldo, recompensas canjeables, cupones e historial de movimientos
// ==============================================================================

import { eq, desc, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { clientes, recompensas, canjes, cupones, movimientosPuntos } from '~~/database/schema/index'
import { exigirSesionPortal } from '~~/server/utils/jwtPortal'

// Jerarquía numérica de niveles de fidelización
const JERARQUIA_NIVELES: Record<string, number> = {
  Bronce: 1,
  Plata: 2,
  Oro: 3,
}

export default defineEventHandler(async (event) => {
  const sesion = await exigirSesionPortal(event)

  // 1. Consultar datos del cliente
  const [cliente] = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
      telefono: clientes.telefono,
      nivel: clientes.nivel,
      puntosDisponibles: clientes.puntosDisponibles,
      puntosHistoricos: clientes.puntos,
      gasto12m: clientes.gasto12m,
      enRiesgo: clientes.enRiesgo,
      diasSinActividad: clientes.diasSinActividad,
    })
    .from(clientes)
    .where(eq(clientes.id, sesion.clienteId))
    .limit(1)

  if (!cliente) {
    throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado.' })
  }

  // 2. Consultar conteo de canjes activos por recompensa para este cliente (límite por cliente)
  const conteoCanjesPorRecompensa = await db
    .select({
      recompensaId: canjes.recompensaId,
      cantidad: sql<number>`count(*)::int`,
    })
    .from(canjes)
    .where(sql`${canjes.clienteId} = ${cliente.id} AND ${canjes.estatus} != 'cancelado'`)
    .groupBy(canjes.recompensaId)

  const mapaCanjesCliente = new Map<number, number>()
  for (const fila of conteoCanjesPorRecompensa) {
    mapaCanjesCliente.set(fila.recompensaId, Number(fila.cantidad))
  }

  // 3. Consultar catálogo de recompensas activas
  const catalogoRecompensas = await db
    .select()
    .from(recompensas)
    .where(eq(recompensas.activo, true))
    .orderBy(recompensas.puntosRequeridos)

  const nivelClienteNum = JERARQUIA_NIVELES[cliente.nivel] || 1

  const recompensasEvaluadas = catalogoRecompensas.map((rec) => {
    const nivelMinimoNum = JERARQUIA_NIVELES[rec.nivelMinimo] || 1
    const tienePuntos = (cliente.puntosDisponibles || 0) >= rec.puntosRequeridos
    const tieneNivel = nivelClienteNum >= nivelMinimoNum
    const tieneStock = rec.stock === null || rec.stock > 0
    const canjesRealizados = mapaCanjesCliente.get(rec.id) || 0
    const excedeLimite =
      rec.limitePorCliente !== null &&
      rec.limitePorCliente !== undefined &&
      canjesRealizados >= rec.limitePorCliente

    let motivoBloqueo: string | null = null
    if (!tieneStock) {
      motivoBloqueo = 'Agotado temporalmente'
    } else if (excedeLimite) {
      motivoBloqueo = `Límite alcanzado (${rec.limitePorCliente} por cliente)`
    } else if (!tieneNivel) {
      motivoBloqueo = `Requiere nivel ${rec.nivelMinimo}`
    } else if (!tienePuntos) {
      const faltantes = rec.puntosRequeridos - (cliente.puntosDisponibles || 0)
      motivoBloqueo = `Te faltan ${faltantes} pts`
    }

    return {
      ...rec,
      canjesRealizados,
      puedeCanjear: tienePuntos && tieneNivel && tieneStock && !excedeLimite,
      motivoBloqueo,
    }
  })

  // 3. Consultar cupones de descuento del cliente
  const misCupones = await db
    .select({
      id: cupones.id,
      codigo: cupones.codigo,
      descuentoTipo: cupones.descuentoTipo,
      descuentoValor: cupones.descuentoValor,
      compraMinimaMxn: cupones.compraMinimaMxn,
      fechaVencimiento: cupones.fechaVencimiento,
      estatus: cupones.estatus,
      creadoEn: cupones.creadoEn,
      recompensaNombre: recompensas.nombre,
    })
    .from(cupones)
    .innerJoin(canjes, eq(cupones.canjeId, canjes.id))
    .innerJoin(recompensas, eq(canjes.recompensaId, recompensas.id))
    .where(eq(cupones.clienteId, cliente.id))
    .orderBy(desc(cupones.creadoEn))

  // 4. Consultar historial de canjes del cliente
  const misCanjes = await db
    .select({
      id: canjes.id,
      recompensaNombre: recompensas.nombre,
      recompensaTipo: recompensas.tipo,
      recompensaFotoUrl: recompensas.fotoUrl,
      puntosGastados: canjes.puntosGastados,
      estatus: canjes.estatus,
      fechaCanje: canjes.fechaCanje,
      fechaEntrega: canjes.fechaEntrega,
      cuponCodigo: cupones.codigo,
    })
    .from(canjes)
    .innerJoin(recompensas, eq(canjes.recompensaId, recompensas.id))
    .leftJoin(cupones, eq(canjes.id, cupones.canjeId))
    .where(eq(canjes.clienteId, cliente.id))
    .orderBy(desc(canjes.fechaCanje))

  // 5. Consultar historial de movimientos de puntos
  const misMovimientos = await db
    .select({
      id: movimientosPuntos.id,
      fecha: movimientosPuntos.fecha,
      tipo: movimientosPuntos.tipo,
      referencia: movimientosPuntos.referencia,
      puntos: movimientosPuntos.puntos,
      creadoEn: movimientosPuntos.creadoEn,
    })
    .from(movimientosPuntos)
    .where(eq(movimientosPuntos.clienteId, cliente.id))
    .orderBy(desc(movimientosPuntos.fecha), desc(movimientosPuntos.id))
    .limit(50)

  // 6. Cálculo de avance de nivel según umbrales oficiales (Plata: $150,000 MXN, Oro: > $400,000 MXN)
  const gasto12mNum = Number(cliente.gasto12m || 0)
  let siguienteNivel: string | null = null
  let gastoParaSiguiente = 0
  let porcentajeNivel = 100

  if (cliente.nivel === 'Bronce') {
    siguienteNivel = 'Plata'
    gastoParaSiguiente = Math.max(0, 150000 - gasto12mNum)
    porcentajeNivel = Math.min(100, Math.round((gasto12mNum / 150000) * 100))
  } else if (cliente.nivel === 'Plata') {
    siguienteNivel = 'Oro'
    gastoParaSiguiente = Math.max(0, 400000.01 - gasto12mNum)
    porcentajeNivel = Math.min(100, Math.round(((gasto12mNum - 150000) / 250000) * 100))
  }

  // 7. Notificaciones del portal (Punto extra: canje registrado, producto entregado y cupón por vencer)
  const notificaciones: Array<{ id: string; tipo: 'info' | 'exito' | 'alerta'; titulo: string; mensaje: string }> = []
  const ahoraMs = Date.now()

  for (const cj of misCanjes.slice(0, 5)) {
    if (cj.estatus === 'pendiente') {
      notificaciones.push({
        id: `canje-pend-${cj.id}`,
        tipo: 'info',
        titulo: 'Canje registrado',
        mensaje: `Tu solicitud de "${cj.recompensaNombre}" está pendiente de entrega en tienda.`,
      })
    } else if (cj.estatus === 'entregado' && cj.recompensaTipo === 'producto') {
      notificaciones.push({
        id: `canje-ent-${cj.id}`,
        tipo: 'exito',
        titulo: 'Producto entregado',
        mensaje: `Tu recompensa "${cj.recompensaNombre}" fue entregada satisfactoriamente.`,
      })
    }
  }

  for (const cup of misCupones) {
    if (cup.estatus === 'vigente' && cup.fechaVencimiento) {
      const diasParaVencer = Math.ceil((new Date(cup.fechaVencimiento).getTime() - ahoraMs) / (1000 * 60 * 60 * 24))
      if (diasParaVencer >= 0 && diasParaVencer <= 7) {
        notificaciones.push({
          id: `cupon-venc-${cup.id}`,
          tipo: 'alerta',
          titulo: 'Cupón próximo a vencer',
          mensaje: `Tu cupón ${cup.codigo} (${cup.recompensaNombre}) vence en ${diasParaVencer} día(s).`,
        })
      }
    }
  }

  return {
    ok: true,
    cliente: {
      ...cliente,
      siguienteNivel,
      gastoParaSiguiente,
      porcentajeNivel,
    },
    recompensas: recompensasEvaluadas,
    cupones: misCupones,
    canjes: misCanjes,
    movimientos: misMovimientos,
    notificaciones,
  }
})
