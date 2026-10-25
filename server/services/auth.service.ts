// ==============================================================================
// Servicio de Autenticación · Consultas a Base de Datos (auth.service.ts)
// Separa las consultas SQL/Drizzle de los endpoints de la API (Patrón Repository)
// ==============================================================================

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { usuarios, roles, rolesPermisos } from '~~/database/schema/index'

/**
 * Busca un usuario interno por su correo electrónico incluyendo los datos de su rol
 */
export async function buscarUsuarioPorCorreo(correo: string) {
  const [resultado] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      correo: usuarios.correo,
      passwordHash: usuarios.passwordHash,
      activo: usuarios.activo,
      intentosFallidos: usuarios.intentosFallidos,
      bloqueadoHasta: usuarios.bloqueadoHasta,
      rolId: usuarios.rolId,
      rolNombre: roles.nombre,
    })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolId, roles.id))
    .where(eq(usuarios.correo, correo.toLowerCase().trim()))

  return resultado || null
}

/**
 * Obtiene el perfil completo de un usuario con la lista de claves de sus permisos
 */
export async function obtenerUsuarioConRolYPermisos(usuarioId: number) {
  const [usuario] = await db
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

  if (!usuario) return null

  // Consultar permisos activos del rol
  const permisosFilas = await db
    .select({ clave: rolesPermisos.permisoClave })
    .from(rolesPermisos)
    .where(eq(rolesPermisos.rolId, usuario.rolId))

  return {
    ...usuario,
    permisos: permisosFilas.map((p) => p.clave),
  }
}

/**
 * Compara una contraseña en texto plano contra el hash de bcrypt
 */
export async function compararContrasenas(
  passwordPlano: string,
  passwordHash: string
): Promise<boolean> {
  return await bcrypt.compare(passwordPlano, passwordHash)
}

/**
 * Incrementa el contador de intentos fallidos y bloquea temporalmente si supera 5 intentos
 */
export async function registrarIntentoFallido(usuarioId: number, intentosActuales: number) {
  const nuevosIntentos = intentosActuales + 1
  const bloqueadoHasta =
    nuevosIntentos >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null // Bloqueo de 15 minutos

  await db
    .update(usuarios)
    .set({
      intentosFallidos: nuevosIntentos,
      bloqueadoHasta,
      actualizadoEn: new Date(),
    })
    .where(eq(usuarios.id, usuarioId))
}

/**
 * Restablece los intentos fallidos tras un login exitoso
 */
export async function restablecerIntentosFallidos(usuarioId: number) {
  await db
    .update(usuarios)
    .set({
      intentosFallidos: 0,
      bloqueadoHasta: null,
      actualizadoEn: new Date(),
    })
    .where(eq(usuarios.id, usuarioId))
}
