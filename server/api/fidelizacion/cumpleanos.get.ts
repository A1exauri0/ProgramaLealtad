// ==============================================================================
// Endpoint Oficial Evaluación: GET /api/fidelizacion/cumpleanos
// Devuelve los clientes con cumpleaños en la ventana de evaluación (30 abr - 07 may 2026)
// Protegido mediante Bearer Token API y con soporte de CORS
// ==============================================================================

// Dependencias de base de datos
import { and, asc, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { clientes } from '~~/database/schema/index'

// Utilidades del servidor y reglas de negocio
import { validarTokenApiEvaluacion } from '~~/server/utils/tokensApi'
import { FECHA_CORTE_STR } from '~~/server/utils/fidelizacion'

// Ventana de evaluación de 7 días a partir del corte (2026-04-30 al 2026-05-07)
const FECHA_FIN_CUMPLEANOS_STR = '2026-05-07'

export default defineEventHandler(async (event) => {
  // 1. Validar Bearer Token de evaluación
  await validarTokenApiEvaluacion(event)

  // 2. Consultar clientes con cumpleaños dentro del rango de la prueba
  const cumplenaneros = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
      telefono: clientes.telefono,
      fechaNacimiento: clientes.fechaNacimiento,
      proximoCumpleanos: clientes.fechaCumpleanos,
      nivel: clientes.nivel,
      puntosDisponibles: clientes.puntosDisponibles,
    })
    .from(clientes)
    .where(
      and(
        sql`${clientes.fechaCumpleanos} >= ${FECHA_CORTE_STR}`,
        sql`${clientes.fechaCumpleanos} <= ${FECHA_FIN_CUMPLEANOS_STR}`
      )
    )
    .orderBy(asc(clientes.fechaCumpleanos), asc(clientes.id))

  // 3. Mapear al formato exacto requerido por la Sección 6 de la evaluación
  return cumplenaneros.map((c) => ({
    cliente_id: c.id,
    fecha_cumpleanos: c.proximoCumpleanos,
    id: c.id,
    nombre: c.nombre,
    correo: c.correo,
    telefono: c.telefono,
    fecha_nacimiento: c.fechaNacimiento,
    proximo_cumpleanos: c.proximoCumpleanos,
    nivel: c.nivel,
    puntos_disponibles: c.puntosDisponibles,
  }))
})
