// ==============================================================================
// Endpoint API: DELETE /api/admin/roles/[id]
// Elimina un rol personalizado siempre que no sea de sistema ni tenga usuarios
// Protegido por autenticación y permiso 'gestionar_roles_permisos'
// ==============================================================================

// Dependencias de base de datos
import { eq, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { roles, usuarios } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  // 1. Exigir permiso administrativo
  await exigirPermisoBackend(event, 'gestionar_roles_permisos')

  const idParam = getRouterParam(event, 'id')
  const rolId = Number(idParam)
  if (!rolId || isNaN(rolId)) {
    throw createError({ statusCode: 400, statusMessage: 'ID de rol inválido.' })
  }

  // 2. Verificar existencia del rol
  const [rolExistente] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, rolId))

  if (!rolExistente) {
    throw createError({ statusCode: 404, statusMessage: 'El rol no existe.' })
  }

  // 3. Impedir eliminación de roles protegidos del sistema
  if (rolExistente.esSistema || rolExistente.nombre === 'Administrador') {
    throw createError({
      statusCode: 403,
      statusMessage: `El rol "${rolExistente.nombre}" es un rol base del sistema y no puede ser eliminado.`,
    })
  }

  // 4. Verificar si tiene usuarios asignados
  const [conteoUsuarios] = await db
    .select({ total: sql<number>`count(${usuarios.id})::int` })
    .from(usuarios)
    .where(eq(usuarios.rolId, rolId))

  if (conteoUsuarios && conteoUsuarios.total > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `No se puede eliminar el rol "${rolExistente.nombre}" porque tiene ${conteoUsuarios.total} usuario(s) asignado(s). Reasigna los usuarios primero.`,
    })
  }

  // 5. Eliminar el rol (las asociaciones en roles_permisos se eliminan en cascada)
  await db.delete(roles).where(eq(roles.id, rolId))

  return {
    exito: true,
    mensaje: `El rol "${rolExistente.nombre}" ha sido eliminado exitosamente.`,
  }
})
