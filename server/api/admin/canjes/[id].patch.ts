// ==============================================================================
// Endpoint API: PATCH /api/admin/canjes/[id]
// Actualiza el estado de un canje: entregar o cancelar (con devolución atómica)
// Protegido por autenticación y permiso 'gestionar_canjes'
// ==============================================================================

// Dependencias de base de datos
import { eq, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { canjes, clientes, recompensas, cupones, movimientosPuntos } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'
import { convertirUtcAUgc6Fecha } from '~~/server/utils/fidelizacion'

export default defineEventHandler(async (event) => {
  // Validación de permiso
  await exigirPermisoBackend(event, 'gestionar_canjes')

  const idParam = getRouterParam(event, 'id')
  const canjeId = Number(idParam)
  if (!canjeId || isNaN(canjeId)) {
    throw createError({ statusCode: 400, statusMessage: 'ID de canje inválido.' })
  }

  const body = await readBody(event)
  const accion = body?.accion as 'entregar' | 'cancelar' | 'aplicar_cupon' | undefined

  if (!accion || !['entregar', 'cancelar', 'aplicar_cupon'].includes(accion)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Acción no válida. Debe ser "entregar", "aplicar_cupon" o "cancelar".',
    })
  }

  // Obtener el canje actual
  const [canjeActual] = await db
    .select()
    .from(canjes)
    .where(eq(canjes.id, canjeId))
    .limit(1)

  if (!canjeActual) {
    throw createError({ statusCode: 404, statusMessage: 'El canje solicitado no existe.' })
  }

  if (canjeActual.estatus === 'cancelado') {
    throw createError({
      statusCode: 400,
      statusMessage: 'El canje ya se encuentra cancelado.',
    })
  }

  // ACCIÓN 1: ENTREGAR PRODUCTO
  if (accion === 'entregar') {
    if (canjeActual.estatus === 'entregado') {
      throw createError({
        statusCode: 400,
        statusMessage: 'El canje ya ha sido marcado como entregado previamente.',
      })
    }

    const [actualizado] = await db
      .update(canjes)
      .set({
        estatus: 'entregado',
        fechaEntrega: new Date(),
        actualizadoEn: new Date(),
      })
      .where(eq(canjes.id, canjeId))
      .returning()

    return {
      ok: true,
      mensaje: 'Canje marcado como entregado satisfactoriamente.',
      canje: actualizado,
    }
  }

  // ACCIÓN 2: APLICAR CUPÓN (Marcar cupón como 'usado')
  if (accion === 'aplicar_cupon') {
    const [cuponActual] = await db
      .select()
      .from(cupones)
      .where(eq(cupones.canjeId, canjeId))
      .limit(1)

    if (!cuponActual) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Este canje no tiene un cupón de descuento asociado.',
      })
    }

    if (cuponActual.estatus !== 'vigente') {
      throw createError({
        statusCode: 400,
        statusMessage: `El cupón no se puede aplicar porque su estado actual es "${cuponActual.estatus}".`,
      })
    }

    if (cuponActual.fechaVencimiento && new Date(cuponActual.fechaVencimiento) < new Date()) {
      await db
        .update(cupones)
        .set({ estatus: 'vencido' })
        .where(eq(cupones.id, cuponActual.id))

      throw createError({
        statusCode: 400,
        statusMessage: 'El cupón ha expirado y fue marcado como vencido.',
      })
    }

    const [cuponUsado] = await db
      .update(cupones)
      .set({
        estatus: 'usado',
        usadoEn: new Date(),
      })
      .where(eq(cupones.id, cuponActual.id))
      .returning()

    return {
      ok: true,
      mensaje: `Cupón ${cuponUsado?.codigo} aplicado y marcado como usado.`,
      cupon: cuponUsado,
    }
  }

  // ACCIÓN 2: CANCELAR (Transaccional)
  const motivo = typeof body?.motivoCancelacion === 'string' ? body.motivoCancelacion.trim() : ''
  if (!motivo || motivo.length < 3) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debes proporcionar un motivo de cancelación descriptivo (mínimo 3 caracteres).',
    })
  }

  const resultado = await db.transaction(async (tx) => {
    // 1. Actualizar el canje a cancelado
    const [canjeCancelado] = await tx
      .update(canjes)
      .set({
        estatus: 'cancelado',
        motivoCancelacion: motivo,
        actualizadoEn: new Date(),
      })
      .where(eq(canjes.id, canjeId))
      .returning()

    // 2. Si hay cupón asociado, cancelarlo
    await tx
      .update(cupones)
      .set({
        estatus: 'cancelado',
      })
      .where(eq(cupones.canjeId, canjeId))

    // 3. Si la recompensa tiene stock definido, reponer la unidad
    const [recompensa] = await tx
      .select()
      .from(recompensas)
      .where(eq(recompensas.id, canjeActual.recompensaId))
      .limit(1)

    if (recompensa && recompensa.stock !== null && recompensa.stock !== undefined) {
      await tx
        .update(recompensas)
        .set({
          stock: sql`${recompensas.stock} + 1`,
          actualizadoEn: new Date(),
        })
        .where(eq(recompensas.id, recompensa.id))
    }

    // 4. Reintegrar los puntos al cliente
    await tx
      .update(clientes)
      .set({
        puntosDisponibles: sql`${clientes.puntosDisponibles} + ${canjeActual.puntosGastados}`,
        actualizadoEn: new Date(),
      })
      .where(eq(clientes.id, canjeActual.clienteId))

    // 5. Registrar el movimiento de devolución en el historial de puntos
    const fechaHoy = convertirUtcAUgc6Fecha(new Date().toISOString()) || '2026-04-30'
    await tx
      .insert(movimientosPuntos)
      .values({
        clienteId: canjeActual.clienteId,
        fecha: fechaHoy,
        tipo: 'devolucion',
        referencia: `canje_cancelado:${canjeActual.id}`,
        puntos: canjeActual.puntosGastados,
        origen: 'canje',
      })
      .onConflictDoNothing()

    return canjeCancelado
  })

  return {
    ok: true,
    mensaje: `Canje #${canjeId} cancelado. Se reembolsaron ${canjeActual.puntosGastados} puntos al cliente.`,
    canje: resultado,
  }
})
