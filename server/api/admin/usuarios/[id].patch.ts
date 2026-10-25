// ==============================================================================
// Endpoint API: PATCH /api/admin/usuarios/{id}
// Actualiza nombre, correo, rol o estado activo/inactivo de un usuario interno
// Protege contra la desactivación o degradación del último Administrador activo
// ==============================================================================

// Dependencias de base de datos
import { and, eq, ne, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { usuarios, roles } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  // 1. Validar permiso administrativo en backend
  const usuarioSesion = await exigirPermisoBackend(event, 'gestionar_usuarios')

  // 2. Extraer ID del usuario a modificar
  const idParam = getRouterParam(event, 'id')
  const usuarioId = Number(idParam)

  if (!usuarioId || isNaN(usuarioId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de usuario inválido.',
    })
  }

  // 3. Buscar usuario objetivo actual con su rol
  const [usuarioObjetivo] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      correo: usuarios.correo,
      activo: usuarios.activo,
      rolId: usuarios.rolId,
      rolNombre: roles.nombre,
    })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolId, roles.id))
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  if (!usuarioObjetivo) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Usuario no encontrado.',
    })
  }

  const body = await readBody(event)

  // REGLA 1: No permitir desactivarse a sí mismo
  if (body?.activo === false && usuarioId === usuarioSesion.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No puedes desactivar tu propia cuenta de usuario.',
    })
  }

  // REGLA 2: No se puede desactivar ni quitar el rol al último Administrador activo
  const nuevoRolId = body?.rolId !== undefined ? Number(body.rolId) : usuarioObjetivo.rolId
  const nuevoActivo = typeof body?.activo === 'boolean' ? body.activo : usuarioObjetivo.activo

  const eraAdminActivo =
    usuarioObjetivo.rolNombre.toLowerCase() === 'administrador' && usuarioObjetivo.activo
  const dejaDeSerAdminActivo = !nuevoActivo || nuevoRolId !== usuarioObjetivo.rolId

  if (eraAdminActivo && dejaDeSerAdminActivo) {
    const [conteoAdmins] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(usuarios)
      .innerJoin(roles, eq(usuarios.rolId, roles.id))
      .where(and(eq(roles.nombre, 'Administrador'), eq(usuarios.activo, true)))

    if ((conteoAdmins?.total || 0) <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No se puede desactivar ni cambiar el rol al último administrador activo.',
      })
    }
  }

  // 4. Preparar y validar campos a actualizar
  const camposActualizar: Record<string, any> = {
    actualizadoEn: new Date(),
  }

  if (typeof body?.nombre === 'string' && body.nombre.trim().length >= 2) {
    camposActualizar.nombre = body.nombre.trim()
  }

  if (typeof body?.correo === 'string' && body.correo.trim().includes('@')) {
    const correoLimpio = body.correo.trim().toLowerCase()
    const [correoDuplicado] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(eq(usuarios.correo, correoLimpio), ne(usuarios.id, usuarioId)))
      .limit(1)

    if (correoDuplicado) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Ese correo electrónico ya pertenece a otro usuario.',
      })
    }
    camposActualizar.correo = correoLimpio
  }

  if (typeof body?.activo === 'boolean') {
    camposActualizar.activo = body.activo
  }

  if (body?.rolId && !isNaN(Number(body.rolId))) {
    const [rolValido] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, Number(body.rolId)))
      .limit(1)

    if (!rolValido) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El rol seleccionado no existe.',
      })
    }
    camposActualizar.rolId = Number(body.rolId)
  }

  // 5. Actualizar usuario
  const [usuarioActualizado] = await db
    .update(usuarios)
    .set(camposActualizar)
    .where(eq(usuarios.id, usuarioId))
    .returning({
      id: usuarios.id,
      nombre: usuarios.nombre,
      correo: usuarios.correo,
      activo: usuarios.activo,
      rolId: usuarios.rolId,
    })

  return {
    exito: true,
    mensaje: 'Usuario actualizado correctamente.',
    usuario: usuarioActualizado,
  }
})
