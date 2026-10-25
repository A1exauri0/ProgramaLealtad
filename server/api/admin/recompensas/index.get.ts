// ==============================================================================
// Endpoint API: GET /api/admin/recompensas
// Consulta el catálogo completo de recompensas (productos y cupones) con métricas
// Protegido por autenticación y permiso 'gestionar_catalogo_recompensas'
// ==============================================================================

// Dependencias de base de datos
import { eq, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { recompensas, canjes } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  await exigirPermisoBackend(event, 'gestionar_catalogo_recompensas')

  // Consultar recompensas con conteo de canjes asociados
  const listaRecompensas = await db
    .select({
      id: recompensas.id,
      tipo: recompensas.tipo,
      nombre: recompensas.nombre,
      descripcion: recompensas.descripcion,
      fotoUrl: recompensas.fotoUrl,
      puntosRequeridos: recompensas.puntosRequeridos,
      stock: recompensas.stock,
      nivelMinimo: recompensas.nivelMinimo,
      limitePorCliente: recompensas.limitePorCliente,
      activo: recompensas.activo,
      descuentoTipo: recompensas.descuentoTipo,
      descuentoValor: recompensas.descuentoValor,
      compraMinimaMxn: recompensas.compraMinimaMxn,
      vigenciaDias: recompensas.vigenciaDias,
      creadoEn: recompensas.creadoEn,
      actualizadoEn: recompensas.actualizadoEn,
      totalCanjes: sql<number>`count(${canjes.id})::int`,
    })
    .from(recompensas)
    .leftJoin(canjes, eq(recompensas.id, canjes.recompensaId))
    .groupBy(
      recompensas.id,
      recompensas.tipo,
      recompensas.nombre,
      recompensas.descripcion,
      recompensas.fotoUrl,
      recompensas.puntosRequeridos,
      recompensas.stock,
      recompensas.nivelMinimo,
      recompensas.limitePorCliente,
      recompensas.activo,
      recompensas.descuentoTipo,
      recompensas.descuentoValor,
      recompensas.compraMinimaMxn,
      recompensas.vigenciaDias,
      recompensas.creadoEn,
      recompensas.actualizadoEn
    )
    .orderBy(recompensas.id)

  return {
    recompensas: listaRecompensas,
    total: listaRecompensas.length,
  }
})
