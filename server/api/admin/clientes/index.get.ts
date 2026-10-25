// ==============================================================================
// Endpoint API: GET /api/admin/clientes
// Listado paginado de clientes con búsqueda y filtros por nivel o riesgo
// Protegido por sesión y con enmascaramiento según permiso 'ver_montos_financieros'
// ==============================================================================

// Dependencias de base de datos
import { and, ilike, eq, or, desc, asc, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { clientes } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  // 1. Extraer parámetros de consulta
  const query = getQuery(event)
  const pagina = Math.max(1, Number(query.page) || 1)
  const limite = Math.min(1000, Math.max(1, Number(query.limit) || 10))
  const desplazamiento = (pagina - 1) * limite

  const busqueda = (query.q as string)?.trim() || ''
  const filtroNivel = (query.nivel as string)?.trim() || ''
  const filtroRiesgo = query.riesgo === 'true' ? true : query.riesgo === 'false' ? false : null
  const filtroCumpleanos = query.cumpleanos === 'true'

  // 2. Validar permiso en backend según el tipo de listado consultado (HTTP 403 si no tiene permiso)
  const permisoRequerido =
    filtroRiesgo === true || filtroCumpleanos
      ? 'ver_listas_riesgo_cumpleanos'
      : 'buscar_cliente_detalle'
  const usuario = await exigirPermisoBackend(event, permisoRequerido)
  const puedeVerMontos = usuario.permisos.includes('ver_montos_financieros')

  // 3. Construir condiciones dinámicas
  const condiciones = []

  if (busqueda) {
    const esNumero = !isNaN(Number(busqueda))
    if (esNumero) {
      condiciones.push(
        or(
          eq(clientes.id, Number(busqueda)),
          ilike(clientes.nombre, `%${busqueda}%`),
          ilike(clientes.correo, `%${busqueda}%`),
          ilike(clientes.telefono, `%${busqueda}%`)
        )
      )
    } else {
      condiciones.push(
        or(
          ilike(clientes.nombre, `%${busqueda}%`),
          ilike(clientes.correo, `%${busqueda}%`),
          ilike(clientes.telefono, `%${busqueda}%`)
        )
      )
    }
  }

  if (filtroNivel && ['Bronce', 'Plata', 'Oro'].includes(filtroNivel)) {
    condiciones.push(eq(clientes.nivel, filtroNivel))
  }

  if (filtroRiesgo !== null) {
    condiciones.push(eq(clientes.enRiesgo, filtroRiesgo))
  }

  if (filtroCumpleanos) {
    condiciones.push(
      and(
        sql`${clientes.fechaCumpleanos} >= '2026-04-30'`,
        sql`${clientes.fechaCumpleanos} <= '2026-05-07'`
      )
    )
  }

  const condicionFinal = condiciones.length > 0 ? and(...condiciones) : undefined

  // 4. Conteo total para paginación
  const [conteo] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(clientes)
    .where(condicionFinal)

  const totalRegistros = conteo?.total || 0
  const totalPaginas = Math.ceil(totalRegistros / limite)

  // 5. Definir ordenamiento según el tipo de vista
  const ordenamiento = filtroCumpleanos
    ? [asc(clientes.fechaCumpleanos), asc(clientes.id)]
    : filtroRiesgo === true
      ? [desc(clientes.diasSinActividad), asc(clientes.id)]
      : [desc(clientes.puntosDisponibles), desc(clientes.id)]

  // 6. Consulta de clientes
  const listaClientes = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
      telefono: clientes.telefono,
      fechaNacimiento: clientes.fechaNacimiento,
      fechaCumpleanos: clientes.fechaCumpleanos,
      nivel: clientes.nivel,
      puntos: clientes.puntos,
      puntosDisponibles: clientes.puntosDisponibles,
      enRiesgo: clientes.enRiesgo,
      diasSinActividad: clientes.diasSinActividad,
      gasto12m: clientes.gasto12m,
    })
    .from(clientes)
    .where(condicionFinal)
    .orderBy(...ordenamiento)
    .limit(limite)
    .offset(desplazamiento)

  // 6. Enmascarar montos si no tiene el permiso ver_montos_financieros
  const clientesResultado = listaClientes.map((c) => ({
    ...c,
    gasto12m: puedeVerMontos ? c.gasto12m : null,
    puedeVerMontos,
  }))

  return {
    datos: clientesResultado,
    meta: {
      total: totalRegistros,
      pagina,
      limite,
      totalPaginas,
      puedeVerMontos,
    },
  }
})
