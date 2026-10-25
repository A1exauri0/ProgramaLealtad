// ==============================================================================
// Endpoint API · Cambio de Contraseña del Cliente (POST /api/portal/auth/cambiar-password)
// Permite al cliente definir su contraseña permanente tras acceder con clave temporal
// ==============================================================================

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { cuentasPortal } from '~~/database/schema/index'
import { exigirSesionPortal, firmarTokenPortal, fijarCookiePortal } from '~~/server/utils/jwtPortal'

export default defineEventHandler(async (event) => {
  const sesion = await exigirSesionPortal(event)
  const body = await readBody(event)

  const passwordActual = typeof body?.passwordActual === 'string' ? body.passwordActual : ''
  const passwordNuevo = typeof body?.passwordNuevo === 'string' ? body.passwordNuevo : ''
  const confirmarPassword = typeof body?.confirmarPassword === 'string' ? body.confirmarPassword : ''

  if (!passwordActual || !passwordNuevo || !confirmarPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Todos los campos de contraseña son requeridos.',
    })
  }

  if (passwordNuevo.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La nueva contraseña debe tener un mínimo de 6 caracteres.',
    })
  }

  if (passwordNuevo !== confirmarPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La confirmación de la contraseña no coincide.',
    })
  }

  // Obtener cuenta del portal
  const [cuenta] = await db
    .select()
    .from(cuentasPortal)
    .where(eq(cuentasPortal.clienteId, sesion.clienteId))
    .limit(1)

  if (!cuenta || !cuenta.passwordHash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No se encontró la cuenta del portal del cliente.',
    })
  }

  // Verificar la contraseña actual
  const esActualValida = await bcrypt.compare(passwordActual, cuenta.passwordHash)
  if (!esActualValida) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La contraseña actual no es correcta.',
    })
  }

  if (passwordActual === passwordNuevo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La nueva contraseña no puede ser idéntica a la anterior.',
    })
  }

  // Generar nuevo hash bcrypt
  const nuevoHash = await bcrypt.hash(passwordNuevo, 10)

  await db
    .update(cuentasPortal)
    .set({
      passwordHash: nuevoHash,
      requiereCambioPassword: false,
      actualizadoEn: new Date(),
    })
    .where(eq(cuentasPortal.clienteId, sesion.clienteId))

  // Re-firmar token con requiereCambioPassword en false
  const nuevoToken = await firmarTokenPortal({
    ...sesion,
    requiereCambioPassword: false,
  })

  fijarCookiePortal(event, nuevoToken)

  return {
    ok: true,
    mensaje: 'Tu contraseña ha sido actualizada con éxito.',
  }
})
