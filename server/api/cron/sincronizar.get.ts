// ==============================================================================
// Endpoint API: GET /api/cron/sincronizar
// Ejecutado automáticamente por Vercel Cron Jobs (diario a las 02:00 UTC)
// Protegido mediante token de autorización CRON_SECRET
// ==============================================================================

// Servicios y utilidades
import { ejecutarSincronizacionCompleta } from '~~/server/services/sync.service'

export default defineEventHandler(async (event) => {
  // 1. Obtener cabecera de autorización
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET

  // 2. Validar que el secreto esté configurado y coincida con el Bearer token
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No autorizado para ejecutar la tarea programada.',
    })
  }

  try {
    // 3. Ejecutar sincronización de tipo cron
    const resultado = await ejecutarSincronizacionCompleta({
      tipo: 'cron',
    })

    return {
      exito: true,
      mensaje: 'Sincronización cron completada exitosamente.',
      datos: resultado,
    }
  } catch (error: any) {
    console.error('❌ Error en sincronización cron:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error interno en la ejecución del cron.',
    })
  }
})
