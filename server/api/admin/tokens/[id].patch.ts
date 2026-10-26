// ==============================================================================
// Endpoint API: PATCH /api/admin/tokens/[id]
// Revoca o reactiva un token de API de evaluación
// Protegido por permiso 'gestionar_tokens_api'
// ==============================================================================

import { eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { tokensApi } from '~~/database/schema/index'
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  await exigirPermisoBackend(event, 'gestionar_tokens_api')

  const idParam = getRouterParam(event, 'id')
  const tokenId = Number(idParam)
  if (!tokenId || isNaN(tokenId)) {
    throw createError({ statusCode: 400, statusMessage: 'ID de token inválido.' })
  }

  const body = await readBody(event)
  const revocado = Boolean(body?.revocado)

  const [actualizado] = await db
    .update(tokensApi)
    .set({ revocado })
    .where(eq(tokensApi.id, tokenId))
    .returning()

  if (!actualizado) {
    throw createError({ statusCode: 404, statusMessage: 'Token no encontrado.' })
  }

  return {
    exito: true,
    mensaje: revocado
      ? `Token "${actualizado.nombre}" revocado inmediatamente.`
      : `Token "${actualizado.nombre}" reactivado.`,
    token: actualizado,
  }
})
