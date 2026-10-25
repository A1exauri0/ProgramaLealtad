<template>
  <div class="space-y-6">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Directorio de Clientes"
      descripcion="Clientes registrados y sincronizados desde la tienda en línea con métricas al corte del 30 de abril de 2026."
    />

    <!-- Componente CRUD Tabla Reutilizable -->
    <TablaCrud
      v-model:busqueda="busquedaTexto"
      titulo="Listado de Clientes"
      placeholder-busqueda="Buscar por ID, nombre, correo o teléfono..."
      :columnas="columnas"
      :datos="respuestaClientes?.datos || []"
      :cargando="cargando"
      :total-registros="totalRegistros"
      :pagina-actual="paginaActual"
      :tamanio-pagina="limitePorPagina"
      @update:busqueda="() => { paginaActual = 1; aplicarFiltros() }"
      @cambiar-pagina="cambiarPagina"
      @cambiar-tamanio="cambiarTamanio"
    >
      <!-- Slot de Filtros Adicionales en la Barra de la Tabla -->
      <template #filtros>
        <div class="flex items-center gap-2">
          <!-- Filtro por Nivel -->
          <select
            v-model="filtroNivel"
            class="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900"
            @change="aplicarFiltros"
          >
            <option value="">Todos los niveles</option>
            <option value="Bronce">Bronce</option>
            <option value="Plata">Plata</option>
            <option value="Oro">Oro</option>
          </select>

          <!-- Filtro por Riesgo -->
          <select
            v-model="filtroRiesgo"
            class="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900"
            @change="aplicarFiltros"
          >
            <option value="">Todos los estados</option>
            <option value="true">En riesgo</option>
            <option value="false">Sin riesgo</option>
          </select>
        </div>
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

      <template #puntosDisponibles-cell="{ row }">
        <span class="font-bold text-neutral-900">
          {{ formatearEntero(row.original.puntosDisponibles) }} pts
        </span>
      </template>

      <template #gasto12m-cell="{ row }">
        <span v-if="puedeVerMontos && row.original.gasto12m" class="font-mono text-xs font-semibold text-neutral-900">
          ${{ formatearMonto(row.original.gasto12m) }} MXN
        </span>
        <span v-else-if="!puedeVerMontos" class="text-xs text-neutral-400 italic">
          🔒 Enmascarado
        </span>
        <span v-else class="text-xs text-neutral-400">$0.00</span>
      </template>

      <template #enRiesgo-cell="{ row }">
        <UBadge v-if="row.original.enRiesgo" color="warning" variant="subtle" size="xs">
          En Riesgo ({{ row.original.diasSinActividad }}d)
        </UBadge>
        <UBadge v-else color="success" variant="subtle" size="xs">
          Activo
        </UBadge>
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
// Vista Directorio de Clientes · pages/admin/clientes/index.vue
// Listado paginado con búsqueda por campos, filtros y componente TablaCrud adaptado a pantalla
// ==============================================================================

// ------------------------------------------------------------------------------
// METADATOS Y LAYOUT
// ------------------------------------------------------------------------------
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

// ------------------------------------------------------------------------------
// COMPOSABLES Y ESTADO REACTIVO
// ------------------------------------------------------------------------------
const route = useRoute()
const router = useRouter()
const { usuario } = useAuth()

// Cálculo de filas según la pantalla disponible
const { tamanioPagina: filasPantalla } = usePaginacionPantalla({ tieneFiltros: true, margenOffset: 360 })

const busquedaTexto = ref((route.query.q as string) || '')
const filtroNivel = ref((route.query.nivel as string) || '')
const filtroRiesgo = ref((route.query.riesgo as string) || '')
const paginaActual = ref(Number(route.query.page) || 1)
const limitePorPagina = ref(Number(route.query.limit) || filasPantalla.value)

// Sincronizar el tamaño si la pantalla detecta otro número óptimo
watch(filasPantalla, (nuevoTam) => {
  if (!route.query.limit) {
    limitePorPagina.value = nuevoTam
  }
})

// ------------------------------------------------------------------------------
// COMPUTADAS
// ------------------------------------------------------------------------------
const puedeVerMontos = computed(() => {
  return usuario.value?.permisos?.includes('ver_montos_financieros') ?? false
})

// ------------------------------------------------------------------------------
// CARGA REACTIVA DE DATOS
// ------------------------------------------------------------------------------
const urlConsulta = computed(() => {
  const params = new URLSearchParams()
  params.set('page', String(paginaActual.value))
  params.set('limit', String(limitePorPagina.value))
  if (busquedaTexto.value) params.set('q', busquedaTexto.value)
  if (filtroNivel.value) params.set('nivel', filtroNivel.value)
  if (filtroRiesgo.value) params.set('riesgo', filtroRiesgo.value)
  return `/api/admin/clientes?${params.toString()}`
})

const requestFetch = useRequestFetch()
const { data: respuestaClientes, status } = await useAsyncData<any>(
  'admin-clientes-lista',
  () => requestFetch(urlConsulta.value),
  {
    watch: [urlConsulta],
  }
)

const cargando = computed(() => status.value === 'pending' && !respuestaClientes.value)
const totalRegistros = computed(() => respuestaClientes.value?.meta?.total || 0)

// ------------------------------------------------------------------------------
// DEFINICIÓN DE COLUMNAS PARA UTable
// ------------------------------------------------------------------------------
const columnas = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'nombre', header: 'Cliente' },
  { accessorKey: 'telefono', header: 'Teléfono' },
  { accessorKey: 'nivel', header: 'Nivel' },
  { accessorKey: 'puntosDisponibles', header: 'Puntos Disponibles' },
  { accessorKey: 'gasto12m', header: 'Gasto 12M' },
  { accessorKey: 'enRiesgo', header: 'Riesgo' },
  { accessorKey: 'acciones', header: 'Acción' },
]

// ------------------------------------------------------------------------------
// MÉTODOS Y ACCIONES
// ------------------------------------------------------------------------------
function aplicarFiltros() {
  paginaActual.value = 1
  actualizarUrl()
}

function cambiarPagina(nuevaPagina: number) {
  paginaActual.value = nuevaPagina
  actualizarUrl()
}

function cambiarTamanio(nuevoTamanio: number) {
  limitePorPagina.value = nuevoTamanio
  paginaActual.value = 1
  actualizarUrl()
}

function actualizarUrl() {
  router.push({
    query: {
      page: String(paginaActual.value),
      limit: String(limitePorPagina.value),
      q: busquedaTexto.value || undefined,
      nivel: filtroNivel.value || undefined,
      riesgo: filtroRiesgo.value || undefined,
    },
  })
}

function obtenerColorNivel(nivel: string): 'warning' | 'neutral' | 'primary' {
  if (nivel === 'Oro') return 'warning'
  if (nivel === 'Plata') return 'neutral'
  return 'warning'
}
</script>
