// ==============================================================================
// Servicio Cliente HTTP · fakeapi.dev (fakeapi.service.ts)
// Encapsula las peticiones externas hacia la API pública de la tienda
// ==============================================================================

// URL base y Clave secreta obtenidas de variables de entorno
const urlBase = process.env.FAKEAPI_URL || 'https://fakeapi.dev/api/v1'
const apiKey = process.env.FAKEAPI_KEY || ''

// Interfaz para la respuesta paginada estándar de fakeapi.dev
export interface RespuestaPaginadaFakeApi<T> {
  success: boolean
  data: T[]
  meta: {
    total: number
    page: number
    per_page: number
    total_pages: number
    has_more: boolean
  }
}

/**
 * Función base para realizar peticiones HTTP autenticadas a fakeapi.dev
 */
async function realizarPeticionFakeApi<T>(
  recurso: string,
  pagina = 1,
  porPagina = 100
): Promise<RespuestaPaginadaFakeApi<T>> {
  const url = `${urlBase}/${recurso}?page=${pagina}&per_page=${porPagina}`

  const respuesta = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  })

  // Manejo de Rate Limit (HTTP 429)
  if (respuesta.status === 429) {
    const resetTime = respuesta.headers.get('X-RateLimit-Reset')
    throw new Error(
      `Límite de peticiones excedido en fakeapi.dev (429). Se restablece en: ${resetTime}`
    )
  }

  if (!respuesta.ok) {
    throw new Error(
      `Error al consultar fakeapi.dev [${recurso}]: ${respuesta.status} ${respuesta.statusText}`
    )
  }

  return (await respuesta.json()) as RespuestaPaginadaFakeApi<T>
}

// ------------------------------------------------------------------------------
// MÉTODOS PÚBLICOS DEL SERVICIO FAKEAPI
// ------------------------------------------------------------------------------

/**
 * Obtiene los clientes registrados en la tienda (/users)
 */
export async function consultarClientesExternos(pagina = 1, porPagina = 100) {
  return await realizarPeticionFakeApi<any>('users', pagina, porPagina)
}

/**
 * Obtiene las órdenes o pedidos realizados (/orders)
 */
export async function consultarPedidosExternos(pagina = 1, porPagina = 100) {
  return await realizarPeticionFakeApi<any>('orders', pagina, porPagina)
}

/**
 * Obtiene los pagos realizados en diferentes divisas (/payments)
 */
export async function consultarPagosExternos(pagina = 1, porPagina = 100) {
  return await realizarPeticionFakeApi<any>('payments', pagina, porPagina)
}

/**
 * Obtiene el catálogo de productos (/products)
 */
export async function consultarProductosExternos(pagina = 1, porPagina = 100) {
  return await realizarPeticionFakeApi<any>('products', pagina, porPagina)
}
