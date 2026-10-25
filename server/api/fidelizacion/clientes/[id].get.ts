// ==============================================================================
// Endpoint Oficial Evaluación: GET /api/fidelizacion/clientes/{id}
// Devuelve la ficha del cliente y sus movimientos de puntos ordenados
// Protegido mediante Bearer Token API y con soporte de CORS
// ==============================================================================

// Dependencias de base de datos
import { eq, asc } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { clientes, movimientosPuntos } from '~~/database/schema/index'

// Utilidades del servidor
import { validarTokenApiEvaluacion } from '~~/server/utils/tokensApi'

export default defineEventHandler(async (event) => {
  // 1. Validar Bearer Token de evaluación
  await validarTokenApiEvaluacion(event)

  // 2. Extraer y validar el ID del cliente
  const idParam = getRouterParam(event, 'id')
  const clienteId = Number(idParam)

  if (!clienteId || isNaN(clienteId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de cliente inválido.',
      data: { error: 'Petición inválida', mensaje: 'El ID del cliente debe ser un número entero.' },
    })
  }

  // 3. Buscar el cliente en la base de datos
  const [cliente] = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
      telefono: clientes.telefono,
      fechaNacimiento: clientes.fechaNacimiento,
      nivel: clientes.nivel,
      puntosAcumulados: clientes.puntos,
      puntosDisponibles: clientes.puntosDisponibles,
      enRiesgo: clientes.enRiesgo,
      diasSinActividad: clientes.diasSinActividad,
    })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1)

  if (!cliente) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Cliente no encontrado',
      data: { error: 'No encontrado', mensaje: `No se encontró el cliente con ID ${clienteId}.` },
    })
  }

  // 4. Consultar los movimientos de puntos ordenados cronológicamente
  const movimientos = await db
    .select({
      fecha: movimientosPuntos.fecha,
      tipo: movimientosPuntos.tipo,
      puntos: movimientosPuntos.puntos,
      referencia: movimientosPuntos.referencia,
    })
    .from(movimientosPuntos)
    .where(eq(movimientosPuntos.clienteId, clienteId))
    .orderBy(asc(movimientosPuntos.fecha), asc(movimientosPuntos.id))

  // 5. Retornar respuesta con el formato exacto requerido por la prueba
  return {
    cliente: {
      id: cliente.id,
      nombre: cliente.nombre,
      correo: cliente.correo,
      telefono: cliente.telefono,
      fecha_nacimiento: cliente.fechaNacimiento,
      nivel: cliente.nivel,
      puntos_acumulados: cliente.puntosAcumulados,
      puntos_disponibles: cliente.puntosDisponibles,
      en_riesgo: cliente.enRiesgo,
      dias_sin_actividad: cliente.diasSinActividad,
    },
    movimientos: movimientos.map((m) => ({
      fecha: m.fecha,
      tipo: m.tipo,
      puntos: m.puntos,
      referencia: m.referencia,
    })),
  }
})
