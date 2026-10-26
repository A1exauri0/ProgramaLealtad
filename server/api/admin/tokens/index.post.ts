// ==============================================================================
// Endpoint API: POST /api/admin/tokens
// Genera un nuevo token Bearer de evaluación (mostrado 1 sola vez) y guarda su SHA-256
// Protegido por permiso 'gestionar_tokens_api'
// ==============================================================================

import { exigirPermisoBackend } from '~~/server/utils/permisos'
import { crearNuevoTokenApi } from '~~/server/utils/tokensApi'

export default defineEventHandler(async (event) => {
  const usuario = await exigirPermisoBackend(event, 'gestionar_tokens_api')
  const body = await readBody(event)
  const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : ''

  if (!nombre || nombre.length < 3) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debes indicar un nombre descriptivo para el token (mínimo 3 caracteres).',
    })
  }

  const nuevoToken = await crearNuevoTokenApi(nombre, usuario.id)

  return {
    exito: true,
    mensaje: 'Token de API generado exitosamente. Cópialo ahora; no volverá a mostrarse.',
    token: nuevoToken,
  }
})
