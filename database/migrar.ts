// ==============================================================================
// Ejecutor de Migraciones SQL (Equivalente a: php artisan migrate)
// Aplica los archivos SQL de database/migrations en Supabase PostgreSQL
// ==============================================================================

import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

async function ejecutarMigraciones() {
  console.log('🔄 Iniciando migraciones de base de datos...')

  // Conexión directa en puerto 5432 o 6543
  const url = process.env.DATABASE_URL_MIGRACIONES || process.env.DATABASE_URL
  if (!url) {
    throw new Error('No se encontró DATABASE_URL_MIGRACIONES ni DATABASE_URL en variables de entorno.')
  }

  const conexionMigracion = postgres(url, { max: 1 })
  const dbMigrador = drizzle(conexionMigracion)

  try {
    await migrate(dbMigrador, { migrationsFolder: './database/migrations' })
    console.log('✅ Migraciones aplicadas exitosamente en Supabase PostgreSQL.')
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error)
    process.exit(1)
  } finally {
    await conexionMigracion.end()
  }
}

ejecutarMigraciones()
