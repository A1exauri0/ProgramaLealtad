// ==============================================================================
// Endpoint API: GET /api/admin/usuarios
// Listado de usuarios internos y catálogo de roles
// Protegido por autenticación y permiso 'gestionar_usuarios'
// ==============================================================================

// Dependencias de base de datos
import { eq, desc } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { usuarios, roles } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  // 1. Exigir permiso administrativo
  await exigirPermisoBackend(event, 'gestionar_usuarios')

  // 2. Listado de usuarios con su rol
  const listaUsuarios = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      correo: usuarios.correo,
      activo: usuarios.activo,
      rolId: usuarios.rolId,
      rolNombre: roles.nombre,
      creadoEn: usuarios.creadoEn,
      actualizadoEn: usuarios.actualizadoEn,
    })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolId, roles.id))
    .orderBy(desc(usuarios.id))

  // 3. Catálogo de roles disponibles
  const listaRoles = await db
    .select({
      id: roles.id,
      nombre: roles.nombre,
      descripcion: roles.descripcion,
    })
    .from(roles)

  return {
    usuarios: listaUsuarios,
    roles: listaRoles,
  }
})
