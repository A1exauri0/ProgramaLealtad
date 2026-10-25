// ==============================================================================
// Endpoint API · Cerrar Sesión del Cliente en el Portal (POST /api/portal/auth/logout)
// ==============================================================================

import { borrarCookiePortal } from '~~/server/utils/jwtPortal'

export default defineEventHandler((event) => {
  borrarCookiePortal(event)
  return {
    ok: true,
    mensaje: 'Sesión cerrada exitosamente.',
  }
})
