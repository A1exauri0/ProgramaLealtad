// ==============================================================================
// Endpoint API: GET /api/admin/canjes
// Consulta el historial y estado de canjes de recompensas con clientes y cupones
// Protegido por autenticación y permiso 'gestionar_canjes'
// ==============================================================================

// Dependencias de base de datos
import { eq, desc, and } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { canjes, clientes, recompensas, cupones } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  // Validación de permiso administrativo
  await exigirPermisoBackend(event, 'gestionar_canjes')

  const query = getQuery(event)
  const filtroEstatus = query.estatus ? String(query.estatus) : undefined
  const filtroTipo = query.tipo ? String(query.tipo) : undefined

  // Condiciones de consulta dinámicas
  const condiciones = []
  if (filtroEstatus && filtroEstatus !== 'todos') {
    condiciones.push(eq(canjes.estatus, filtroEstatus))
  }
  if (filtroTipo && filtroTipo !== 'todos') {
    condiciones.push(eq(recompensas.tipo, filtroTipo))
  }

  const clausulaWhere = condiciones.length > 0 ? and(...condiciones) : undefined

  // Consulta con joins a clientes, recompensas y cupones
  const registros = await db
    .select({
      id: canjes.id,
      clienteId: canjes.clienteId,
      clienteNombre: clientes.nombre,
      clienteCorreo: clientes.correo,
      clienteNivel: clientes.nivel,
      recompensaId: canjes.recompensaId,
      recompensaNombre: recompensas.nombre,
      recompensaTipo: recompensas.tipo,
      recompensaFotoUrl: recompensas.fotoUrl,
      puntosGastados: canjes.puntosGastados,
      estatus: canjes.estatus,
      fechaCanje: canjes.fechaCanje,
      fechaEntrega: canjes.fechaEntrega,
      motivoCancelacion: canjes.motivoCancelacion,
      actualizadoEn: canjes.actualizadoEn,
      // Datos del cupón si aplica
      cuponId: cupones.id,
      cuponCodigo: cupones.codigo,
      cuponEstatus: cupones.estatus,
      cuponVencimiento: cupones.fechaVencimiento,
      cuponDescuentoTipo: cupones.descuentoTipo,
      cuponDescuentoValor: cupones.descuentoValor,
    })
    .from(canjes)
    .innerJoin(clientes, eq(canjes.clienteId, clientes.id))
    .innerJoin(recompensas, eq(canjes.recompensaId, recompensas.id))
    .leftJoin(cupones, eq(canjes.id, cupones.canjeId))
    .where(clausulaWhere)
    .orderBy(desc(canjes.fechaCanje), desc(canjes.id))

  return {
    ok: true,
    canjes: registros,
    total: registros.length,
  }
})
