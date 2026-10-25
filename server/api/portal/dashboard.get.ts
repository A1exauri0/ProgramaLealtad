// ==============================================================================
// Endpoint API · Datos del Dashboard del Portal del Cliente (GET /api/portal/dashboard)
// Consolida perfil, saldo, recompensas canjeables, cupones e historial de movimientos
// ==============================================================================

import { eq, desc } from 'drizzle-orm'
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

  // 2. Consultar catálogo de recompensas activas
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

    let motivoBloqueo: string | null = null
    if (!tieneStock) {
      motivoBloqueo = 'Agotado temporalmente'
    } else if (!tieneNivel) {
      motivoBloqueo = `Requiere nivel ${rec.nivelMinimo}`
    } else if (!tienePuntos) {
      const faltantes = rec.puntosRequeridos - (cliente.puntosDisponibles || 0)
      motivoBloqueo = `Te faltan ${faltantes} pts`
    }

    return {
      ...rec,
      puedeCanjear: tienePuntos && tieneNivel && tieneStock,
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

  // 6. Cálculo de avance de nivel
  const gasto12mNum = Number(cliente.gasto12m || 0)
  let siguienteNivel: string | null = null
  let gastoParaSiguiente = 0
  let porcentajeNivel = 100

  if (cliente.nivel === 'Bronce') {
    siguienteNivel = 'Plata'
    gastoParaSiguiente = Math.max(0, 5000 - gasto12mNum)
    porcentajeNivel = Math.min(100, Math.round((gasto12mNum / 5000) * 100))
  } else if (cliente.nivel === 'Plata') {
    siguienteNivel = 'Oro'
    gastoParaSiguiente = Math.max(0, 15000 - gasto12mNum)
    porcentajeNivel = Math.min(100, Math.round(((gasto12mNum - 5000) / 10000) * 100))
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
  }
})
