// ==============================================================================
// Middleware Nitro Server · Soporte CORS para Endpoints de Fidelización
// Cumple con la Sección 6: Endpoints abiertos a CORS con preflight OPTIONS
// ==============================================================================

// Dependencias de H3 / Nitro
import { defineEventHandler, getRequestURL, setHeaders, sendNoContent } from 'h3'

export default defineEventHandler((event) => {
  const url = getRequestURL(event)

  // Aplicar cabeceras CORS únicamente a las rutas públicas de la API de fidelización
  if (url.pathname.startsWith('/api/fidelizacion')) {
    setHeaders(event, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    })

    // Responder de inmediato al preflight OPTIONS del navegador
    if (event.method === 'OPTIONS') {
      return sendNoContent(event, 204)
    }
  }
})
