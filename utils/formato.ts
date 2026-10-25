// ==============================================================================
// Utilidades de Formateo Determinista · utils/formato.ts
// Garantiza cadenas idénticas entre SSR (servidor Node) y cliente (navegador)
// Evita desincronizaciones de hidratación (Hydration text content mismatch)
// ==============================================================================

/**
 * Formatea un número entero con separador de miles con coma (1,000)
 */
export function formatearEntero(valor?: unknown): string {
  if (valor === null || valor === undefined || valor === '' || typeof valor === 'object') return '0'
  const num = Math.round(Number(valor))
  if (isNaN(num)) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Formatea un monto monetario en MXN con 2 decimales fijos ($1,234.56)
 */
export function formatearMonto(valor?: unknown): string {
  if (valor === null || valor === undefined || valor === '' || typeof valor === 'object') return '0.00'
  const num = Number(valor)
  if (isNaN(num)) return '0.00'
  const partes = num.toFixed(2).split('.')
  const enteroFormateado = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${enteroFormateado}.${partes[1]}`
}
