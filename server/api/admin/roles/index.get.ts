// ==============================================================================
// Endpoint API: GET /api/admin/roles
// Consulta el catálogo de roles, conteo de usuarios y matriz de permisos
// Protegido por autenticación y permiso 'gestionar_roles_permisos'
// ==============================================================================

// Dependencias de base de datos
import { eq, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { roles, rolesPermisos, usuarios } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'
import { obtenerTodosLosPermisos } from '~~/server/utils/catalogoPermisos'

export default defineEventHandler(async (event) => {
  // 1. Exigir permiso administrativo
  await exigirPermisoBackend(event, 'gestionar_roles_permisos')

  // 2. Consultar roles con conteo de usuarios
  const listaRoles = await db
    .select({
      id: roles.id,
      nombre: roles.nombre,
      descripcion: roles.descripcion,
      esSistema: roles.esSistema,
      creadoEn: roles.creadoEn,
      totalUsuarios: sql<number>`count(distinct ${usuarios.id})::int`,
    })
    .from(roles)
    .leftJoin(usuarios, eq(roles.id, usuarios.rolId))
    .groupBy(roles.id, roles.nombre, roles.descripcion, roles.esSistema, roles.creadoEn)
    .orderBy(roles.id)

  // 3. Consultar todos los permisos asignados
  const todosRolesPermisos = await db
    .select({
      rolId: rolesPermisos.rolId,
      permisoClave: rolesPermisos.permisoClave,
    })
    .from(rolesPermisos)

  // 4. Mapear permisos por rol
  const rolesConPermisos = listaRoles.map((r) => {
    const permisosDelRol = todosRolesPermisos
      .filter((rp) => rp.rolId === r.id)
      .map((rp) => rp.permisoClave)

    return {
      ...r,
      permisos: permisosDelRol,
      totalPermisos: permisosDelRol.length,
    }
  })

  const catalogoPermisos = await obtenerTodosLosPermisos()

  return {
    roles: rolesConPermisos,
    catalogoPermisos,
  }
})
