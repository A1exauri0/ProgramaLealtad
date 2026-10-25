// ==============================================================================
// Generador de Token API para Evaluación (database/crearToken.ts)
// Crea un token Bearer en tokens_api y devuelve el valor plano para Postman / Evaluación
// Uso: pnpm db:token
// ==============================================================================

import 'dotenv/config'
import { sql } from './conexion'
import { crearNuevoTokenApi } from '../server/utils/tokensApi'

async function generarTokenEvaluacion() {
  console.log('🔑 Generando Bearer Token API para evaluación técnica...')
  try {
    const token = await crearNuevoTokenApi('Token Oficial de Evaluación Técnica 2026')

    console.log('==============================================================================')
    console.log('✅ TOKEN API GENERADO CON ÉXITO:')
    console.log('------------------------------------------------------------------------------')
    console.log(`Nombre:  ${token.nombre}`)
    console.log(`ID:      ${token.id}`)
    console.log(`Bearer:  ${token.tokenPlano}`)
    console.log('------------------------------------------------------------------------------')
    console.log('Copia este token para configurarlo en Postman en la cabecera:')
    console.log(`Authorization: Bearer ${token.tokenPlano}`)
    console.log('==============================================================================')
  } catch (error) {
    console.error('❌ Error generando token API:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

generarTokenEvaluacion()
