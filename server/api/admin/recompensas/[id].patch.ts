// ==============================================================================
// Endpoint API: PATCH /api/admin/recompensas/[id]
// Actualiza datos de una recompensa existente o alterna su estatus activo/inactivo
// Protegido por autenticación y permiso 'gestionar_catalogo_recompensas'
// ==============================================================================

// Dependencias de base de datos
import { eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { recompensas } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  await exigirPermisoBackend(event, 'gestionar_catalogo_recompensas')

  const idParam = getRouterParam(event, 'id')
  const recompensaId = Number(idParam)
  if (!recompensaId || isNaN(recompensaId)) {
    throw createError({ statusCode: 400, statusMessage: 'ID de recompensa inválido.' })
  }

  const [existente] = await db
    .select()
    .from(recompensas)
    .where(eq(recompensas.id, recompensaId))

  if (!existente) {
    throw createError({ statusCode: 404, statusMessage: 'Recompensa no encontrada.' })
  }

  const body = await readBody(event)

  const camposActualizar: Record<string, any> = {
    actualizadoEn: new Date(),
  }

  // Si se envió alternar estatus
  if (typeof body.activo === 'boolean') {
    camposActualizar.activo = body.activo
  }

  if (typeof body.nombre === 'string' && body.nombre.trim().length >= 3) {
    camposActualizar.nombre = body.nombre.trim()
  }

  if (body.descripcion !== undefined) {
    camposActualizar.descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : null
  }

  if (body.fotoUrl !== undefined) {
    camposActualizar.fotoUrl = typeof body.fotoUrl === 'string' && body.fotoUrl.trim() ? body.fotoUrl.trim() : null
  }

  if (body.puntosRequeridos !== undefined) {
    const pts = Number(body.puntosRequeridos)
    if (!isNaN(pts) && pts > 0) {
      camposActualizar.puntosRequeridos = pts
    }
  }

  if (body.nivelMinimo && ['Bronce', 'Plata', 'Oro'].includes(body.nivelMinimo)) {
    camposActualizar.nivelMinimo = body.nivelMinimo
  }

  if (body.stock !== undefined) {
    if (body.stock === null || body.stock === '') {
      camposActualizar.stock = null
    } else {
      const stockNum = Number(body.stock)
      if (!isNaN(stockNum) && stockNum >= 0) {
        camposActualizar.stock = stockNum
      }
    }
  }

  if (body.limitePorCliente !== undefined) {
    camposActualizar.limitePorCliente = body.limitePorCliente ? Number(body.limitePorCliente) : null
  }

  if (body.vigenciaDias !== undefined) {
    camposActualizar.vigenciaDias = body.vigenciaDias ? Number(body.vigenciaDias) : null
  }

  if (body.compraMinimaMxn !== undefined) {
    camposActualizar.compraMinimaMxn = body.compraMinimaMxn ? Number(body.compraMinimaMxn).toFixed(2) : null
  }

  if (body.descuentoValor !== undefined && existente.tipo === 'descuento') {
    const dVal = Number(body.descuentoValor)
    if (!isNaN(dVal) && dVal > 0) {
      camposActualizar.descuentoValor = dVal.toFixed(2)
    }
  }

  const [actualizada] = await db
    .update(recompensas)
    .set(camposActualizar)
    .where(eq(recompensas.id, recompensaId))
    .returning()

  return {
    exito: true,
    mensaje: `Recompensa "${actualizada.nombre}" actualizada correctamente.`,
    recompensa: actualizada,
  }
})
