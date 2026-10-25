// ==============================================================================
// Endpoint API: GET /api/admin/dashboard
// Retorna las métricas ejecutivas, distribución por niveles y Top 10 clientes
// Protegido mediante sesión administrativa activa
// ==============================================================================

// Dependencias de base de datos
import { eq, desc, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { clientes, corridasSincronizacion } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  // 1. Exigir permiso 'ver_resumen_panel' en el backend (responde 403 si no lo tiene)
  const usuario = await exigirPermisoBackend(event, 'ver_resumen_panel')

  // 2. Métricas globales de clientes y puntos
  const [metricasGlobales] = await db
    .select({
      totalClientes: sql<number>`count(*)::int`,
      totalPuntosEmitidos: sql<number>`COALESCE(sum(${clientes.puntos}), 0)::bigint`,
      totalPuntosDisponibles: sql<number>`COALESCE(sum(${clientes.puntosDisponibles}), 0)::bigint`,
      totalEnRiesgo: sql<number>`count(*) filter (where ${clientes.enRiesgo} = true)::int`,
    })
    .from(clientes)

  // 3. Distribución por niveles (Bronce, Plata, Oro)
  const distribucionNiveles = await db
    .select({
      nivel: clientes.nivel,
      cantidad: sql<number>`count(*)::int`,
    })
    .from(clientes)
    .groupBy(clientes.nivel)

  const nivelesMap = {
    Bronce: 0,
    Plata: 0,
    Oro: 0,
  }

  for (const item of distribucionNiveles) {
    if (item.nivel in nivelesMap) {
      nivelesMap[item.nivel as keyof typeof nivelesMap] = item.cantidad
    }
  }

  // 4. Top 10 clientes con más puntos
  const top10Clientes = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
      nivel: clientes.nivel,
      puntos: clientes.puntos,
      puntosDisponibles: clientes.puntosDisponibles,
      enRiesgo: clientes.enRiesgo,
    })
    .from(clientes)
    .orderBy(desc(clientes.puntosDisponibles), desc(clientes.puntos))
    .limit(10)

  // 5. Última corrida de sincronización
  const [ultimaCorrida] = await db
    .select()
    .from(corridasSincronizacion)
    .orderBy(desc(corridasSincronizacion.id))
    .limit(1)

  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rolNombre,
      permisos: usuario.permisos,
    },
    metricas: {
      totalClientes: metricasGlobales?.totalClientes || 0,
      totalPuntosEmitidos: Number(metricasGlobales?.totalPuntosEmitidos || 0),
      totalPuntosDisponibles: Number(metricasGlobales?.totalPuntosDisponibles || 0),
      totalEnRiesgo: metricasGlobales?.totalEnRiesgo || 0,
      niveles: nivelesMap,
    },
    top10Clientes,
    ultimaCorrida: ultimaCorrida || null,
  }
})
