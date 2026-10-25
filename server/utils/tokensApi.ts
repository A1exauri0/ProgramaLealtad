// ==============================================================================
// Utilidad Nuxt Server · Autenticación y Validación de Tokens Bearer API
// Maneja la verificación segura contra la tabla tokens_api mediante hash SHA-256
// ==============================================================================

// Criptografía nativa de Node.js
import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { eq, and } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { tokensApi } from '~~/database/schema/index'

/**
 * Calcula el hash SHA-256 en hexadecimal de un token en texto plano
 */
export function calcularHashToken(tokenPlano: string): string {
  return crypto.createHash('sha256').update(tokenPlano.trim()).digest('hex')
}

/**
 * Genera un nuevo Bearer Token seguro, guarda su hash en la base de datos
 * y devuelve el token en texto plano (que se muestra solo una vez)
 */
export async function crearNuevoTokenApi(nombre: string, usuarioId?: number) {
  // Generar cadena aleatoria de 48 caracteres hexadecimales con prefijo pl_live_
  const aleatorio = crypto.randomBytes(24).toString('hex')
  const tokenPlano = `pl_live_${aleatorio}`
  const tokenHash = calcularHashToken(tokenPlano)

  const [tokenCreado] = await db
    .insert(tokensApi)
    .values({
      nombre,
      tokenHash,
      creadoPorUsuarioId: usuarioId || null,
      revocado: false,
    })
    .returning()

  return {
    id: tokenCreado.id,
    nombre: tokenCreado.nombre,
    tokenPlano,
    creadoEn: tokenCreado.creadoEn,
  }
}

/**
 * Valida el Bearer Token incluido en la cabecera 'Authorization' de la petición.
 * Si es válido, actualiza la fecha de último uso y retorna el registro del token.
 * Si no es válido o está revocado, lanza error HTTP 401.
 */
export async function validarTokenApiEvaluacion(event: H3Event) {
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No autorizado. Se requiere un Bearer Token en la cabecera Authorization.',
      data: {
        error: 'No autorizado',
        mensaje: 'Cabecera Authorization con formato Bearer <token> es obligatoria.',
      },
    })
  }

  const tokenPlano = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!tokenPlano) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No autorizado. Token de API vacío.',
    })
  }

  const tokenHash = calcularHashToken(tokenPlano)

  // Buscar en la tabla tokens_api
  const [tokenEncontrado] = await db
    .select()
    .from(tokensApi)
    .where(and(eq(tokensApi.tokenHash, tokenHash), eq(tokensApi.revocado, false)))
    .limit(1)

  if (!tokenEncontrado) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No autorizado. Token de API inválido, revocado o inexistente.',
      data: {
        error: 'No autorizado',
        mensaje: 'Token de API no válido o ha sido revocado.',
      },
    })
  }

  // Actualizar último uso asíncronamente sin bloquear la respuesta
  db.update(tokensApi)
    .set({ ultimoUsoEn: new Date() })
    .where(eq(tokensApi.id, tokenEncontrado.id))
    .catch((err) => console.error('Error actualizando ultimoUsoEn:', err))

  return tokenEncontrado
}
