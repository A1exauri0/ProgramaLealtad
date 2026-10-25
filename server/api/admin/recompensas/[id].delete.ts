// ==============================================================================
// Endpoint API: DELETE /api/admin/recompensas/[id]
// Elimina una recompensa o la desactiva si ya cuenta con historial de canjes
// Protegido por autenticación y permiso 'gestionar_catalogo_recompensas'
// ==============================================================================

// Dependencias de base de datos
import { eq, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { recompensas, canjes } from '~~/database/schema/index'

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

  // Verificar si tiene canjes registrados
  const [conteoCanjes] = await db
    .select({ total: sql<number>`count(${canjes.id})::int` })
    .from(canjes)
    .where(eq(canjes.recompensaId, recompensaId))

  const tieneCanjes = conteoCanjes && conteoCanjes.total > 0

  if (tieneCanjes) {
    // Desactivar para preservar el historial del cliente y auditoría
    await db
      .update(recompensas)
      .set({ activo: false, actualizadoEn: new Date() })
      .where(eq(recompensas.id, recompensaId))

    return {
      exito: true,
      desactivada: true,
      mensaje: `La recompensa "${existente.nombre}" tiene ${conteoCanjes.total} canje(s) histórico(s). Se ha desactivado del catálogo para preservar los registros.`,
    }
  }

  // Si no tiene canjes, eliminar físicamente
  await db.delete(recompensas).where(eq(recompensas.id, recompensaId))

  return {
    exito: true,
    desactivada: false,
    mensaje: `La recompensa "${existente.nombre}" ha sido eliminada del catálogo exitosamente.`,
  }
})
