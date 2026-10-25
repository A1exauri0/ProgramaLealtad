// ==============================================================================
// Endpoint API: GET /api/admin/clientes/{id}
// Ficha completa del cliente: pedidos, pagos, movimientos y estado del portal
// Protegido por sesión y con enmascaramiento estricto según permiso financiero
// ==============================================================================

// Dependencias de base de datos
import { eq, desc } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import {
  clientes,
  cuentasPortal,
  pedidos,
  pagos,
  movimientosPuntos,
} from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  // 1. Exigir permiso 'buscar_cliente_detalle' en backend (HTTP 403 si no lo tiene)
  const usuario = await exigirPermisoBackend(event, 'buscar_cliente_detalle')
  const puedeVerMontos = usuario.permisos.includes('ver_montos_financieros')

  // 2. Extraer ID del cliente
  const idParam = getRouterParam(event, 'id')
  const clienteId = Number(idParam)

  if (!clienteId || isNaN(clienteId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de cliente inválido.',
    })
  }

  // 3. Buscar datos del cliente
  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1)

  if (!cliente) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Cliente no encontrado.',
    })
  }

  // 4. Buscar cuenta del portal
  const [cuenta] = await db
    .select({
      estadoAcceso: cuentasPortal.estadoAcceso,
      requiereCambioPassword: cuentasPortal.requiereCambioPassword,
      intentosFallidos: cuentasPortal.intentosFallidos,
      bloqueadoHasta: cuentasPortal.bloqueadoHasta,
      ultimoAccesoEn: cuentasPortal.ultimoAccesoEn,
      actualizadoEn: cuentasPortal.actualizadoEn,
    })
    .from(cuentasPortal)
    .where(eq(cuentasPortal.clienteId, clienteId))
    .limit(1)

  // 5. Historial de pedidos
  const listaPedidos = await db
    .select({
      id: pedidos.id,
      numeroOrden: pedidos.numeroOrden,
      estatus: pedidos.estatus,
      estatusPago: pedidos.estatusPago,
      total: pedidos.total,
      fechaLocal: pedidos.fechaLocal,
      fechaCreacionUtc: pedidos.fechaCreacionUtc,
    })
    .from(pedidos)
    .where(eq(pedidos.clienteId, clienteId))
    .orderBy(desc(pedidos.fechaLocal), desc(pedidos.id))

  // 6. Historial de pagos
  const listaPagos = await db
    .select({
      id: pagos.id,
      pedidoId: pagos.pedidoId,
      montoOriginal: pagos.montoOriginal,
      moneda: pagos.moneda,
      montoMxn: pagos.montoMxn,
      estatus: pagos.estatus,
      fechaLocal: pagos.fechaLocal,
      fechaPagoUtc: pagos.fechaPagoUtc,
    })
    .from(pagos)
    .where(eq(pagos.clienteId, clienteId))
    .orderBy(desc(pagos.fechaLocal), desc(pagos.id))

  // 7. Movimientos de puntos
  const listaMovimientos = await db
    .select({
      id: movimientosPuntos.id,
      fecha: movimientosPuntos.fecha,
      tipo: movimientosPuntos.tipo,
      referencia: movimientosPuntos.referencia,
      puntos: movimientosPuntos.puntos,
      origen: movimientosPuntos.origen,
      creadoEn: movimientosPuntos.creadoEn,
    })
    .from(movimientosPuntos)
    .where(eq(movimientosPuntos.clienteId, clienteId))
    .orderBy(desc(movimientosPuntos.fecha), desc(movimientosPuntos.id))

  // 8. Enmascarar datos financieros según permiso ver_montos_financieros
  return {
    cliente: {
      ...cliente,
      gasto12m: puedeVerMontos ? cliente.gasto12m : null,
      puedeVerMontos,
    },
    cuentaPortal: cuenta || null,
    pedidos: listaPedidos.map((p) => ({
      ...p,
      total: puedeVerMontos ? p.total : null,
    })),
    pagos: listaPagos.map((p) => ({
      ...p,
      montoOriginal: puedeVerMontos ? p.montoOriginal : null,
      montoMxn: puedeVerMontos ? p.montoMxn : null,
    })),
    movimientos: listaMovimientos,
    puedeVerMontos,
  }
})
