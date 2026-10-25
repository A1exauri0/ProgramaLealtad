// ==============================================================================
// Endpoint API: POST /api/admin/roles
// Creación de un nuevo rol personalizado con su matriz inicial de privilegios
// Protegido por autenticación y permiso 'gestionar_roles_permisos'
// ==============================================================================

// Dependencias de base de datos
import { eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { roles, rolesPermisos } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'
import { LISTA_PERMISOS } from '~~/database/seeders/inicial.seeder'

export default defineEventHandler(async (event) => {
  // 1. Exigir permiso administrativo
  await exigirPermisoBackend(event, 'gestionar_roles_permisos')

  const body = await readBody(event)

  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : ''
  const listaPermisosBody = Array.isArray(body.permisos) ? body.permisos : []

  if (!nombre) {
    throw createError({ statusCode: 400, statusMessage: 'El nombre del rol es obligatorio.' })
  }

  // 2. Verificar si ya existe un rol con ese nombre
  const [rolExistente] = await db
    .select()
    .from(roles)
    .where(eq(roles.nombre, nombre))

  if (rolExistente) {
    throw createError({
      statusCode: 409,
      statusMessage: `Ya existe un rol con el nombre "${nombre}".`,
    })
  }

  // 3. Crear el rol en la base de datos
  const [nuevoRol] = await db
    .insert(roles)
    .values({
      nombre,
      descripcion,
      esSistema: false,
    })
    .returning()

  // 4. Asignar permisos válidos si se especificaron
  const clavesValidas = new Set(LISTA_PERMISOS.map((p) => p.clave))
  const permisosAInsertar = listaPermisosBody.filter((p: string) => clavesValidas.has(p))

  for (const permisoClave of permisosAInsertar) {
    await db.insert(rolesPermisos).values({
      rolId: nuevoRol.id,
      permisoClave,
    })
  }

  return {
    exito: true,
    mensaje: `Rol "${nuevoRol.nombre}" creado exitosamente.`,
    rol: {
      ...nuevoRol,
      permisos: permisosAInsertar,
      totalPermisos: permisosAInsertar.length,
      totalUsuarios: 0,
    },
  }
})
