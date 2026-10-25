// ==============================================================================
// Middleware de Frontend Nuxt · Protección de Rutas (auth.ts)
// Redirige al login si el usuario intenta acceder a una ruta protegida
// ==============================================================================

import { useAuth } from "~/composables/useAuth"

export default defineNuxtRouteMiddleware(async (to) => {
  // Las rutas públicas como /login no requieren autenticación
  if (to.path === '/login') {
    return
  }

  const { usuarioActual, obtenerPerfil } = useAuth()

  // Si no se ha cargado el perfil en memoria, intentar consultarlo
  if (!usuarioActual.value) {
    await obtenerPerfil()
  }

  // Si después de consultar sigue sin haber sesión, redirigir al login
  if (!usuarioActual.value) {
    return navigateTo('/login')
  }
})
