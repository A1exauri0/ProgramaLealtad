// ==============================================================================
// Endpoint API: POST /api/admin/sincronizar
// Ejecuta la sincronización manual de datos desde fakeapi.dev hacia Supabase
// Protegido por autenticación y permiso 'ejecutar_sincronizacion'
// ==============================================================================

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'
import { ejecutarSincronizacionCompleta } from '~~/server/services/sync.service'

export default defineEventHandler(async (event) => {
  // 1. Validar autenticación y permiso administrativo
  const usuarioSesion = await exigirPermisoBackend(event, 'ejecutar_sincronizacion')

  try {
    // 2. Ejecutar la sincronización completa
    const resultado = await ejecutarSincronizacionCompleta({
      tipo: 'manual',
      ejecutadoPorUsuarioId: usuarioSesion.id,
    })

    return {
      exito: true,
      mensaje: 'Sincronización completada exitosamente.',
      datos: resultado,
    }
  } catch (error: any) {
    console.error('❌ Error en sincronización manual:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Error interno durante la sincronización.',
    })
  }
})
