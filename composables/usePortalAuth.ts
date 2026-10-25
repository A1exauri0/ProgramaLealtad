// ==============================================================================
// Composable Frontend · Autenticación del Portal de Clientes (usePortalAuth.ts)
// ==============================================================================

export interface ClientePortal {
  id: number
  nombre: string
  correo: string | null
  telefono: string | null
  nivel: string
  puntosDisponibles: number
  puntosHistoricos: number
  gasto12m?: string | null
  requiereCambioPassword?: boolean
}

export const usePortalAuth = () => {
  // Estado reactivo compartido en el cliente
  const clientePortal = useState<ClientePortal | null>('portal-cliente-sesion', () => null)
  const cargandoPortal = useState<boolean>('portal-cargando', () => false)

  /**
   * Consulta el perfil del cliente logueado desde la sesión HTTP
   */
  async function obtenerPerfilPortal(): Promise<ClientePortal | null> {
    try {
      cargandoPortal.value = true
      const fetchConCookies = useRequestFetch()
      const respuesta = await fetchConCookies<{ ok: boolean, cliente: ClientePortal }>('/api/portal/auth/perfil')
      clientePortal.value = respuesta.cliente
      return respuesta.cliente
    } catch {
      clientePortal.value = null
      return null
    } finally {
      cargandoPortal.value = false
    }
  }

  /**
   * Inicia sesión en el portal
   */
  async function iniciarSesionPortal(correo: string, password: string) {
    const respuesta = await $fetch<{
      ok: boolean
      mensaje: string
      requiereCambioPassword: boolean
      cliente: ClientePortal
    }>('/api/portal/auth/login', {
      method: 'POST',
      body: { correo, password },
    })

    clientePortal.value = respuesta.cliente
    return respuesta
  }

  /**
   * Cierra sesión del portal y redirige a login
   */
  async function cerrarSesionPortal() {
    try {
      await $fetch('/api/portal/auth/logout', { method: 'POST' })
    } finally {
      clientePortal.value = null
      await navigateTo('/portal/login')
    }
  }

  /**
   * Cambia la contraseña del cliente
   */
  async function cambiarPasswordPortal(datos: {
    passwordActual: string
    passwordNuevo: string
    confirmarPassword: string
  }) {
    const res = await $fetch<{ ok: boolean, mensaje: string }>('/api/portal/auth/cambiar-password', {
      method: 'POST',
      body: datos,
    })

    if (clientePortal.value) {
      clientePortal.value.requiereCambioPassword = false
    }

    return res
  }

  return {
    clientePortal,
    cargandoPortal,
    obtenerPerfilPortal,
    iniciarSesionPortal,
    cerrarSesionPortal,
    cambiarPasswordPortal,
  }
}
