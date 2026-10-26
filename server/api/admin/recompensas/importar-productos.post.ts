// ==============================================================================
// Endpoint API (Punto Extra): POST /api/admin/recompensas/importar-productos
// Importa productos desde /products de fakeapi.dev como base del catálogo
// Después pueden editarse nombre, foto, puntos y stock desde el panel
// ==============================================================================

import { eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { recompensas } from '~~/database/schema/index'
import { exigirPermisoBackend } from '~~/server/utils/permisos'
import { realizarPeticionFakeApi } from '~~/server/services/fakeapi.service'

interface ProductoFakeApi {
  id: number
  title?: string
  name?: string
  description?: string
  price?: number | string
  image?: string
  image_url?: string
  category?: string
}

export default defineEventHandler(async (event) => {
  // 1. Validar permiso administrativo de catálogo
  await exigirPermisoBackend(event, 'gestionar_catalogo_recompensas')

  // 2. Consultar la primera página de /products desde fakeapi.dev
  const respuesta = await realizarPeticionFakeApi<ProductoFakeApi>('/products', 1, 12)
  const listaProductos = respuesta?.data || []

  if (listaProductos.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No se encontraron productos en /products de fakeapi.dev.',
    })
  }

  let importados = 0

  for (const prod of listaProductos.slice(0, 8)) {
    const nombreProducto = (prod.title || prod.name || `Producto #${prod.id}`).trim()

    // Evitar duplicar si ya se importó con el mismo nombre
    const [existente] = await db
      .select({ id: recompensas.id })
      .from(recompensas)
      .where(eq(recompensas.nombre, nombreProducto))
      .limit(1)

    if (existente) continue

    const precioBase = Number(prod.price) || 50
    const puntosSugeridos = Math.max(500, Math.round(precioBase * 20))
    const nivelSugerido =
      puntosSugeridos > 8000 ? 'Oro' : puntosSugeridos >= 3000 ? 'Plata' : 'Bronce'

    await db.insert(recompensas).values({
      tipo: 'producto',
      nombre: nombreProducto,
      descripcion: prod.description || `Producto importado de la tienda (${prod.category || 'General'})`,
      fotoUrl: prod.image || prod.image_url || null,
      puntosRequeridos: puntosSugeridos,
      stock: 15,
      nivelMinimo: nivelSugerido,
      limitePorCliente: 2,
      activo: true,
    })

    importados++
  }

  return {
    exito: true,
    mensaje:
      importados > 0
        ? `Se importaron ${importados} productos desde fakeapi.dev (/products) al catálogo.`
        : 'Los productos base de fakeapi.dev ya se encontraban importados en el catálogo.',
    importados,
  }
})
