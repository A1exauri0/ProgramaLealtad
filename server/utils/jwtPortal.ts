// ==============================================================================
// Utilidad Nuxt Server · Sesión de Clientes del Portal (jwtPortal.ts)
// Maneja JWT y Cookies exclusivas para los clientes del portal de autoservicio
// ==============================================================================

import { SignJWT, jwtVerify } from 'jose'
import type { H3Event } from 'h3'

// Nombre de la cookie exclusiva para el portal de clientes
export const NOMBRE_COOKIE_PORTAL = 'sesion_portal_cliente'

function obtenerClaveSecretaPortal(): Uint8Array {
  const secreto = process.env.SESION_SECRETO || 'clave-secreta-predeterminada-programa-lealtad-2026-min-32-caracteres'
  return new TextEncoder().encode(secreto)
}

export interface CargaUtilPortal {
  clienteId: number
  correo: string
  nombre: string
  nivel: string
  requiereCambioPassword: boolean
}

/**
 * Genera un token JWT de sesión para el portal del cliente con expiración de 12 horas
 */
export async function firmarTokenPortal(carga: CargaUtilPortal): Promise<string> {
  const clave = obtenerClaveSecretaPortal()
  return await new SignJWT({ ...carga })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(clave)
}

/**
 * Valida y decodifica un token JWT de sesión de cliente
 */
export async function verificarTokenPortal(token: string): Promise<CargaUtilPortal | null> {
  try {
    const clave = obtenerClaveSecretaPortal()
    const { payload } = await jwtVerify(token, clave)
    return payload as unknown as CargaUtilPortal
  } catch {
    return null
  }
}

/**
 * Guarda la cookie de sesión del portal de clientes (httpOnly, sameSite)
 */
export function fijarCookiePortal(event: H3Event, token: string): void {
  setCookie(event, NOMBRE_COOKIE_PORTAL, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 12, // 12 horas
    path: '/',
  })
}

/**
 * Obtiene la sesión actual del cliente desde la cookie HTTP
 */
export async function obtenerSesionPortal(event: H3Event): Promise<CargaUtilPortal | null> {
  const token = getCookie(event, NOMBRE_COOKIE_PORTAL)
  if (!token) return null
  return await verificarTokenPortal(token)
}

/**
 * Exige sesión de portal válida o arroja error 401
 */
export async function exigirSesionPortal(event: H3Event): Promise<CargaUtilPortal> {
  const sesion = await obtenerSesionPortal(event)
  if (!sesion) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Debes iniciar sesión en el portal para acceder a esta función.',
    })
  }
  return sesion
}

/**
 * Elimina la cookie de sesión del portal (Logout)
 */
export function borrarCookiePortal(event: H3Event): void {
  deleteCookie(event, NOMBRE_COOKIE_PORTAL, {
    path: '/',
  })
}
