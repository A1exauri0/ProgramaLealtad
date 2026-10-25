// ==============================================================================
// Configuración de Drizzle Kit (Estilo Laravel: database/schema y database/migrations)
// ==============================================================================

import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './database/schema/index.ts',
  out: './database/migrations',
  dbCredentials: {
    // Puerto 5432 directo para migraciones de esquema
    url: (process.env.DATABASE_URL_MIGRACIONES || process.env.DATABASE_URL) as string,
  },
  verbose: true,
  strict: true,
})