// ==============================================================================
// Endpoint API: POST /api/admin/usuarios
// Crea un nuevo usuario interno en el sistema con contraseña cifrada en bcrypt
// Protegido por autenticación y permiso 'gestionar_usuarios'
// ==============================================================================

// Cifrado y base de datos
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { usuarios, roles } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  // 1. Validar permiso administrativo
  await exigirPermisoBackend(event, 'gestionar_usuarios')

  // 2. Leer y validar cuerpo de la petición
  const body = await readBody(event)
  const nombre = body?.nombre?.trim()
  const correo = body?.correo?.trim().toLowerCase()
  const password = body?.password?.trim()
  const rolId = Number(body?.rolId)

  if (!nombre || !correo || !password || !rolId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Todos los campos son obligatorios (nombre, correo, contraseña y rol).',
    })
  }

  if (password.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La contraseña debe tener al menos 6 caracteres.',
    })
  }

  // 3. Verificar que el rol exista
  const [rolExiste] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.id, rolId))
    .limit(1)

  if (!rolExiste) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El rol seleccionado no es válido.',
    })
  }

  // 4. Verificar que el correo no esté registrado
  const [correoOcupado] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.correo, correo))
    .limit(1)

  if (correoOcupado) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ya existe un usuario registrado con ese correo electrónico.',
    })
  }

  // 5. Cifrar contraseña con bcrypt
  const passwordHash = await bcrypt.hash(password, 10)

  // 6. Insertar nuevo usuario
  const [nuevoUsuario] = await db
    .insert(usuarios)
    .values({
      nombre,
      correo,
      passwordHash,
      rolId,
      activo: true,
    })
    .returning({
      id: usuarios.id,
      nombre: usuarios.nombre,
      correo: usuarios.correo,
      activo: usuarios.activo,
      rolId: usuarios.rolId,
      creadoEn: usuarios.creadoEn,
    })

  return {
    exito: true,
    mensaje: 'Usuario creado exitosamente.',
    usuario: nuevoUsuario,
  }
})
