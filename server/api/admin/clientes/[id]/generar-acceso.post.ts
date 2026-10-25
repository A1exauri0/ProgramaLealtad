// ==============================================================================
// Endpoint API: POST /api/admin/clientes/[id]/generar-acceso
// Genera o restablece una contraseña temporal de un solo uso para el portal
// Protegido por autenticación y permiso 'generar_acceso_portal_cliente'
// ==============================================================================

import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { clientes, cuentasPortal } from '~~/database/schema/index'
import { exigirPermisoBackend } from '~~/server/utils/permisos'

/**
 * Genera una contraseña temporal aleatoria de 10 caracteres segura
 */
function generarPasswordTemporal(): string {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
  let resultado = 'Leal-'
  const bytes = crypto.randomBytes(6)
  for (let i = 0; i < 6; i++) {
    resultado += caracteres[bytes[i] % caracteres.length]
  }
  return resultado
}

export default defineEventHandler(async (event) => {
  // 1. Exigir permiso
  await exigirPermisoBackend(event, 'generar_acceso_portal_cliente')

  const idParam = getRouterParam(event, 'id')
  const clienteId = Number(idParam)
  if (!clienteId || isNaN(clienteId)) {
    throw createError({ statusCode: 400, statusMessage: 'ID de cliente inválido.' })
  }

  // 2. Verificar existencia del cliente
  const [cliente] = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
    })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1)

  if (!cliente) {
    throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado.' })
  }

  if (!cliente.correo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El cliente no tiene un correo electrónico registrado para acceder al portal.',
    })
  }

  // 3. Generar contraseña temporal y su hash
  const passwordTemporal = generarPasswordTemporal()
  const passwordHash = await bcrypt.hash(passwordTemporal, 10)

  // 4. Actualizar o insertar en cuentas_portal
  const [cuentaExistente] = await db
    .select({ clienteId: cuentasPortal.clienteId })
    .from(cuentasPortal)
    .where(eq(cuentasPortal.clienteId, clienteId))

  if (cuentaExistente) {
    await db
      .update(cuentasPortal)
      .set({
        passwordHash,
        estadoAcceso: 'activo',
        requiereCambioPassword: true,
        intentosFallidos: 0,
        bloqueadoHasta: null,
        actualizadoEn: new Date(),
      })
      .where(eq(cuentasPortal.clienteId, clienteId))
  } else {
    await db.insert(cuentasPortal).values({
      clienteId,
      passwordHash,
      estadoAcceso: 'activo',
      requiereCambioPassword: true,
      intentosFallidos: 0,
    })
  }

  return {
    ok: true,
    mensaje: `Contraseña temporal generada para ${cliente.nombre}.`,
    datos: {
      clienteId: cliente.id,
      nombre: cliente.nombre,
      correo: cliente.correo,
      passwordTemporal,
      estadoAcceso: 'activo',
      urlPortal: '/portal/login',
    },
  }
})
