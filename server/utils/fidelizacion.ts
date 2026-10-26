// ==============================================================================
// Motor de Reglas Puras de Fidelización · Programa de Lealtad
// Implementa las fórmulas y reglas oficiales exactas a la fecha de corte 2026-04-30
// ==============================================================================

// Fecha fija de corte obligatoria (No usar new Date() del sistema)
export const FECHA_CORTE_STR = '2026-04-30'
export const FECHA_INICIO_12M_STR = '2025-05-01' // Corte - 365 días (inclusive)

// Tipos de cambio fijos a MXN oficiales
export const TIPOS_CAMBIO_MXN: Record<string, number> = {
  USD: 18.5,
  EUR: 20.0,
  GBP: 23.5,
  CAD: 13.5,
  AUD: 12.0,
}

/**
 * Convierte una fecha UTC a fecha local de México (UTC-6 fijo, sin horario de verano).
 * Devuelve la fecha en formato YYYY-MM-DD.
 */
export function convertirUtcAUgc6Fecha(fechaUtcString: string | null | undefined): string | null {
  if (!fechaUtcString) return null

  const fechaUtc = new Date(fechaUtcString)
  if (isNaN(fechaUtc.getTime())) return null

  // Restar exactamente 6 horas (UTC-6)
  const offsetMilisegundos = 6 * 60 * 60 * 1000
  const fechaUtc6 = new Date(fechaUtc.getTime() - offsetMilisegundos)

  const anio = fechaUtc6.getUTCFullYear()
  const mes = String(fechaUtc6.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(fechaUtc6.getUTCDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

/**
 * Valida si una fecha local cae antes o en la fecha de corte 2026-04-30
 */
export function esFechaAntesOEnCorte(fechaLocal: string): boolean {
  return fechaLocal <= FECHA_CORTE_STR
}

/**
 * Convierte un monto extranjero a MXN y redondea a 2 decimales (centavos).
 * Si la moneda no está en la lista de tipos de cambio fijos, devuelve null (se ignora).
 */
export function convertirAMxn(monto: number, moneda: string): number | null {
  const monedaMayus = moneda.toUpperCase().trim()
  const tipoCambio = TIPOS_CAMBIO_MXN[monedaMayus]

  if (!tipoCambio || isNaN(monto)) {
    return null
  }

  const resultado = monto * tipoCambio
  return Math.round(resultado * 100) / 100
}

/**
 * Calcula los puntos ganados por un pago individual:
 * 1 punto por cada $10 MXN de cada pago con status = "succeeded" redondeado hacia abajo.
 * Fórmula: Math.floor(monto_mxn / 10)
 */
export function calcularPuntosPorPago(montoMxn: number, estatusPago: string): number {
  if (estatusPago !== 'succeeded') {
    return 0
  }
  return Math.floor(montoMxn / 10)
}

/**
 * Determina el nivel del cliente según el gasto acumulado en los últimos 12 meses:
 * - Bronce: Menos de $150,000 MXN
 * - Plata: De $150,000 a $400,000 MXN
 * - Oro: Más de $400,000 MXN
 */
export function determinarNivelCliente(gasto12MesesMxn: number): 'Bronce' | 'Plata' | 'Oro' {
  if (gasto12MesesMxn > 400000) {
    return 'Oro'
  }
  if (gasto12MesesMxn >= 150000) {
    return 'Plata'
  }
  return 'Bronce'
}

/**
 * Evalúa si un cliente está en riesgo de abandono:
 * Tiene al menos un pago succeeded y lleva 90 días o más sin actividad al corte.
 * Actividad = fecha del último pago succeeded o último pedido no cancelled.
 * dias_sin_actividad = días entre la última actividad y el corte 2026-04-30.
 */
export function evaluarClienteEnRiesgo(
  tienePagoSucceeded: boolean,
  ultimaActividadFechaLocal: string | null
): { enRiesgo: boolean; diasSinActividad: number | null } {
  if (!tienePagoSucceeded || !ultimaActividadFechaLocal) {
    return { enRiesgo: false, diasSinActividad: null }
  }

  const fechaCorteMs = new Date(`${FECHA_CORTE_STR}T00:00:00Z`).getTime()
  const fechaActividadMs = new Date(`${ultimaActividadFechaLocal}T00:00:00Z`).getTime()

  const diferenciaMs = fechaCorteMs - fechaActividadMs
  const diasSinActividad = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24))

  return {
    enRiesgo: diasSinActividad >= 90,
    diasSinActividad: diasSinActividad >= 0 ? diasSinActividad : 0,
  }
}

/**
 * Evalúa si el cumpleaños del cliente cae entre el corte y corte + 7 días:
 * dob (primeros 10 caracteres YYYY-MM-DD sin convertir zona horaria).
 * Rango: del 04-30 al 05-07 (ambos inclusive). Formato devuelto: 2026-MM-DD.
 */
export function calcularProximoCumpleanos(dob: string | null | undefined): string | null {
  if (!dob || dob.length < 10) return null

  // Extraer los primeros 10 caracteres YYYY-MM-DD
  const fechaCalendario = dob.substring(0, 10)
  const mesDia = fechaCalendario.substring(5, 10) // MM-DD

  // Rango: entre 04-30 y 05-07 inclusive
  const caeEnRango = mesDia >= '04-30' && mesDia <= '05-07'

  if (caeEnRango) {
    return `2026-${mesDia}`
  }

  return null
}
