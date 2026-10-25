// ==============================================================================
// Middleware de Frontend Nuxt · Protección del Portal de Clientes (portal-auth.ts)
// ==============================================================================

import { usePortalAuth } from '~/composables/usePortalAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  const { clientePortal, obtenerPerfilPortal } = usePortalAuth()

  // Si no tenemos los datos del cliente en memoria, consultar sesión
  if (!clientePortal.value) {
    await obtenerPerfilPortal()
  }

  const estaLogueado = Boolean(clientePortal.value)

  // Si está en la página de login
  if (to.path === '/portal/login') {
    if (estaLogueado) {
      if (clientePortal.value?.requiereCambioPassword) {
        return navigateTo('/portal/cambiar-password')
      }
      return navigateTo('/portal')
    }
    return
  }

  // Si no está logueado y quiere acceder a cualquier ruta del portal
  if (!estaLogueado) {
    return navigateTo('/portal/login')
  }

  // Si requiere cambio de contraseña obligatorio
  if (clientePortal.value?.requiereCambioPassword && to.path !== '/portal/cambiar-password') {
    return navigateTo('/portal/cambiar-password')
  }

  // Si ya no requiere cambio de contraseña e intenta entrar a cambiar-password
  if (!clientePortal.value?.requiereCambioPassword && to.path === '/portal/cambiar-password') {
    return navigateTo('/portal')
  }
})
