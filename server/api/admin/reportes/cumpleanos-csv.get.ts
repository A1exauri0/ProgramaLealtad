// ==============================================================================
// Endpoint API: GET /api/admin/reportes/cumpleanos-csv
// Exporta la lista de clientes con cumpleaños próximos (30 abr - 07 may 2026) en CSV
// Protegido por permiso 'exportar_reportes_csv'
// ==============================================================================

import { and, asc, sql } from 'drizzle-orm'
import { setHeaders } from 'h3'
import { db } from '~~/database/conexion'
import { clientes } from '~~/database/schema/index'
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  const usuario = await exigirPermisoBackend(event, 'exportar_reportes_csv')
  const puedeVerMontos = usuario.permisos.includes('ver_montos_financieros')

  const listaCumpleanos = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
      telefono: clientes.telefono,
      fechaNacimiento: clientes.fechaNacimiento,
      fechaCumpleanos: clientes.fechaCumpleanos,
      nivel: clientes.nivel,
      puntosDisponibles: clientes.puntosDisponibles,
      gasto12m: clientes.gasto12m,
    })
    .from(clientes)
    .where(
      and(
        sql`${clientes.fechaCumpleanos} >= '2026-04-30'`,
        sql`${clientes.fechaCumpleanos} <= '2026-05-07'`
      )
    )
    .orderBy(asc(clientes.fechaCumpleanos), asc(clientes.id))

  const query = getQuery(event)
  const separador = query.sep === 'comma' ? ',' : ';'

  const cabeceras = [
    'ID',
    'Nombre',
    'Correo',
    'Teléfono',
    'Fecha Nacimiento',
    'Próximo Cumpleaños',
    'Nivel',
    'Puntos Disponibles',
    'Gasto 12M MXN',
  ]

  const escaparCsv = (valor: any): string => {
    if (valor === null || valor === undefined) return '""'
    const texto = String(valor).replace(/"/g, '""')
    return `"${texto}"`
  }

  const lineas = [cabeceras.map(escaparCsv).join(separador)]

  for (const c of listaCumpleanos) {
    const valorGasto = puedeVerMontos ? c.gasto12m : 'N/A (Sin permiso)'
    lineas.push(
      [
        c.id,
        escaparCsv(c.nombre),
        escaparCsv(c.correo),
        escaparCsv(c.telefono || 'N/D'),
        escaparCsv(c.fechaNacimiento || 'N/D'),
        escaparCsv(c.fechaCumpleanos || 'N/D'),
        escaparCsv(c.nivel),
        c.puntosDisponibles,
        escaparCsv(valorGasto),
      ].join(separador)
    )
  }

  const contenidoCsv = '\uFEFF' + lineas.join('\r\n')

  setHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="proximos_cumpleanos_2026-04-30.csv"',
  })

  return contenidoCsv
})
