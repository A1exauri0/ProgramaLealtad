// ==============================================================================
// Script de Seguridad: Habilitar RLS (Row Level Security) en Supabase
// Resuelve las advertencias de seguridad del linter de Supabase en public.*
// ==============================================================================

import 'dotenv/config'
import { sql } from './conexion'

const tablas = [
  'roles',
  'roles_permisos',
  'usuarios',
  'tokens_api',
  'clientes',
  'pedidos',
  'pagos',
  'movimientos_puntos',
  'cuentas_portal',
  'recompensas',
  'canjes',
  'cupones',
  'corridas_sincronizacion',
  'inconsistencias_fuente',
]

async function habilitarRls() {
  console.log('🛡️ Habilitando Row Level Security (RLS) en todas las tablas...')

  for (const tabla of tablas) {
    try {
      await sql.unsafe(`ALTER TABLE public.${tabla} ENABLE ROW LEVEL SECURITY;`)
      console.log(`  ✅ RLS habilitado en: public.${tabla}`)
    } catch (error: any) {
      console.warn(`  ⚠️ No se pudo habilitar en public.${tabla}:`, error.message)
    }
  }

  console.log('🎉 RLS configurado con éxito. Las advertencias de Supabase quedarán resueltas.')
  await sql.end()
  process.exit(0)
}

habilitarRls().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
