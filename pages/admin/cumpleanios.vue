<template>
  <div class="space-y-6">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Próximos Cumpleaños"
      descripcion="Clientes que celebran su cumpleaños en los próximos 7 días a partir del corte (del 30 de abril al 7 de mayo de 2026)."
      badge-color="neutral"
    >
      <template v-if="puedeExportarCsv" #acciones>
        <a
          href="/api/admin/reportes/cumpleanos-csv"
          target="_blank"
          download="proximos_cumpleanos.csv"
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
      <!-- Acciones en la barra de la tabla -->
      <template v-if="puedeExportarCsv" #acciones>
        <a
          href="/api/admin/reportes/cumpleanos-csv"
          target="_blank"
          download="proximos_cumpleanos.csv"
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
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-lucide-cake"
            @click="abrirMensajeModal(row.original)"
          >
            Felicitar
          </UButton>
          <NuxtLink
            :to="`/admin/clientes/${row.original.id}`"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <UIcon name="i-lucide-eye" class="size-3.5" />
            <span>Ver Ficha</span>
          </NuxtLink>
        </div>
      </template>
    </TablaCrud>

    <!-- Modal de Mensaje Sugerido con Cupón para Cumpleañero (MensajeCumpleanosModal) -->
    <UModal
      v-model:open="mostrarMensajeModal"
      title="Felicitación y Cupón de Cumpleaños"
      description="Mensaje sugerido listo para enviar por WhatsApp o Correo Electrónico."
    >
      <template #body>
        <div v-if="clienteSeleccionado" class="space-y-4">
          <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div class="font-bold flex items-center gap-1.5">
              <UIcon name="i-lucide-party-popper" class="size-4 text-emerald-600" />
              <span>Cumpleañero: {{ clienteSeleccionado.nombre }} ({{ clienteSeleccionado.fechaCumpleanos }})</span>
            </div>
            <div>
              Cupón de regalo: <span class="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-300">{{ codigoCuponCumple }}</span> ($200 MXN de regalo en su compra de cumpleaños)
            </div>
          </div>

          <UFormField label="Mensaje personalizado">
            <UTextarea
              v-model="textoMensajeSugerido"
              :rows="5"
              class="w-full font-sans text-xs"
            />
          </UFormField>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200">
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-copy"
              @click="copiarMensaje"
            >
              Copiar Texto
            </UButton>

            <div class="flex items-center gap-2">
              <a
                v-if="clienteSeleccionado.correo"
                :href="enlaceCorreo"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors"
              >
                <UIcon name="i-lucide-mail" class="size-4" />
                <span>Abrir Correo</span>
              </a>
              <a
                v-if="enlaceWhatsApp"
                :href="enlaceWhatsApp"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <UIcon name="i-lucide-send" class="size-4" />
                <span>Enviar por WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </template>
    </UModal>
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
const toast = useToast()
const { tienePermiso } = useAuth()
const puedeExportarCsv = computed(() => tienePermiso('exportar_reportes_csv'))

const terminoBusqueda = ref('')
const paginaActual = ref(1)
const { tamanioPagina } = usePaginacionPantalla({ margenOffset: 340 })

// Estado del Modal de Felicitación de Cumpleaños (MensajeCumpleanosModal)
const mostrarMensajeModal = ref(false)
const clienteSeleccionado = ref<any>(null)
const textoMensajeSugerido = ref('')
const codigoCuponCumple = computed(() => {
  if (!clienteSeleccionado.value) return 'FELIZ-CUMPLE'
  return `CUMPLE200-C${clienteSeleccionado.value.id}`
})

function abrirMensajeModal(cliente: any) {
  clienteSeleccionado.value = cliente
  const puntosStr = formatearEntero(cliente.puntosDisponibles)
  textoMensajeSugerido.value = `🎂 ¡Muchas felicidades por tu cumpleaños, ${cliente.nombre}! 🎉 En nuestra tienda queremos celebrar contigo (${cliente.fechaCumpleanos}). Por ser miembro Nivel ${cliente.nivel} (con ${puntosStr} puntos acumulados), te regalamos el cupón especial ${codigoCuponCumple.value} por $200 MXN de descuento en tu compra de cumpleaños. ¡Que pases un excelente día!`
  mostrarMensajeModal.value = true
}

const enlaceWhatsApp = computed(() => {
  if (!clienteSeleccionado.value?.telefono) return ''
  const digitos = String(clienteSeleccionado.value.telefono).replace(/\D/g, '')
  if (!digitos) return ''
  return `https://wa.me/${digitos}?text=${encodeURIComponent(textoMensajeSugerido.value)}`
})

const enlaceCorreo = computed(() => {
  if (!clienteSeleccionado.value?.correo) return ''
  const asunto = encodeURIComponent(`🎂 ¡Feliz cumpleaños, ${clienteSeleccionado.value.nombre}! Un regalo especial para ti`)
  const cuerpo = encodeURIComponent(textoMensajeSugerido.value)
  return `mailto:${clienteSeleccionado.value.correo}?subject=${asunto}&body=${cuerpo}`
})

async function copiarMensaje() {
  try {
    await navigator.clipboard.writeText(textoMensajeSugerido.value)
    toast.add({ title: 'Mensaje copiado', description: 'La felicitación de cumpleaños se copió al portapapeles.', color: 'success' })
  } catch {
    toast.add({ title: 'Error', description: 'No se pudo copiar automáticamente.', color: 'error' })
  }
}

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
