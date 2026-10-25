<template>
  <div class="space-y-6">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Próximos Cumpleaños"
      descripcion="Clientes que celebran su cumpleaños en los próximos 7 días a partir del corte (del 30 de abril al 7 de mayo de 2026)."
      badge-color="neutral"
    />

    <!-- Componente Tabla CRUD Reutilizable -->
    <TablaCrud
      v-model:busqueda="terminoBusqueda"
      titulo="Cumpleañeros de la Semana"
      placeholder-busqueda="Buscar cumpleañero por nombre o teléfono..."
      :columnas="columnas"
      :datos="datosPaginados"
      :cargando="cargando"
      :total-registros="cumpleanosFiltrados.length"
      :pagina-actual="paginaActual"
      :tamanio-pagina="tamanioPagina"
      mensaje-vacio="No se registraron cumpleaños en esta ventana de 7 días."
      @update:busqueda="paginaActual = 1"
      @cambiar-pagina="p => paginaActual = p"
      @cambiar-tamanio="t => { tamanioPagina = t; paginaActual = 1 }"
    >
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

      <template #fechaCumpleanos-cell="{ row }">
        <UBadge
          :color="row.original.fechaCumpleanos === '2026-04-30' ? 'neutral' : 'neutral'" variant="subtle"
          size="xs"
        >
          {{ row.original.fechaCumpleanos === '2026-04-30' ? '🎉 ¡Hoy (30 Abr)!' : row.original.fechaCumpleanos }}
        </UBadge>
      </template>

      <template #fechaNacimiento-cell="{ row }">
        <span class="font-mono text-xs text-neutral-600">{{ row.original.fechaNacimiento || 'N/D' }}</span>
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
// Vista Próximos Cumpleaños · pages/admin/cumpleanios.vue
// Listado de clientes que cumplen años en ventana de 7 días usando CabeceraPagina y TablaCrud
// ==============================================================================

// ------------------------------------------------------------------------------
// METADATOS Y LAYOUT
// ------------------------------------------------------------------------------
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  alias: ['/admin/cumpleanos'],
})

// ------------------------------------------------------------------------------
// ESTADO Y PAGINACIÓN ADAPTADA A PANTALLA
// ------------------------------------------------------------------------------
const terminoBusqueda = ref('')
const paginaActual = ref(1)
const { tamanioPagina } = usePaginacionPantalla({ margenOffset: 340 })

// ------------------------------------------------------------------------------
// CARGA DE CLIENTES CON CUMPLEAÑOS
// ------------------------------------------------------------------------------
const requestFetch = useRequestFetch()
const { data: respuestaCumpleanos, status } = await useAsyncData<any>('admin-cumpleanios-lista', () =>
  requestFetch('/api/admin/clientes?cumpleanos=true&limit=1000')
)

const cargando = computed(() => status.value === 'pending' && !respuestaCumpleanos.value)

const listaCumpleanos = computed(() => {
  const todos = respuestaCumpleanos.value?.datos || []
  return todos
    .filter((c: any) => c.fechaCumpleanos >= '2026-04-30' && c.fechaCumpleanos <= '2026-05-07')
    .sort((a: any, b: any) => (a.fechaCumpleanos > b.fechaCumpleanos ? 1 : -1))
})

// Filtrado reactivo por término de búsqueda
const cumpleanosFiltrados = computed(() => {
  if (!terminoBusqueda.value.trim()) return listaCumpleanos.value
  const t = terminoBusqueda.value.toLowerCase().trim()
  return listaCumpleanos.value.filter((c: any) =>
    c.nombre?.toLowerCase().includes(t) ||
    c.telefono?.toLowerCase().includes(t) ||
    String(c.id).includes(t)
  )
})

const datosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * tamanioPagina.value
  return cumpleanosFiltrados.value.slice(inicio, inicio + tamanioPagina.value)
})

// ------------------------------------------------------------------------------
// DEFINICIÓN DE COLUMNAS PARA UTable
// ------------------------------------------------------------------------------
const columnas = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'nombre', header: 'Cliente' },
  { accessorKey: 'fechaCumpleanos', header: 'Cumpleaños' },
  { accessorKey: 'fechaNacimiento', header: 'Año Nac.' },
  { accessorKey: 'telefono', header: 'Teléfono' },
  { accessorKey: 'nivel', header: 'Nivel' },
  { accessorKey: 'puntosDisponibles', header: 'Puntos Disponibles' },
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
