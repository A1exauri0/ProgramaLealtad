// ==============================================================================
// Pruebas Automatizadas del Motor de Fidelización · database/probarReglas.ts
// Verifica todas las reglas de negocio de la Sección 4 al corte 2026-04-30
// ==============================================================================

import assert from 'node:assert/strict'
import {
  convertirUtcAUgc6Fecha,
  esFechaAntesOEnCorte,
  convertirAMxn,
  calcularPuntosPorPago,
  determinarNivelCliente,
  evaluarClienteEnRiesgo,
  calcularProximoCumpleanos,
} from '../server/utils/fidelizacion'

console.log('🧪 Ejecutando pruebas automatizadas de las reglas de puntos y fidelización...\n')

// ------------------------------------------------------------------------------
// 1. Conversión de Zona Horaria UTC a México (UTC-6 fijo) y Fecha de Corte
// ------------------------------------------------------------------------------
assert.equal(
  convertirUtcAUgc6Fecha('2026-05-01T04:30:00Z'),
  '2026-04-30',
  '2026-05-01 04:30 UTC debe ser 2026-04-30 en UTC-6 (dentro del corte)'
)
assert.equal(
  convertirUtcAUgc6Fecha('2026-05-01T06:00:00Z'),
  '2026-05-01',
  '2026-05-01 06:00 UTC debe ser 2026-05-01 en UTC-6 (fuera del corte)'
)
assert.equal(esFechaAntesOEnCorte('2026-04-30'), true)
assert.equal(esFechaAntesOEnCorte('2026-05-01'), false)
console.log('  ✅ Regla 1: Conversión UTC a UTC-6 fijo y filtro de fecha de corte (2026-04-30)')

// ------------------------------------------------------------------------------
// 2. Conversión de Monedas a MXN y Redondeo a Centavos
// ------------------------------------------------------------------------------
assert.equal(convertirAMxn(100, 'USD'), 1850)
assert.equal(convertirAMxn(50.25, 'EUR'), 1005)
assert.equal(convertirAMxn(10, 'GBP'), 235)
assert.equal(convertirAMxn(10, 'CAD'), 135)
assert.equal(convertirAMxn(10, 'AUD'), 120)
assert.equal(convertirAMxn(100, 'JPY'), null, 'Moneda no soportada debe ignorarse (null)')
console.log('  ✅ Regla 2: Conversión de divisas (USD, EUR, GBP, CAD, AUD) e ignorado de monedas no válidas')

// ------------------------------------------------------------------------------
// 3. Cálculo de Puntos por Pago: floor(mxn / 10) solo para status = succeeded
// ------------------------------------------------------------------------------
assert.equal(calcularPuntosPorPago(1859.99, 'succeeded'), 185)
assert.equal(calcularPuntosPorPago(9.99, 'succeeded'), 0)
assert.equal(calcularPuntosPorPago(5000, 'failed'), 0)
assert.equal(calcularPuntosPorPago(5000, 'disputed'), 0)
console.log('  ✅ Regla 3: Cálculo de puntos por pago floor(mxn / 10) y filtrado por estatus')

// ------------------------------------------------------------------------------
// 4. Niveles de Lealtad según Gasto 12 Meses
// Bronce < $150,000 · Plata $150,000 a $400,000 · Oro > $400,000
// ------------------------------------------------------------------------------
assert.equal(determinarNivelCliente(0), 'Bronce')
assert.equal(determinarNivelCliente(149999.99), 'Bronce')
assert.equal(determinarNivelCliente(150000), 'Plata')
assert.equal(determinarNivelCliente(400000), 'Plata', '$400,000 exactos sigue siendo Plata')
assert.equal(determinarNivelCliente(400000.01), 'Oro', 'Más de $400,000 sube a Oro')
console.log('  ✅ Regla 4: Rangos exactos de nivel (Bronce < 150k, Plata 150k-400k, Oro > 400k)')

// ------------------------------------------------------------------------------
// 5. Evaluación de Cliente en Riesgo (≥ 90 días sin actividad al 2026-04-30)
// ------------------------------------------------------------------------------
const riesgoExacto90 = evaluarClienteEnRiesgo(true, '2026-01-30')
assert.equal(riesgoExacto90.diasSinActividad, 90)
assert.equal(riesgoExacto90.enRiesgo, true)

const activo89 = evaluarClienteEnRiesgo(true, '2026-01-31')
assert.equal(activo89.diasSinActividad, 89)
assert.equal(activo89.enRiesgo, false)

const sinCompras = evaluarClienteEnRiesgo(false, '2025-01-01')
assert.equal(sinCompras.enRiesgo, false, 'Sin al menos un pago succeeded no está en riesgo')
console.log('  ✅ Regla 5: Detección de clientes en riesgo (>= 90 días inactivo con pago succeeded)')

// ------------------------------------------------------------------------------
// 6. Ventana de Próximos Cumpleaños (del 04-30 al 05-07 sin conversión horaria)
// ------------------------------------------------------------------------------
assert.equal(calcularProximoCumpleanos('1995-04-30T23:59:59Z'), '2026-04-30')
assert.equal(calcularProximoCumpleanos('1988-05-07'), '2026-05-07')
assert.equal(calcularProximoCumpleanos('1990-05-08'), null)
assert.equal(calcularProximoCumpleanos('1990-04-29'), null)
console.log('  ✅ Regla 6: Cálculo de próximos cumpleaños entre 2026-04-30 y 2026-05-07\n')

console.log('🎉 Todas las pruebas automatizadas de fidelización pasaron exitosamente.')
