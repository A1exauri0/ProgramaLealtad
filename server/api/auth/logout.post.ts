// ==============================================================================
// Endpoint API · Cerrar Sesión (POST /api/auth/logout)
// Invalida y elimina la cookie httpOnly de sesión
// ==============================================================================

import { borrarCookieSesion } from '../../utils/jwt'

export default defineEventHandler((event) => {
  borrarCookieSesion(event)

  return {
    exito: true,
    mensaje: 'Sesión cerrada correctamente.',
  }
})
