// ==============================================================================
// Composable Vue 3 · useAuth (Manejo de Sesión en el Frontend)
// Gestiona el estado reactivo del usuario, login, logout y permisos
// ==============================================================================

interface UsuarioSesion {
  id: number
  nombre: string
  correo: string
  rolId?: number
  rol: string
  permisos: string[]
}

export const useAuth = () => {
  // Estado global compartido de la sesión en Nuxt
  const usuarioActual = useState<UsuarioSesion | null>('usuario_actual', () => null)
  const cargando = useState<boolean>('auth_cargando', () => false)
  const errorMensaje = useState<string | null>('auth_error', () => null)

  const estaAutenticado = computed(() => !!usuarioActual.value)

  /**
   * Consulta el perfil del usuario actual llamando al endpoint /api/auth/perfil
   * Usa useRequestFetch para propagar las cookies tanto en SSR como en cliente
   */
  const obtenerPerfil = async () => {
    try {
      cargando.value = true
      errorMensaje.value = null
      const fetchConCookies = useRequestFetch()
      const data = await fetchConCookies<{ exito: boolean; usuario: UsuarioSesion }>('/api/auth/perfil')
      if (data?.usuario) {
        usuarioActual.value = data.usuario
      }
    } catch {
      usuarioActual.value = null
    } finally {
      cargando.value = false
    }
  }

  /**
   * Realiza el inicio de sesión contra /api/auth/login
   */
  const iniciarSesion = async (correo: string, password: string) => {
    try {
      cargando.value = true
      errorMensaje.value = null

      const data = await $fetch<{ exito: boolean; usuario: UsuarioSesion }>('/api/auth/login', {
        method: 'POST',
        body: { correo, password },
      })

      if (data?.usuario) {
        usuarioActual.value = data.usuario
        return { exito: true }
      }
      return { exito: false, mensaje: 'Respuesta inesperada del servidor' }
    } catch (err: any) {
      const mensaje =
        err?.data?.statusMessage || err?.message || 'Error al iniciar sesión'
      errorMensaje.value = mensaje
      return { exito: false, mensaje }
    } finally {
      cargando.value = false
    }
  }

  /**
   * Cierra la sesión activa llamando a /api/auth/logout y limpia el estado
   */
  const cerrarSesion = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      usuarioActual.value = null
      await navigateTo('/login')
    }
  }

  /**
   * Verifica si el usuario actual posee un permiso específico en su rol
   */
  const tienePermiso = (clavePermiso: string): boolean => {
    if (!usuarioActual.value?.permisos) return false
    return usuarioActual.value.permisos.includes(clavePermiso)
  }

  return {
    usuario: usuarioActual,
    usuarioActual,
    estaAutenticado,
    cargando,
    errorMensaje,
    obtenerPerfil,
    iniciarSesion,
    cerrarSesion,
    logout: cerrarSesion,
    tienePermiso,
  }
}
