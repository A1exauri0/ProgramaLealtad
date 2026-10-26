// ==============================================================================
// Endpoint Oficial Evaluación: GET /api/fidelizacion/riesgo
// Devuelve el listado completo de clientes en riesgo sin paginar
// Protegido mediante Bearer Token API y con soporte de CORS
// ==============================================================================

// Dependencias de base de datos
import { eq, desc, asc } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { clientes } from '~~/database/schema/index'

// Utilidades del servidor
import { validarTokenApiEvaluacion } from '~~/server/utils/tokensApi'

export default defineEventHandler(async (event) => {
  // 1. Validar Bearer Token de evaluación
  await validarTokenApiEvaluacion(event)

  // 2. Consultar todos los clientes identificados en riesgo
  const clientesEnRiesgo = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
      telefono: clientes.telefono,
      nivel: clientes.nivel,
      puntosDisponibles: clientes.puntosDisponibles,
      diasSinActividad: clientes.diasSinActividad,
    })
    .from(clientes)
    .where(eq(clientes.enRiesgo, true))
    .orderBy(desc(clientes.diasSinActividad), asc(clientes.id))

  // 3. Mapear al formato exacto requerido por la Sección 6 de la evaluación
  return clientesEnRiesgo.map((c) => ({
    cliente_id: c.id,
    dias_sin_actividad: c.diasSinActividad,
    id: c.id,
    nombre: c.nombre,
    correo: c.correo,
    telefono: c.telefono,
    nivel: c.nivel,
    puntos_disponibles: c.puntosDisponibles,
  }))
})
