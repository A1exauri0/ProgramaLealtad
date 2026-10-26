// ==============================================================================
// Endpoint API: POST /api/admin/recompensas/subir-foto
// Sube una imagen de recompensa al bucket público de Supabase Storage
// Cumple requisito obligatorio: fotos en almacenamiento gratuito, nunca en la BD
// ==============================================================================

import crypto from 'node:crypto'
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  // 1. Validar permiso en el servidor
  await exigirPermisoBackend(event, 'gestionar_catalogo_recompensas')

  const config = useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl || process.env.SUPABASE_URL
  const serviceKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = config.supabaseBucket || process.env.SUPABASE_BUCKET || 'recompensas'

  if (!supabaseUrl || !serviceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.',
    })
  }

  // 2. Leer el archivo multipart
  const partes = await readMultipartFormData(event)
  const archivo = partes?.find((p) => p.name === 'foto' && p.data && p.filename)

  if (!archivo || !archivo.data || !archivo.filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debes seleccionar un archivo de imagen válido.',
    })
  }

  const tipoMime = archivo.type || 'image/jpeg'
  if (!tipoMime.startsWith('image/')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Solo se permiten archivos de imagen (PNG, JPG, WEBP, GIF).',
    })
  }

  // Limitar a 4MB para funciones serverless
  if (archivo.data.length > 4 * 1024 * 1024) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La imagen no debe superar los 4 MB.',
    })
  }

  // 3. Generar nombre único y subir a Supabase Storage REST API
  const extension = archivo.filename.split('.').pop()?.toLowerCase() || 'jpg'
  const nombreUnico = `premio-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`
  const urlSubida = `${supabaseUrl}/storage/v1/object/${bucket}/${nombreUnico}`

  const respuesta = await fetch(urlSubida, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': tipoMime,
      'x-upsert': 'true',
    },
    body: new Uint8Array(archivo.data),
  })

  if (!respuesta.ok) {
    const detalleError = await respuesta.text().catch(() => 'Error desconocido en Storage')
    throw createError({
      statusCode: 502,
      statusMessage: `Error al subir imagen a Supabase Storage: ${detalleError}`,
    })
  }

  const fotoUrlPublica = `${supabaseUrl}/storage/v1/object/public/${bucket}/${nombreUnico}`

  return {
    exito: true,
    mensaje: 'Imagen subida exitosamente a Supabase Storage.',
    fotoUrl: fotoUrlPublica,
  }
})
