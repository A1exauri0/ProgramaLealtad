<template>
  <div class="space-y-4">
    <!-- Contenedor Principal de la Tabla / Skeleton -->
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <!-- Barra Superior Integrada dentro de la Tabla: Buscador, Filtros y Botón Crear -->
      <div
        v-if="mostrarBuscador || mostrarBotonCrear || $slots.acciones || $slots.filtros"
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3.5 border-b border-neutral-200 bg-white"
      >
        <!-- Lado Izquierdo: Buscador y Filtros -->
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <UInput
            v-if="mostrarBuscador"
            :model-value="valorBusquedaActual"
            :placeholder="placeholderBusqueda"
            icon="i-lucide-search"
            class="w-full sm:max-w-xs min-w-[200px]"
            size="sm"
            @update:model-value="alActualizarBusqueda"
          >
            <template v-if="valorBusquedaActual" #trailing>
              <button
                type="button"
                class="text-neutral-400 hover:text-neutral-600 transition-colors"
                title="Limpiar búsqueda"
                @click="alLimpiarBusqueda"
              >
                <UIcon name="i-lucide-x" class="size-4" />
              </button>
            </template>
          </UInput>

          <slot name="filtros" />
        </div>

        <!-- Lado Derecho: Acciones y Botón de Crear Nuevo Registro dentro de la Tabla -->
        <div class="flex items-center justify-end gap-2 shrink-0">
          <slot name="acciones" />

          <!-- Botón de Crear Registro Integrado -->
          <UButton
            v-if="mostrarBotonCrear"
            color="neutral"
            variant="solid"
            size="sm"
            :icon="iconoBotonCrear"
            @click="$emit('crear')"
          >
            {{ textoBotonCrear }}
          </UButton>
        </div>
      </div>

      <!-- Altura contenida para que los registros quepan según la pantalla y no se extienda infinitamente -->
      <div class="overflow-x-auto max-h-[calc(100vh-340px)] min-h-[200px] overflow-y-auto relative">
        <!-- Estado de Carga con USkeleton (solo si está cargando y no hay datos previos) -->
        <div v-if="cargando && (!datos || datos.length === 0)" class="p-6 space-y-4">
          <!-- Skeleton de Cabecera -->
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div v-for="col in columnas" :key="String(col.accessorKey || col.key)" class="flex-1 px-2">
              <USkeleton class="h-4 w-20" />
            </div>
          </div>

          <!-- Skeleton de Filas -->
          <div
            v-for="i in filasSkeleton" :key="i"
            class="flex items-center justify-between py-2.5 border-b border-neutral-50"
          >
            <div v-for="col in columnas" :key="String(col.accessorKey || col.key)" class="flex-1 px-2">
              <USkeleton class="h-4 w-3/4" />
            </div>
          </div>
        </div>

        <!-- Tabla de Datos (UTable de Nuxt UI) con Thead Sticky -->
        <template v-else>
          <UTable
            :data="datos" :columns="columnas" :loading="cargando" class="w-full" :ui="{
              thead: 'border-b border-neutral-200 bg-neutral-50 sticky top-0 z-10 shadow-xs',
              th: 'py-3 px-4 text-xs font-bold text-neutral-900 uppercase tracking-wider text-left bg-neutral-50',
              td: 'py-2.5 px-4 text-sm text-neutral-800 border-b border-neutral-100',
            }"
          >
            <!-- Reenvío de slots de celdas personalizados excluyendo slots reservados -->
            <template
              v-for="nombreSlot in slotsDinamicos"
              :key="nombreSlot"
              #[nombreSlot]="slotProps"
            >
              <slot :name="nombreSlot" v-bind="slotProps || {}" />
            </template>

            <!-- Slot para celda de acciones: usa slot personalizado o botones de acción estándar -->
            <template #acciones-cell="{ row }">
              <slot v-if="$slots['acciones-cell']" name="acciones-cell" :row="row" />
              <div
                v-else-if="mostrarBotonVer || mostrarBotonEditar || mostrarBotonEliminar"
                class="flex items-center gap-1.5"
              >
                <!-- Botón Ver (Verde) -->
                <UButton
                  v-if="mostrarBotonVer"
                  :color="(colorBotonVer as any)"
                  :variant="(varianteBotonVer as any)"
                  size="xs"
                  :icon="iconoBotonVer"
                  :disabled="deshabilitarBotonVer ? deshabilitarBotonVer(row.original) : false"
                  @click="$emit('ver', row.original)"
                >
                  {{ textoBotonVer }}
                </UButton>

                <!-- Botón Editar (Amarillo) -->
                <UButton
                  v-if="mostrarBotonEditar"
                  :color="(colorBotonEditar as any)"
                  :variant="(varianteBotonEditar as any)"
                  size="xs"
                  :icon="iconoBotonEditar"
                  :disabled="deshabilitarBotonEditar ? deshabilitarBotonEditar(row.original) : false"
                  @click="$emit('editar', row.original)"
                >
                  {{ textoBotonEditar }}
                </UButton>

                <!-- Botón Eliminar (Rojo) -->
                <UButton
                  v-if="mostrarBotonEliminar"
                  :color="(colorBotonEliminar as any)"
                  :variant="(varianteBotonEliminar as any)"
                  size="xs"
                  :icon="iconoBotonEliminar"
                  :disabled="deshabilitarBotonEliminar ? deshabilitarBotonEliminar(row.original) : false"
                  @click="$emit('eliminar', row.original)"
                >
                  {{ textoBotonEliminar }}
                </UButton>
              </div>
            </template>
          </UTable>

          <!-- Estado Vacío cuando no hay registros y no está cargando -->
          <div v-if="!datos || datos.length === 0" class="py-12 text-center text-neutral-500 space-y-2">
            <UIcon name="i-lucide-inbox" class="size-8 mx-auto text-neutral-400" />
            <p class="text-sm font-medium">{{ mensajeVacio }}</p>
          </div>
        </template>
      </div>

      <!-- Pie de Tabla: Paginación Completa y Selector de Filas por Pantalla -->
      <template v-if="mostrarPaginacion" #footer>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <!-- Información y Selector de Filas -->
          <div class="flex items-center gap-3">
            <span>
              Mostrando página <strong>{{ paginaActual }}</strong> de <strong>{{ totalPaginasCalculado }}</strong>
              <span v-if="totalRegistros !== undefined"> ({{ totalRegistros }} en total)</span>
            </span>

            <div v-if="listaOpcionesTamanio.length" class="flex items-center gap-1.5 pl-3 border-l border-neutral-200">
              <span class="text-neutral-500">Filas / pág:</span>
              <select
                :value="tamanioPagina"
                class="px-2 py-1 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                @change="onCambioTamanio"
              >
                <option v-for="tam in listaOpcionesTamanio" :key="tam" :value="tam">
                  {{ tam }} filas
                </option>
              </select>
            </div>
          </div>

          <!-- Botones de Paginación Inferior -->
          <div class="flex items-center space-x-1.5">
            <button
              type="button"
              class="inline-flex items-center justify-center px-2.5 h-7 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              :disabled="paginaActual <= 1 || cargando" @click.prevent="irAPagina(paginaActual - 1)"
            >
              <UIcon name="i-lucide-chevron-left" class="size-3.5 mr-1" />
              Anterior
            </button>

            <!-- Páginas numéricas -->
            <button
              v-for="p in paginasVisibles" :key="p" type="button"
              class="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-semibold transition-colors"
              :class="p === paginaActual ? 'bg-neutral-900 text-white' : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'"
              @click.prevent="irAPagina(p)"
            >
              {{ p }}
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center px-2.5 h-7 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              :disabled="paginaActual >= totalPaginasCalculado || cargando"
              @click.prevent="irAPagina(paginaActual + 1)"
            >
              Siguiente
              <UIcon name="i-lucide-chevron-right" class="size-3.5 ml-1" />
            </button>
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Componente CRUD Tabla Reutilizable · TablaCrud.vue
// Integra UTable de Nuxt UI con Skeletons, paginación superior e inferior interactiva,
// contención vertical y cálculo dinámico de registros en base a la pantalla
// ==============================================================================

// ------------------------------------------------------------------------------
// PROPS Y TIPOS
// ------------------------------------------------------------------------------
interface ColumnaTabla {
  accessorKey?: string
  key?: string
  header?: string
  [key: string]: any
}

const props = withDefaults(
  defineProps<{
    titulo?: string
    descripcion?: string
    columnas: ColumnaTabla[]
    datos: any[]
    cargando?: boolean
    totalRegistros?: number
    paginaActual?: number
    tamanioPagina?: number
    opcionesTamanio?: number[]
    mostrarPaginacion?: boolean
    mensajeVacio?: string
    filasSkeleton?: number
    autoAjustarPantalla?: boolean
    mostrarBotonCrear?: boolean
    textoBotonCrear?: string
    iconoBotonCrear?: string
    // Buscador Integrado en la Tabla
    mostrarBuscador?: boolean
    placeholderBusqueda?: string
    busqueda?: string
    modelValue?: string
    // Acciones de fila: Ver (Verde)
    mostrarBotonVer?: boolean
    textoBotonVer?: string
    iconoBotonVer?: string
    colorBotonVer?: string
    varianteBotonVer?: string
    deshabilitarBotonVer?: (item: any) => boolean
    // Acciones de fila: Editar (Amarillo)
    mostrarBotonEditar?: boolean
    textoBotonEditar?: string
    iconoBotonEditar?: string
    colorBotonEditar?: string
    varianteBotonEditar?: string
    deshabilitarBotonEditar?: (item: any) => boolean
    // Acciones de fila: Eliminar (Rojo)
    mostrarBotonEliminar?: boolean
    textoBotonEliminar?: string
    iconoBotonEliminar?: string
    colorBotonEliminar?: string
    varianteBotonEliminar?: string
    deshabilitarBotonEliminar?: (item: any) => boolean
  }>(),
  {
    titulo: '',
    descripcion: '',
    cargando: false,
    totalRegistros: undefined,
    paginaActual: 1,
    tamanioPagina: 8,
    opcionesTamanio: () => [5, 8, 10, 15, 20, 25, 50],
    mostrarPaginacion: true,
    mensajeVacio: 'No se encontraron registros para mostrar.',
    filasSkeleton: 5,
    autoAjustarPantalla: true,
    // Botón Crear
    mostrarBotonCrear: false,
    textoBotonCrear: 'Nuevo Registro',
    iconoBotonCrear: 'i-lucide-plus',
    // Buscador Integrado
    mostrarBuscador: true,
    placeholderBusqueda: 'Buscar...',
    busqueda: undefined,
    modelValue: undefined,
    // Botón Ver (Verde por defecto)
    mostrarBotonVer: false,
    textoBotonVer: 'Ver',
    iconoBotonVer: 'i-lucide-eye',
    colorBotonVer: 'success',
    varianteBotonVer: 'subtle',
    deshabilitarBotonVer: undefined,
    // Botón Editar (Amarillo por defecto)
    mostrarBotonEditar: false,
    textoBotonEditar: 'Editar',
    iconoBotonEditar: 'i-lucide-pencil',
    colorBotonEditar: 'warning',
    varianteBotonEditar: 'subtle',
    deshabilitarBotonEditar: undefined,
    // Botón Eliminar (Rojo por defecto)
    mostrarBotonEliminar: false,
    textoBotonEliminar: 'Eliminar',
    iconoBotonEliminar: 'i-lucide-trash-2',
    colorBotonEliminar: 'error',
    varianteBotonEliminar: 'subtle',
    deshabilitarBotonEliminar: undefined,
  }
)

// ------------------------------------------------------------------------------
// EMITS
// ------------------------------------------------------------------------------
const emit = defineEmits<{
  (e: 'update:paginaActual', pagina: number): void
  (e: 'update:tamanioPagina', tamanio: number): void
  (e: 'cambiarPagina', pagina: number): void
  (e: 'cambiarTamanio', tamanio: number): void
  (e: 'crear'): void
  (e: 'update:busqueda', valor: string): void
  (e: 'update:modelValue', valor: string): void
  (e: 'buscar', valor: string): void
  (e: 'ver', item: any): void
  (e: 'editar', item: any): void
  (e: 'eliminar', item: any): void
}>()

// ------------------------------------------------------------------------------
// SLOTS DINÁMICOS FILTRADOS
// ------------------------------------------------------------------------------
const slots = useSlots()
const slotsDinamicos = computed(() => {
  return Object.keys(slots).filter(
    nombre => !['acciones-cell', 'acciones', 'filtros', 'footer', 'default'].includes(nombre)
  )
})

// ------------------------------------------------------------------------------
// ESTADO Y MÉTODOS DEL BUSCADOR INTEGRADO
// ------------------------------------------------------------------------------
const terminoBusquedaLocal = ref('')

const valorBusquedaActual = computed(() => {
  if (props.busqueda !== undefined) return props.busqueda
  if (props.modelValue !== undefined) return props.modelValue
  return terminoBusquedaLocal.value
})

function alActualizarBusqueda(nuevoValor: string) {
  terminoBusquedaLocal.value = nuevoValor
  emit('update:busqueda', nuevoValor)
  emit('update:modelValue', nuevoValor)
  emit('buscar', nuevoValor)
}

function alLimpiarBusqueda() {
  alActualizarBusqueda('')
}

// ------------------------------------------------------------------------------
// COMPUTADAS DE PAGINACIÓN
// ------------------------------------------------------------------------------
const totalPaginasCalculado = computed(() => {
  const tam = Math.max(1, props.tamanioPagina || 8)
  if (props.totalRegistros === undefined) {
    return Math.max(1, Math.ceil((props.datos?.length || 0) / tam))
  }
  return Math.max(1, Math.ceil(props.totalRegistros / tam))
})

const paginasVisibles = computed(() => {
  const total = totalPaginasCalculado.value
  const actual = props.paginaActual
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  let inicio = Math.max(1, actual - 2)
  let fin = Math.min(total, inicio + 4)
  if (fin - inicio < 4) {
    inicio = Math.max(1, fin - 4)
  }
  const paginas: number[] = []
  for (let i = inicio; i <= fin; i++) {
    paginas.push(i)
  }
  return paginas
})

const listaOpcionesTamanio = computed(() => {
  const base = [...props.opcionesTamanio]
  if (props.tamanioPagina && !base.includes(props.tamanioPagina)) {
    base.push(props.tamanioPagina)
    base.sort((a, b) => a - b)
  }
  return base
})

// ------------------------------------------------------------------------------
// MÉTODOS DE PAGINACIÓN
// ------------------------------------------------------------------------------
function irAPagina(nuevaPagina: number) {
  if (nuevaPagina < 1 || nuevaPagina > totalPaginasCalculado.value) return
  emit('update:paginaActual', nuevaPagina)
  emit('cambiarPagina', nuevaPagina)
}

function onCambioTamanio(evento: Event) {
  const target = evento.target as HTMLSelectElement
  const nuevoTamanio = Number(target.value)
  emit('update:tamanioPagina', nuevoTamanio)
  emit('cambiarTamanio', nuevoTamanio)
  irAPagina(1)
}

// ------------------------------------------------------------------------------
// AJUSTE AUTOMÁTICO AL TAMAÑO DE LA PANTALLA
// ------------------------------------------------------------------------------
onMounted(() => {
  if (!props.autoAjustarPantalla) return

  const alturaVentana = window.innerHeight
  // Descontar navbar, padding, cabecera de página y cabecera de tarjeta
  const espacioDisponible = Math.max(200, alturaVentana - 360)
  const filasEstimadas = Math.floor(espacioDisponible / 46)
  const filasOptimas = Math.max(5, Math.min(20, filasEstimadas))

  // Si el prop actual no coincide con el óptimo para esta pantalla, notificar
  if (filasOptimas !== props.tamanioPagina) {
    emit('update:tamanioPagina', filasOptimas)
    emit('cambiarTamanio', filasOptimas)
  }
})
</script>
