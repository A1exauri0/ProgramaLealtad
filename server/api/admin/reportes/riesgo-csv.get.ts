// ==============================================================================
// Endpoint API: GET /api/admin/reportes/riesgo-csv
// Exporta la lista de clientes en riesgo en formato CSV descargable
// Respeta el enmascaramiento financiero según permisos del usuario
// ==============================================================================

// Dependencias de base de datos
import { eq, desc, asc } from 'drizzle-orm'
import { setHeaders } from 'h3'
import { db } from '~~/database/conexion'
import { clientes } from '~~/database/schema/index'

// Utilidades del servidor
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  // 1. Exigir permiso 'exportar_reportes_csv' en backend (responde HTTP 403 a Atención a clientes)
  const usuario = await exigirPermisoBackend(event, 'exportar_reportes_csv')
  const puedeVerMontos = usuario.permisos.includes('ver_montos_financieros')

  // 2. Consultar clientes en riesgo
  const listaRiesgo = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
      telefono: clientes.telefono,
      nivel: clientes.nivel,
      puntosDisponibles: clientes.puntosDisponibles,
      diasSinActividad: clientes.diasSinActividad,
      gasto12m: clientes.gasto12m,
    })
    .from(clientes)
    .where(eq(clientes.enRiesgo, true))
    .orderBy(desc(clientes.diasSinActividad), asc(clientes.id))

  // 3. Generar contenido CSV con escape de caracteres y delimitador regional
  // En sistemas Windows y Excel en español, el delimitador estándar es el punto y coma (;)
  // para evitar que todos los datos se agrupen en la primera columna (columna A).
  const query = getQuery(event)
  const separador = query.sep === 'comma' ? ',' : ';'

  const cabeceras = [
    'ID',
    'Nombre',
    'Correo',
    'Teléfono',
    'Nivel',
    'Puntos Disponibles',
    'Días Sin Actividad',
    'Gasto 12M MXN',
  ]

  const escaparCsv = (valor: any): string => {
    if (valor === null || valor === undefined) return '""'
    const texto = String(valor).replace(/"/g, '""')
    return `"${texto}"`
  }

  const lineas = [cabeceras.map(escaparCsv).join(separador)]

  for (const c of listaRiesgo) {
    const valorGasto = puedeVerMontos ? c.gasto12m : 'N/A (Sin permiso)'
    lineas.push(
      [
        c.id,
        escaparCsv(c.nombre),
        escaparCsv(c.correo),
        escaparCsv(c.telefono || 'N/D'),
        escaparCsv(c.nivel),
        c.puntosDisponibles,
        c.diasSinActividad,
        escaparCsv(valorGasto),
      ].join(separador)
    )
  }

  // BOM UTF-8 (\uFEFF) para que Excel detecte la codificación y separe las columnas correctamente
  const contenidoCsv = '\uFEFF' + lineas.join('\r\n')

  // 4. Configurar cabeceras de descarga de archivo
  setHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="clientes_en_riesgo_2026-04-30.csv"',
  })

  return contenidoCsv
})
