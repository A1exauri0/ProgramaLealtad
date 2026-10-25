// ==============================================================================
// Utilidad de Servidor: Catálogo Dinámico de Permisos en Base de Datos
// Gestiona la tabla 'permisos' con protección de los 12 privilegios base del sistema
// ==============================================================================

import { sql } from '~~/database/conexion'
import { LISTA_PERMISOS } from '~~/database/seeders/inicial.seeder'

export interface PermisoDb {
  clave: string
  descripcion: string
  esSistema: boolean
  creadoEn?: Date
  actualizadoEn?: Date
}

let tablaInicializada = false

/**
 * Asegura la existencia de la tabla 'permisos' y siembra los 12 privilegios base del sistema
 */
export async function asegurarTablaPermisos(): Promise<void> {
  if (tablaInicializada) return

  await sql`
    CREATE TABLE IF NOT EXISTS permisos (
      clave VARCHAR(80) PRIMARY KEY,
      descripcion TEXT NOT NULL,
      es_sistema BOOLEAN NOT NULL DEFAULT false,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // Sembrar los 12 privilegios base si no existen en la tabla
  for (const p of LISTA_PERMISOS) {
    await sql`
      INSERT INTO permisos (clave, descripcion, es_sistema)
      VALUES (${p.clave}, ${p.descripcion}, true)
      ON CONFLICT (clave) DO UPDATE
      SET es_sistema = true;
    `
  }

  tablaInicializada = true
}

/**
 * Obtiene la lista completa de permisos desde la base de datos
 */
export async function obtenerTodosLosPermisos(): Promise<PermisoDb[]> {
  await asegurarTablaPermisos()

  const filas = await sql`
    SELECT
      clave,
      descripcion,
      es_sistema as "esSistema",
      creado_en as "creadoEn",
      actualizado_en as "actualizadoEn"
    FROM permisos
    ORDER BY es_sistema DESC, clave ASC;
  `

  return filas.map((f: any) => ({
    clave: f.clave,
    descripcion: f.descripcion,
    esSistema: Boolean(f.esSistema),
    creadoEn: f.creadoEn,
    actualizadoEn: f.actualizadoEn,
  }))
}
