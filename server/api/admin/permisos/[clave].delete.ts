// ==============================================================================
// Endpoint API: DELETE /api/admin/permisos/[clave]
// Elimina un permiso personalizado del catálogo
// Protegido por autenticación y permiso 'gestionar_roles_permisos'
// ==============================================================================

import { eq } from 'drizzle-orm'
import { db, sql } from '~~/database/conexion'
import { rolesPermisos } from '~~/database/schema/index'
import { exigirPermisoBackend } from '~~/server/utils/permisos'
import { asegurarTablaPermisos } from '~~/server/utils/catalogoPermisos'

export default defineEventHandler(async (event) => {
  await exigirPermisoBackend(event, 'gestionar_roles_permisos')
  await asegurarTablaPermisos()

  const claveParam = getRouterParam(event, 'clave')
  if (!claveParam) {
    throw createError({ statusCode: 400, statusMessage: 'Clave de permiso inválida.' })
  }

  const [permisoExistente] = await sql`
    SELECT clave, descripcion, es_sistema as "esSistema"
    FROM permisos
    WHERE clave = ${claveParam};
  `

  if (!permisoExistente) {
    throw createError({ statusCode: 404, statusMessage: 'El permiso no existe.' })
  }

  // Protección de privilegios oficiales de sistema
  if (permisoExistente.esSistema) {
    throw createError({
      statusCode: 403,
      statusMessage: `El permiso "${claveParam}" es un privilegio oficial del sistema y no puede ser eliminado.`,
    })
  }

  // 1. Eliminar de roles_permisos
  await db.delete(rolesPermisos).where(eq(rolesPermisos.permisoClave, claveParam))

  // 2. Eliminar de la tabla permisos
  await sql`
    DELETE FROM permisos WHERE clave = ${claveParam};
  `

  return {
    exito: true,
    mensaje: `El permiso "${claveParam}" ha sido eliminado exitosamente.`,
  }
})
