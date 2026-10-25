// ==============================================================================
// Conexión Centralizada a Base de Datos (Supabase PostgreSQL)
// Driver: postgres.js (Ultra ligero para Serverless Vercel)
// ORM: Drizzle ORM
// ==============================================================================

import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema/index'

// URL de conexión (Puerto 6543: Transaction Pooler PgBouncer para Serverless)
const urlConexion = process.env.DATABASE_URL
if (!urlConexion) {
  throw new Error('La variable de entorno DATABASE_URL no está configurada.')
}

// Cliente postgres nativo singleton
export const sql = postgres(urlConexion, {
  prepare: false, // Requerido por PgBouncer / Transaction Pooler de Supabase
  max: 10,
  idle_timeout: 20,
})

// Instancia Drizzle ORM tipada con todos los modelos
export const db = drizzle(sql, { schema })

export default db
