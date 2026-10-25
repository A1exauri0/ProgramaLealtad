// ==============================================================================
// Script de Sincronización Manual vía CLI (database/sincronizar.ts)
// Ejecuta el motor de sincronización de fakeapi.dev hacia Supabase
// Uso: pnpm db:sync
// ==============================================================================

// Dependencias de entorno y conexión
import 'dotenv/config'
import { ejecutarSincronizacionCompleta } from '../server/services/sync.service'
import { sql } from './conexion'

async function sincronizarDesdeConsola() {
  console.log('🔄 Iniciando sincronización manual por CLI...')
  try {
    const resultado = await ejecutarSincronizacionCompleta({
      tipo: 'manual',
    })

    console.log('✅ Sincronización completada con éxito:')
    console.log(`   - Corrida ID: ${resultado.corridaId}`)
    console.log(`   - Clientes sincronizados: ${resultado.clientesSincronizados}`)
    console.log(`   - Pedidos sincronizados: ${resultado.pedidosSincronizados}`)
    console.log(`   - Pagos sincronizados: ${resultado.pagosSincronizados}`)
    console.log(`   - Peticiones HTTP a fakeapi: ${resultado.totalPeticionesHttp}`)
    console.log(`   - Duración: ${resultado.duracionMs} ms`)
  } catch (error) {
    console.error('❌ Error durante la sincronización CLI:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

sincronizarDesdeConsola()
