// ==============================================================================
// Endpoint API: PATCH /api/admin/permisos/[clave]
// Actualiza la descripción y/o los roles asignados a un permiso
// Protegido por autenticación y permiso 'gestionar_roles_permisos'
// ==============================================================================

import { eq, inArray } from 'drizzle-orm'
import { db, sql } from '~~/database/conexion'
import { roles, rolesPermisos } from '~~/database/schema/index'
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
    throw createError({ statusCode: 404, statusMessage: 'El privilegio especificado no existe.' })
  }

  const body = await readBody(event)

  // 1. Actualizar descripción si se envió
  if (typeof body.descripcion === 'string' && body.descripcion.trim().length > 0) {
    await sql`
      UPDATE permisos
      SET descripcion = ${body.descripcion.trim()}, actualizado_en = NOW()
      WHERE clave = ${claveParam};
    `
  }

  // 2. Actualizar asignación de roles si se envió 'rolesIds'
  if (Array.isArray(body.rolesIds)) {
    const rolesIds: number[] = body.rolesIds
      .map((id: any) => Number(id))
      .filter((id: number) => !isNaN(id) && id > 0)

    // Si el permiso es 'gestionar_roles_permisos', asegurar que Administrador siempre lo mantenga
    if (claveParam === 'gestionar_roles_permisos') {
      const [rolAdmin] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.nombre, 'Administrador'))

      if (rolAdmin && !rolesIds.includes(rolAdmin.id)) {
        rolesIds.push(rolAdmin.id)
      }
    }

    // Eliminar asignaciones actuales
    await db.delete(rolesPermisos).where(eq(rolesPermisos.permisoClave, claveParam))

    // Insertar nuevas asignaciones
    if (rolesIds.length > 0) {
      const rolesExistentes = await db
        .select({ id: roles.id })
        .from(roles)
        .where(inArray(roles.id, rolesIds))

      for (const r of rolesExistentes) {
        await db.insert(rolesPermisos).values({
          rolId: r.id,
          permisoClave: claveParam,
        })
      }
    }
  }

  return {
    exito: true,
    mensaje: `Permiso "${claveParam}" actualizado correctamente.`,
  }
})
