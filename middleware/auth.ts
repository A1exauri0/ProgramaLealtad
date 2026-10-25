// ==============================================================================
// Middleware de Frontend Nuxt · Protección de Rutas (auth.ts)
// Redirige al login si el usuario intenta acceder a una ruta protegida
// ==============================================================================

// Composables
import { useAuth } from '~/composables/useAuth'

// Mapeo centralizado de rutas protegidas y sus permisos requeridos
const PERMISOS_POR_RUTA: Record<string, string> = {
  '/admin/roles': 'gestionar_roles_permisos',
  '/admin/permisos': 'gestionar_roles_permisos',
  '/admin/usuarios': 'gestionar_usuarios',
  '/admin/clientes': 'buscar_cliente_detalle',
  '/admin/riesgo': 'ver_listas_riesgo_cumpleanos',
  '/admin/cumpleanios': 'ver_listas_riesgo_cumpleanos',
  '/admin/recompensas': 'gestionar_catalogo_recompensas',
  '/admin/canjes': 'gestionar_canjes',
}

export default defineNuxtRouteMiddleware(async (to) => {
  // Las rutas públicas como /login no requieren autenticación
  if (to.path === '/login') {
    return
  }

  const { usuario, obtenerPerfil, tienePermiso } = useAuth()

  // Si no se ha cargado el perfil en memoria, intentar consultarlo
  if (!usuario.value) {
    await obtenerPerfil()
  }

  // Si después de consultar sigue sin haber sesión, redirigir al login
  if (!usuario.value) {
    return navigateTo('/login')
  }

  // Comprobar si la ruta exige un permiso específico (por meta o por mapeo de ruta)
  const permisoMeta = to.meta.permiso as string | undefined
  if (permisoMeta && !tienePermiso(permisoMeta)) {
    return navigateTo('/')
  }

  for (const [rutaBase, permisoRequerido] of Object.entries(PERMISOS_POR_RUTA)) {
    if (to.path === rutaBase || to.path.startsWith(`${rutaBase}/`)) {
      if (!tienePermiso(permisoRequerido)) {
        return navigateTo('/')
      }
      break
    }
  }
})
