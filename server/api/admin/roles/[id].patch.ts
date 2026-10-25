// ==============================================================================
// Endpoint API: PATCH /api/admin/roles/[id]
// Actualiza la matriz de permisos o descripción de un rol
// Protegido por autenticación y permiso 'gestionar_roles_permisos'
// ==============================================================================

import { eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { roles, rolesPermisos } from '~~/database/schema/index'
import { exigirPermisoBackend } from '~~/server/utils/permisos'
import { LISTA_PERMISOS } from '~~/database/seeders/inicial.seeder'

export default defineEventHandler(async (event) => {
  await exigirPermisoBackend(event, 'gestionar_roles_permisos')

  const idParam = getRouterParam(event, 'id')
  const rolId = Number(idParam)
  if (!rolId || isNaN(rolId)) {
    throw createError({ statusCode: 400, statusMessage: 'ID de rol inválido.' })
  }

  const [rolExistente] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, rolId))

  if (!rolExistente) {
    throw createError({ statusCode: 404, statusMessage: 'Rol no encontrado.' })
  }

  const body = await readBody(event)

  // 1. Actualizar descripción si viene en el body
  if (typeof body.descripcion === 'string') {
    await db
      .update(roles)
      .set({
        descripcion: body.descripcion.trim(),
        actualizadoEn: new Date(),
      })
      .where(eq(roles.id, rolId))
  }

  // 2. Actualizar permisos asignados si viene un array de claves
  if (Array.isArray(body.permisos)) {
    const clavesValidas = new Set(LISTA_PERMISOS.map((p) => p.clave))
    const nuevosPermisos = body.permisos.filter((p: string) => clavesValidas.has(p))

    // Si es Administrador, asegurarse de que conserve al menos 'gestionar_roles_permisos'
    if (rolExistente.nombre === 'Administrador' && !nuevosPermisos.includes('gestionar_roles_permisos')) {
      nuevosPermisos.push('gestionar_roles_permisos')
    }

    // Eliminar permisos actuales del rol
    await db.delete(rolesPermisos).where(eq(rolesPermisos.rolId, rolId))

    // Insertar los nuevos permisos
    for (const permisoClave of nuevosPermisos) {
      await db.insert(rolesPermisos).values({
        rolId,
        permisoClave,
      })
    }
  }

  return {
    exito: true,
    mensaje: `Rol ${rolExistente.nombre} actualizado correctamente.`,
  }
})
