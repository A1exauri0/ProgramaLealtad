// ==============================================================================
// Endpoint API · Iniciar Sesión Portal de Clientes (POST /api/portal/auth/login)
// Autentica clientes contra cuentas_portal, valida intentos y emite cookie de portal
// ==============================================================================

import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { clientes, cuentasPortal } from '~~/database/schema/index'
import { firmarTokenPortal, fijarCookiePortal } from '~~/server/utils/jwtPortal'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const correo = typeof body?.correo === 'string' ? body.correo.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!correo || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El correo electrónico y la contraseña son obligatorios.',
    })
  }

  // 1. Buscar al cliente por correo electrónico
  const [cliente] = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
      nivel: clientes.nivel,
      puntosDisponibles: clientes.puntosDisponibles,
      puntos: clientes.puntos,
    })
    .from(clientes)
    .where(eq(sql`LOWER(${clientes.correo})`, correo))
    .limit(1)

  if (!cliente) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Credenciales inválidas. Verifica tu correo y contraseña.',
    })
  }

  // 2. Buscar la cuenta del portal asociada al cliente
  const [cuenta] = await db
    .select()
    .from(cuentasPortal)
    .where(eq(cuentasPortal.clienteId, cliente.id))
    .limit(1)

  if (!cuenta || cuenta.estadoAcceso !== 'activo' || !cuenta.passwordHash) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Tu acceso al portal aún no está activo. Solicita tu clave temporal al personal de la tienda.',
    })
  }

  // 3. Validar si la cuenta está bloqueada temporalmente por intentos fallidos
  if (cuenta.bloqueadoHasta && new Date(cuenta.bloqueadoHasta) > new Date()) {
    const minutosRestantes = Math.ceil(
      (new Date(cuenta.bloqueadoHasta).getTime() - Date.now()) / (1000 * 60)
    )
    throw createError({
      statusCode: 429,
      statusMessage: `Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta nuevamente en ${minutosRestantes} minutos.`,
    })
  }

  // 4. Comparar contraseña con bcrypt
  const esValida = await bcrypt.compare(password, cuenta.passwordHash)

  if (!esValida) {
    const nuevosIntentos = (cuenta.intentosFallidos || 0) + 1
    const bloqueo = nuevosIntentos >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null

    await db
      .update(cuentasPortal)
      .set({
        intentosFallidos: nuevosIntentos,
        bloqueadoHasta: bloqueo,
        actualizadoEn: new Date(),
      })
      .where(eq(cuentasPortal.clienteId, cliente.id))

    if (nuevosIntentos >= 5) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Has superado el límite de 5 intentos. Tu cuenta ha sido bloqueada temporalmente por 15 minutos.',
      })
    }

    const restantes = 5 - nuevosIntentos
    throw createError({
      statusCode: 401,
      statusMessage: `Contraseña incorrecta. Te quedan ${restantes} ${restantes === 1 ? 'intento' : 'intentos'}.`,
    })
  }

  // 5. Contraseña correcta: restablecer intentos y registrar acceso
  await db
    .update(cuentasPortal)
    .set({
      intentosFallidos: 0,
      bloqueadoHasta: null,
      ultimoAccesoEn: new Date(),
      actualizadoEn: new Date(),
    })
    .where(eq(cuentasPortal.clienteId, cliente.id))

  // 6. Firmar token JWT y emitir cookie segura
  const token = await firmarTokenPortal({
    clienteId: cliente.id,
    correo: cliente.correo || correo,
    nombre: cliente.nombre,
    nivel: cliente.nivel,
    requiereCambioPassword: Boolean(cuenta.requiereCambioPassword),
  })

  fijarCookiePortal(event, token)

  return {
    ok: true,
    mensaje: 'Inicio de sesión exitoso.',
    requiereCambioPassword: Boolean(cuenta.requiereCambioPassword),
    cliente: {
      id: cliente.id,
      nombre: cliente.nombre,
      correo: cliente.correo,
      nivel: cliente.nivel,
      puntosDisponibles: cliente.puntosDisponibles,
      puntosHistoricos: cliente.puntos,
    },
  }
})
