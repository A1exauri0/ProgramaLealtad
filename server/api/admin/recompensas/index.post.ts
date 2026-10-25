// ==============================================================================
// Endpoint API: POST /api/admin/recompensas
// Creación de una nueva recompensa (producto físico o cupón de descuento)
// Protegido por autenticación y permiso 'gestionar_catalogo_recompensas'
// ==============================================================================

// Dependencias de base de datos
import { db } from '~~/database/conexion'
import { recompensas } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  await exigirPermisoBackend(event, 'gestionar_catalogo_recompensas')

  const body = await readBody(event)

  const tipo = body.tipo === 'descuento' ? 'descuento' : 'producto'
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : null
  const fotoUrl = typeof body.fotoUrl === 'string' && body.fotoUrl.trim() ? body.fotoUrl.trim() : null
  const puntosRequeridos = Number(body.puntosRequeridos)
  const nivelMinimo = ['Bronce', 'Plata', 'Oro'].includes(body.nivelMinimo) ? body.nivelMinimo : 'Bronce'
  const limitePorCliente = body.limitePorCliente ? Number(body.limitePorCliente) : null

  if (!nombre || nombre.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'El nombre de la recompensa debe tener al menos 3 caracteres.' })
  }

  if (isNaN(puntosRequeridos) || puntosRequeridos <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Los puntos requeridos deben ser un número mayor a 0.' })
  }

  let stock: number | null = null
  let descuentoTipo: 'porcentaje' | 'monto_fijo' | null = null
  let descuentoValor: string | null = null
  let compraMinimaMxn: string | null = null
  let vigenciaDias: number | null = null

  if (tipo === 'producto') {
    stock = body.stock !== undefined && body.stock !== null && body.stock !== '' ? Number(body.stock) : null
    if (stock !== null && (isNaN(stock) || stock < 0)) {
      throw createError({ statusCode: 400, statusMessage: 'El stock disponible debe ser un número entero mayor o igual a 0.' })
    }
  } else {
    // Es cupón de descuento
    descuentoTipo = body.descuentoTipo === 'monto_fijo' ? 'monto_fijo' : 'porcentaje'
    const valorNum = Number(body.descuentoValor)

    if (isNaN(valorNum) || valorNum <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'El valor de descuento debe ser un monto válido mayor a 0.' })
    }

    if (descuentoTipo === 'porcentaje' && valorNum > 100) {
      throw createError({ statusCode: 400, statusMessage: 'El porcentaje de descuento no puede ser mayor a 100%.' })
    }

    descuentoValor = valorNum.toFixed(2)
    compraMinimaMxn = body.compraMinimaMxn ? Number(body.compraMinimaMxn).toFixed(2) : null
    vigenciaDias = body.vigenciaDias ? Number(body.vigenciaDias) : 30
  }

  const [nuevaRecompensa] = await db
    .insert(recompensas)
    .values({
      tipo,
      nombre,
      descripcion,
      fotoUrl,
      puntosRequeridos,
      stock,
      nivelMinimo,
      limitePorCliente,
      activo: true,
      descuentoTipo,
      descuentoValor,
      compraMinimaMxn,
      vigenciaDias,
    })
    .returning()

  return {
    exito: true,
    mensaje: `Recompensa "${nuevaRecompensa.nombre}" creada exitosamente.`,
    recompensa: nuevaRecompensa,
  }
})
