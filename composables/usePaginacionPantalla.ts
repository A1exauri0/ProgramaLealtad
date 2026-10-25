// ==============================================================================
// Composable: usePaginacionPantalla.ts
// Calcula de forma reactiva el número óptimo de registros por página para que
// la tabla y sus controles quepan exactamente en la altura de pantalla visible,
// evitando que el usuario tenga que desplazarse hacia abajo.
// ==============================================================================

// ------------------------------------------------------------------------------
// IMPORTACIONES Y TIPOS
// ------------------------------------------------------------------------------
interface OpcionesPaginacionPantalla {
  tieneFiltros?: boolean
  tieneCabeceraExtra?: boolean
  margenOffset?: number
  minimoFilas?: number
  maximoFilas?: number
}

// ------------------------------------------------------------------------------
// COMPOSABLE PRINCIPAL
// ------------------------------------------------------------------------------
export function usePaginacionPantalla(opciones: OpcionesPaginacionPantalla = {}) {
  const {
    tieneFiltros = false,
    tieneCabeceraExtra = false,
    margenOffset = 360,
    minimoFilas = 5,
    maximoFilas = 25,
  } = opciones

  // Valor seguro predeterminado para renderizado en servidor (SSR)
  const tamanioPagina = ref(8)

  /**
   * Calcula el número de filas óptimas según el alto de la ventana visible
   */
  function calcularFilasOptimas(): number {
    if (import.meta.server) return 8

    const alturaVentana = window.innerHeight

    // Descontar altura ocupada por:
    // - Barra superior (Navbar): ~60px
    // - Padding de layout principal: ~48px
    // - CabeceraPagina (título y subtítulo): ~70px
    // - Barra superior de la tarjeta (título + paginador rápido): ~56px
    // - Barra de filtros de búsqueda (si aplica): ~80px
    // - Encabezado thead de la tabla: ~44px
    // - Pie de tabla con paginador inferior: ~48px
    // - Margen de seguridad: ~30px
    let offsetTotal = margenOffset
    if (tieneFiltros) offsetTotal += 75
    if (tieneCabeceraExtra) offsetTotal += 50

    const espacioFilas = Math.max(180, alturaVentana - offsetTotal)
    const alturaPromedioFila = 46 // Altura en píxeles de una fila de tabla estándar

    const filasCalculadas = Math.floor(espacioFilas / alturaPromedioFila)
    return Math.max(minimoFilas, Math.min(maximoFilas, filasCalculadas))
  }

  // ----------------------------------------------------------------------------
  // CICLO DE VIDA (CLIENTE)
  // ----------------------------------------------------------------------------
  onMounted(() => {
    tamanioPagina.value = calcularFilasOptimas()

    const alRedimensionar = () => {
      const nuevoCalculo = calcularFilasOptimas()
      if (nuevoCalculo !== tamanioPagina.value) {
        tamanioPagina.value = nuevoCalculo
      }
    }

    window.addEventListener('resize', alRedimensionar)

    onUnmounted(() => {
      window.removeEventListener('resize', alRedimensionar)
    })
  })

  return {
    tamanioPagina,
    calcularFilasOptimas,
  }
}
