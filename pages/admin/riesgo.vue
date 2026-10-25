<template>
  <div class="space-y-6">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Clientes en Riesgo"
      descripcion="Clientes con historial de compras que acumulan 90 o más días sin actividad al corte (30 de abril de 2026)."
    >
      <template v-if="puedeExportarCsv" #acciones>
        <a
          href="/api/admin/reportes/riesgo-csv" target="_blank" download="clientes_en_riesgo.csv"
          class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-xs"
        >
          <UIcon name="i-lucide-download" class="size-4" />
          <span>Descargar Reporte CSV</span>
        </a>
      </template>
    </CabeceraPagina>

    <!-- Componente Tabla CRUD Reutilizable -->
    <TablaCrud
      v-model:busqueda="terminoBusqueda"
      titulo="Listado de Inactividad"
      placeholder-busqueda="Buscar cliente en riesgo por nombre, correo o teléfono..."
      :columnas="columnas"
      :datos="datosPaginados"
      :cargando="cargando"
      :total-registros="clientesFiltrados.length"
      :pagina-actual="paginaActual"
      :tamanio-pagina="tamanioPagina"
      mensaje-vacio="¡Excelente noticia! No se detectaron clientes en riesgo de inactividad."
      @update:busqueda="paginaActual = 1"
      @cambiar-pagina="p => paginaActual = p"
      @cambiar-tamanio="t => { tamanioPagina = t; paginaActual = 1 }"
    >
      <!-- Acciones Integradas dentro de la Barra de la Tabla -->
      <template v-if="puedeExportarCsv" #acciones>
        <a
          href="/api/admin/reportes/riesgo-csv"
          target="_blank"
          download="clientes_en_riesgo.csv"
          class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-xs"
        >
          <UIcon name="i-lucide-download" class="size-4" />
          <span>Exportar CSV</span>
        </a>
      </template>
      <!-- Slots de Celdas Personalizadas -->
      <template #id-cell="{ row }">
        <span class="font-mono text-xs text-neutral-500 font-semibold">#{{ row.original.id }}</span>
      </template>

      <template #nombre-cell="{ row }">
        <div>
          <div class="font-semibold text-neutral-900">{{ row.original.nombre }}</div>
          <div class="text-xs text-neutral-500">{{ row.original.correo }}</div>
        </div>
      </template>

      <template #telefono-cell="{ row }">
        <span class="text-xs text-neutral-600">{{ row.original.telefono || 'N/D' }}</span>
      </template>

      <template #nivel-cell="{ row }">
        <UBadge :color="obtenerColorNivel(row.original.nivel)" variant="subtle" size="sm">
          {{ row.original.nivel }}
        </UBadge>
      </template>

      <template #puntos_disponibles-cell="{ row }">
        <span class="font-bold text-neutral-900">
          {{ formatearEntero(row.original.puntos_disponibles) }} pts
        </span>
      </template>

      <template #dias_sin_actividad-cell="{ row }">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
          {{ row.original.dias_sin_actividad }} días
        </span>
      </template>

      <template #acciones-cell="{ row }">
        <NuxtLink
          :to="`/admin/clientes/${row.original.id}`"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
        >
          <UIcon name="i-lucide-eye" class="size-3.5" />
          <span>Ver Ficha</span>
        </NuxtLink>
      </template>
    </TablaCrud>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista Clientes en Riesgo · pages/admin/riesgo.vue
// Listado de clientes inactivos con CabeceraPagina y TablaCrud adaptada a pantalla
// ==============================================================================

// ------------------------------------------------------------------------------
// METADATOS Y LAYOUT
// ------------------------------------------------------------------------------
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

// ------------------------------------------------------------------------------
// COMPOSABLES, ESTADO Y PAGINACIÓN ADAPTADA A PANTALLA
// ------------------------------------------------------------------------------
const { tienePermiso } = useAuth()
const puedeExportarCsv = computed(() => tienePermiso('exportar_reportes_csv'))

const terminoBusqueda = ref('')
const paginaActual = ref(1)
const { tamanioPagina } = usePaginacionPantalla({ margenOffset: 340 })

// ------------------------------------------------------------------------------
// CARGA DE CLIENTES EN RIESGO
// ------------------------------------------------------------------------------
const requestFetch = useRequestFetch()
const { data: respuestaClientes, status } = await useAsyncData<any>('admin-riesgo-lista', () =>
  requestFetch('/api/admin/clientes?riesgo=true&limit=1000')
)

const cargando = computed(() => status.value === 'pending' && !respuestaClientes.value)

const listaRiesgo = computed(() => {
  return (respuestaClientes.value?.datos || []).map((c: any) => ({
    id: c.id,
    nombre: c.nombre,
    correo: c.correo,
    telefono: c.telefono,
    nivel: c.nivel,
    puntos_disponibles: c.puntosDisponibles,
    dias_sin_actividad: c.diasSinActividad,
  }))
})

// Filtrado reactivo por término de búsqueda
const clientesFiltrados = computed(() => {
  if (!terminoBusqueda.value.trim()) return listaRiesgo.value
  const t = terminoBusqueda.value.toLowerCase().trim()
  return listaRiesgo.value.filter((c: any) =>
    c.nombre?.toLowerCase().includes(t) ||
    c.correo?.toLowerCase().includes(t) ||
    c.telefono?.toLowerCase().includes(t) ||
    String(c.id).includes(t)
  )
})

const datosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * tamanioPagina.value
  return clientesFiltrados.value.slice(inicio, inicio + tamanioPagina.value)
})

// ------------------------------------------------------------------------------
// DEFINICIÓN DE COLUMNAS PARA UTable
// ------------------------------------------------------------------------------
const columnas = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'nombre', header: 'Cliente' },
  { accessorKey: 'telefono', header: 'Teléfono' },
  { accessorKey: 'nivel', header: 'Nivel' },
  { accessorKey: 'puntos_disponibles', header: 'Puntos Disponibles' },
  { accessorKey: 'dias_sin_actividad', header: 'Días Inactivo' },
  { accessorKey: 'acciones', header: 'Acción' },
]

// ------------------------------------------------------------------------------
// UTILIDADES DE FORMATO
// ------------------------------------------------------------------------------
function obtenerColorNivel(nivel: string): 'warning' | 'neutral' | 'primary' {
  if (nivel === 'Oro') return 'warning'
  if (nivel === 'Plata') return 'neutral'
  return 'warning'
}
</script>
