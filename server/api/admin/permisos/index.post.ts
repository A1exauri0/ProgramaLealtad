// ==============================================================================
// Endpoint API: POST /api/admin/permisos
// Registro de un nuevo permiso personalizado en el catálogo del sistema
// Protegido por autenticación y permiso 'gestionar_roles_permisos'
// ==============================================================================

import { inArray } from 'drizzle-orm'
import { db, sql } from '~~/database/conexion'
import { roles, rolesPermisos } from '~~/database/schema/index'
import { exigirPermisoBackend } from '~~/server/utils/permisos'
import { asegurarTablaPermisos } from '~~/server/utils/catalogoPermisos'

export default defineEventHandler(async (event) => {
  await exigirPermisoBackend(event, 'gestionar_roles_permisos')
  await asegurarTablaPermisos()

  const body = await readBody(event)

  const clave = typeof body.clave === 'string' ? body.clave.trim().toLowerCase() : ''
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : ''
  const rolesIds: number[] = Array.isArray(body.rolesIds)
    ? body.rolesIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
    : []

  // Validaciones
  if (!clave) {
    throw createError({ statusCode: 400, statusMessage: 'La clave del permiso es obligatoria.' })
  }

  const formatoClaveRegex = /^[a-z0-9_]{3,80}$/
  if (!formatoClaveRegex.test(clave)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La clave debe contener solo letras minúsculas, números y guiones bajos (ej. gestionar_sucursales).',
    })
  }

  if (!descripcion) {
    throw createError({ statusCode: 400, statusMessage: 'La descripción del privilegio es obligatoria.' })
  }

  // Verificar si ya existe
  const [existente] = await sql`
    SELECT clave FROM permisos WHERE clave = ${clave};
  `

  if (existente) {
    throw createError({
      statusCode: 409,
      statusMessage: `Ya existe un permiso con la clave "${clave}".`,
    })
  }

  // Insertar en la tabla permisos
  await sql`
    INSERT INTO permisos (clave, descripcion, es_sistema)
    VALUES (${clave}, ${descripcion}, false);
  `

  // Asignar a roles si se enviaron
  if (rolesIds.length > 0) {
    const rolesValidos = await db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.id, rolesIds))

    for (const r of rolesValidos) {
      await db.insert(rolesPermisos).values({
        rolId: r.id,
        permisoClave: clave,
      })
    }
  }

  return {
    exito: true,
    mensaje: `Permiso "${clave}" creado exitosamente.`,
    permiso: {
      clave,
      descripcion,
      esSistema: false,
    },
  }
})
