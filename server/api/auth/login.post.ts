// ==============================================================================
// Endpoint API · Iniciar Sesión (POST /api/auth/login)
// Autentica usuarios internos, verifica hash bcrypt y asigna cookie segura
// ==============================================================================

import {
  buscarUsuarioPorCorreo,
  obtenerUsuarioConRolYPermisos,
  compararContrasenas,
  registrarIntentoFallido,
  restablecerIntentosFallidos,
} from '../../services/auth.service'
import { firmarTokenSesion, fijarCookieSesion } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { correo, password } = body || {}

  // 1. Validar presencia de campos requeridos
  if (!correo || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El correo y la contraseña son obligatorios.',
    })
  }

  // 2. Buscar usuario en base de datos
  const usuario = await buscarUsuarioPorCorreo(correo)
  if (!usuario) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Credenciales inválidas.',
    })
  }

  // 3. Validar si el usuario está activo
  if (!usuario.activo) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Tu cuenta ha sido desactivada. Contacta al Administrador.',
    })
  }

  // 4. Validar si está bloqueado por intentos fallidos
  if (usuario.bloqueadoHasta && new Date(usuario.bloqueadoHasta) > new Date()) {
    const minutosRestantes = Math.ceil(
      (new Date(usuario.bloqueadoHasta).getTime() - Date.now()) / (1000 * 60)
    )
    throw createError({
      statusCode: 429,
      statusMessage: `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${minutosRestantes} minutos.`,
    })
  }

  // 5. Comparar contraseña con hash bcrypt
  const passwordValido = await compararContrasenas(password, usuario.passwordHash)
  if (!passwordValido) {
    await registrarIntentoFallido(usuario.id, usuario.intentosFallidos)
    throw createError({
      statusCode: 401,
      statusMessage: 'Credenciales inválidas.',
    })
  }

  // 6. Restablecer contador de intentos fallidos
  await restablecerIntentosFallidos(usuario.id)

  // 7. Generar Token JWT firmado y guardar en Cookie httpOnly
  const token = await firmarTokenSesion({
    usuarioId: usuario.id,
    correo: usuario.correo,
    nombre: usuario.nombre,
    rolId: usuario.rolId,
    rolNombre: usuario.rolNombre,
    esCliente: false,
  })

  fijarCookieSesion(event, token)

  // 8. Consultar permisos completos para responder al frontend
  const perfilCompleto = await obtenerUsuarioConRolYPermisos(usuario.id)

  return {
    exito: true,
    mensaje: 'Inicio de sesión exitoso',
    usuario: {
      id: perfilCompleto?.id,
      nombre: perfilCompleto?.nombre,
      correo: perfilCompleto?.correo,
      rol: perfilCompleto?.rolNombre,
      permisos: perfilCompleto?.permisos,
    },
  }
})
