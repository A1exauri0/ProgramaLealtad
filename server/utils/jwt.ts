// ==============================================================================
// Utilidad Nuxt Server · Manejo de Tokens JWT y Cookies de Sesión
// Librería: jose (Criptografía ligera y compatible con Edge / Serverless)
// ==============================================================================

import { SignJWT, jwtVerify } from 'jose'
import type { H3Event } from 'h3'

// Nombre de la cookie de sesión protegida
export const NOMBRE_COOKIE_SESION = 'sesion_lealtad_token'

// Obtención segura de la clave secreta desde variables de entorno
function obtenerClaveSecretaJwt(): Uint8Array {
  const secreto = process.env.SESION_SECRETO
  if (!secreto || secreto.length < 32) {
    throw new Error(
      'La variable de entorno SESION_SECRETO no está configurada o es demasiado corta (mínimo 32 caracteres).'
    )
  }
  return new TextEncoder().encode(secreto)
}

// Estructura de la carga útil del Token JWT
export interface CargaUtilSesion {
  usuarioId: number
  correo: string
  nombre: string
  rolId: number
  rolNombre: string
  esCliente: boolean
}

/**
 * Genera un token JWT firmado con expiración de 8 horas
 */
export async function firmarTokenSesion(carga: CargaUtilSesion): Promise<string> {
  const clave = obtenerClaveSecretaJwt()
  return await new SignJWT({ ...carga })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(clave)
}

/**
 * Valida y decodifica un token JWT de sesión
 */
export async function verificarTokenSesion(
  token: string
): Promise<CargaUtilSesion | null> {
  try {
    const clave = obtenerClaveSecretaJwt()
    const { payload } = await jwtVerify(token, clave)
    return payload as unknown as CargaUtilSesion
  } catch {
    return null
  }
}

/**
 * Guarda la cookie de sesión de forma segura (httpOnly, sameSite, secure en prod)
 */
export function fijarCookieSesion(event: H3Event, token: string): void {
  setCookie(event, NOMBRE_COOKIE_SESION, token, {
    httpOnly: true, // Inaccesible por JavaScript en navegador (previene XSS)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 horas en segundos
    path: '/',
  })
}

/**
 * Obtiene y valida la sesión actual desde la cookie HTTP de la petición
 */
export async function obtenerSesionActual(
  event: H3Event
): Promise<CargaUtilSesion | null> {
  const token = getCookie(event, NOMBRE_COOKIE_SESION)
  if (!token) return null
  return await verificarTokenSesion(token)
}

/**
 * Elimina la cookie de sesión (Logout)
 */
export function borrarCookieSesion(event: H3Event): void {
  deleteCookie(event, NOMBRE_COOKIE_SESION, {
    path: '/',
  })
}
