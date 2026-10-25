// ==============================================================================
// Ejecutor de Seeders (Equivalente a: php artisan db:seed)
// Pobla la base de datos con los datos iniciales necesarios
// ==============================================================================

import { sembrarDatosIniciales } from './seeders/inicial.seeder'
import { sql } from './conexion'

async function correrSeeders() {
  try {
    await sembrarDatosIniciales()
  } catch (error) {
    console.error('❌ Error al ejecutar seeders:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

correrSeeders()
