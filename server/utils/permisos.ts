// ==============================================================================
// Utilidad Nuxt Server · Validación de Permisos y Protección Backend (HTTP 403)
// Cumple el requisito estricto: validar permisos en servidor en cada endpoint
// ==============================================================================

import type { H3Event } from 'h3'
import { obtenerSesionActual } from './jwt'
import { obtenerUsuarioConRolYPermisos } from '../services/auth.service'

/**
 * Exige que la petición tenga una sesión válida y activa. Lanza HTTP 401 si no la tiene.
 */
export async function exigirUsuarioAutenticado(event: H3Event) {
  const sesion = await obtenerSesionActual(event)
  if (!sesion) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No autenticado. Por favor inicia sesión.',
    })
  }

  const usuario = await obtenerUsuarioConRolYPermisos(sesion.usuarioId)
  if (!usuario || !usuario.activo) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Tu cuenta ha sido desactivada o no existe.',
    })
  }

  return usuario
}

/**
 * Exige que el usuario autenticado cuente con un permiso específico en su rol.
 * Si no lo tiene, responde inmediatamente con HTTP 403 Forbidden.
 */
export async function exigirPermisoBackend(event: H3Event, permisoRequerido: string) {
  const usuario = await exigirUsuarioAutenticado(event)

  const tienePermiso = usuario.permisos.includes(permisoRequerido)

  if (!tienePermiso) {
    throw createError({
      statusCode: 403,
      statusMessage: `Acceso denegado: Se requiere el permiso [${permisoRequerido}].`,
    })
  }

  return usuario
}
