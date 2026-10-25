// ==============================================================================
// Endpoint API: GET /api/admin/permisos
// Catálogo completo de permisos (sistema y personalizados) con asignación por rol
// Protegido por autenticación y permiso 'gestionar_roles_permisos'
// ==============================================================================

import { db } from '~~/database/conexion'
import { roles, rolesPermisos } from '~~/database/schema/index'
import { exigirPermisoBackend } from '~~/server/utils/permisos'
import { obtenerTodosLosPermisos } from '~~/server/utils/catalogoPermisos'

export default defineEventHandler(async (event) => {
  await exigirPermisoBackend(event, 'gestionar_roles_permisos')

  // 1. Obtener catálogo dinámico desde base de datos
  const catalogoPermisos = await obtenerTodosLosPermisos()

  // 2. Consultar todos los roles
  const listaRoles = await db
    .select({
      id: roles.id,
      nombre: roles.nombre,
      esSistema: roles.esSistema,
    })
    .from(roles)
    .orderBy(roles.id)

  // 3. Consultar asignaciones de permisos a roles
  const asignaciones = await db
    .select({
      rolId: rolesPermisos.rolId,
      permisoClave: rolesPermisos.permisoClave,
    })
    .from(rolesPermisos)

  // 4. Mapear cada permiso con sus roles asignados
  const permisosConRoles = catalogoPermisos.map((p) => {
    const rolesConEstePermiso = asignaciones
      .filter((a) => a.permisoClave === p.clave)
      .map((a) => {
        const rolEncontrado = listaRoles.find((r) => r.id === a.rolId)
        return {
          id: a.rolId,
          nombre: rolEncontrado?.nombre || `Rol #${a.rolId}`,
          esSistema: rolEncontrado?.esSistema || false,
        }
      })

    return {
      clave: p.clave,
      descripcion: p.descripcion,
      esSistema: p.esSistema,
      creadoEn: p.creadoEn,
      roles: rolesConEstePermiso,
      totalRoles: rolesConEstePermiso.length,
    }
  })

  return {
    permisos: permisosConRoles,
    total: permisosConRoles.length,
    rolesDisponibles: listaRoles,
  }
})
