<template>
  <div class="space-y-6">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Gestión de Canjes"
      descripcion="Supervisión de canjes realizados por clientes, entrega de productos y control de cupones de descuento."
    />

    <!-- Componente CRUD Tabla Reutilizable con Buscador Integrado y Filtros -->
    <TablaCrud
      v-model:busqueda="terminoBusqueda"
      titulo="Canjes de Recompensas"
      placeholder-busqueda="Buscar por cliente, correo o recompensa..."
      :columnas="columnas"
      :datos="datosPaginados"
      :cargando="cargando"
      :total-registros="canjesFiltrados.length"
      :pagina-actual="paginaActual"
      :tamanio-pagina="tamanioPagina"
      :mostrar-boton-crear="false"
      @update:busqueda="paginaActual = 1"
      @cambiar-pagina="p => paginaActual = p"
      @cambiar-tamanio="t => { tamanioPagina = t; paginaActual = 1 }"
    >
      <!-- Filtros en la Barra Superior Integrada -->
      <template #filtros>
        <div class="flex items-center gap-2">
          <!-- Filtro por Estatus -->
          <USelectMenu
            v-model="filtroEstatus"
            :items="opcionesEstatus"
            value-key="value"
            label-key="label"
            :search-input="false"
            :ui="{ value: 'text-neutral-900 font-medium', item: 'text-neutral-900 font-medium' }"
            size="sm"
            class="w-44"
            @update:model-value="paginaActual = 1"
          />

          <!-- Filtro por Tipo de Recompensa -->
          <USelectMenu
            v-model="filtroTipo"
            :items="opcionesTipo"
            value-key="value"
            label-key="label"
            :search-input="false"
            :ui="{ value: 'text-neutral-900 font-medium', item: 'text-neutral-900 font-medium' }"
            size="sm"
            class="w-44"
            @update:model-value="paginaActual = 1"
          />
        </div>
      </template>

      <!-- Slot para ID del Canje -->
      <template #id-cell="{ row }">
        <span class="font-mono text-xs font-bold text-neutral-500">#{{ row.original.id }}</span>
      </template>

      <!-- Slot para Información del Cliente -->
      <template #cliente-cell="{ row }">
        <div class="flex flex-col">
          <NuxtLink
            :to="`/admin/clientes/${row.original.clienteId}`"
            class="font-semibold text-neutral-900 hover:text-primary-600 transition-colors text-xs flex items-center gap-1"
          >
            <span>{{ row.original.clienteNombre }}</span>
            <UIcon name="i-lucide-external-link" class="size-3 text-neutral-400" />
          </NuxtLink>
          <span class="text-[11px] text-neutral-500">{{ row.original.clienteCorreo || 'Sin correo' }}</span>
        </div>
      </template>

      <!-- Slot para Recompensa Canjeada -->
      <template #recompensa-cell="{ row }">
        <div class="flex items-center gap-2.5">
          <div
            v-if="row.original.recompensaFotoUrl"
            class="size-8 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0"
          >
            <img :src="row.original.recompensaFotoUrl" alt="Foto" class="w-full h-full object-cover" />
          </div>
          <div>
            <div class="font-medium text-xs text-neutral-900">{{ row.original.recompensaNombre }}</div>
            <UBadge
              :color="row.original.recompensaTipo === 'descuento' ? 'neutral' : 'neutral'"
              variant="subtle"
              size="xs"
              class="mt-0.5"
            >
              <UIcon
                :name="row.original.recompensaTipo === 'descuento' ? 'i-lucide-ticket-percent' : 'i-lucide-package'"
                class="size-3 mr-1"
              />
              {{ row.original.recompensaTipo === 'descuento' ? 'Cupón' : 'Producto' }}
            </UBadge>
          </div>
        </div>
      </template>

      <!-- Slot para Puntos Gastados -->
      <template #puntosGastados-cell="{ row }">
        <span class="font-bold text-xs text-neutral-900 font-mono bg-neutral-100 px-2 py-0.5 rounded-md">
          {{ formatearEntero(row.original.puntosGastados) }} pts
        </span>
      </template>

      <!-- Slot para Estatus del Canje -->
      <template #estatus-cell="{ row }">
        <UBadge :color="obtenerColorEstatus(row.original.estatus)" variant="subtle" size="xs">
          {{ obtenerTextoEstatus(row.original.estatus) }}
        </UBadge>
      </template>

      <!-- Slot para Cupón / Código de Descuento -->
      <template #cupon-cell="{ row }">
        <div v-if="row.original.cuponCodigo" class="flex items-center gap-1.5">
          <code class="font-mono text-xs font-bold bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded">
            {{ row.original.cuponCodigo }}
          </code>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-copy"
            title="Copiar cupón"
            @click="copiarTexto(row.original.cuponCodigo)"
          />
        </div>
        <span v-else class="text-xs text-neutral-400">N/A</span>
      </template>

      <!-- Slot para Fecha de Canje -->
      <template #fechaCanje-cell="{ row }">
        <span class="text-xs text-neutral-600 font-mono">{{ formatearFecha(row.original.fechaCanje) }}</span>
      </template>

      <!-- Slot para Acciones de Fila -->
      <template #acciones-cell="{ row }">
        <div class="flex items-center justify-end gap-1.5">
          <!-- Botón Ver Detalles (Verde) -->
          <UButton
            color="success"
            variant="subtle"
            size="xs"
            icon="i-lucide-eye"
            title="Ver detalles del canje"
            @click="abrirDetallesModal(row.original)"
          />

          <!-- Botón Entregar Producto (Verde) -->
          <UButton
            v-if="tienePermiso('gestionar_canjes') && row.original.estatus === 'pendiente'"
            color="success"
            variant="solid"
            size="xs"
            icon="i-lucide-check-check"
            title="Marcar como entregado"
            @click="confirmarEntrega(row.original)"
          />

          <!-- Botón Cancelar Canje (Rojo) -->
          <UButton
            v-if="tienePermiso('gestionar_canjes') && row.original.estatus === 'pendiente'"
            color="error"
            variant="subtle"
            size="xs"
            icon="i-lucide-ban"
            title="Cancelar canje y devolver puntos"
            @click="abrirCancelarModal(row.original)"
          />
        </div>
      </template>
    </TablaCrud>

    <!-- Modal: Detalles del Canje (DetallesModal) -->
    <div
      v-if="mostrarDetallesModal && canjeSeleccionado"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="mostrarDetallesModal = false"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 border border-neutral-200">
        <div class="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-ticket" class="size-5 text-neutral-800" />
            <h3 class="font-bold text-lg text-neutral-900">
              Detalle del Canje #{{ canjeSeleccionado.id }}
            </h3>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-x"
            @click="mostrarDetallesModal = false"
          />
        </div>

        <div class="space-y-4 text-xs">
          <!-- Estado y Puntos -->
          <div class="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
            <div>
              <span class="text-neutral-400 block mb-1">Estatus Actual</span>
              <UBadge :color="obtenerColorEstatus(canjeSeleccionado.estatus)" variant="subtle" size="xs">
                {{ obtenerTextoEstatus(canjeSeleccionado.estatus) }}
              </UBadge>
            </div>
            <div>
              <span class="text-neutral-400 block mb-1">Puntos Gastados</span>
              <span class="font-mono font-bold text-neutral-900 text-sm">
                {{ formatearEntero(canjeSeleccionado.puntosGastados) }} pts
              </span>
            </div>
          </div>

          <!-- Información del Cliente -->
          <div class="space-y-1.5 p-3 rounded-xl border border-neutral-200">
            <span class="font-semibold text-neutral-700 block">Cliente Solicitante</span>
            <div class="flex justify-between">
              <span class="text-neutral-500">Nombre:</span>
              <span class="font-medium text-neutral-900">{{ canjeSeleccionado.clienteNombre }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-neutral-500">Correo:</span>
              <span class="font-medium text-neutral-900">{{ canjeSeleccionado.clienteCorreo || 'N/D' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-neutral-500">Nivel Lealtad:</span>
              <UBadge color="neutral" variant="subtle" size="xs">{{ canjeSeleccionado.clienteNivel }}</UBadge>
            </div>
          </div>

          <!-- Información de la Recompensa -->
          <div class="space-y-1.5 p-3 rounded-xl border border-neutral-200">
            <span class="font-semibold text-neutral-700 block">Recompensa Seleccionada</span>
            <div class="flex justify-between">
              <span class="text-neutral-500">Beneficio:</span>
              <span class="font-medium text-neutral-900">{{ canjeSeleccionado.recompensaNombre }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-neutral-500">Tipo:</span>
              <span class="font-medium text-neutral-900">
                {{ canjeSeleccionado.recompensaTipo === 'descuento' ? 'Cupón de Descuento' : 'Producto Físico' }}
              </span>
            </div>
          </div>

          <!-- Información del Cupón si aplica -->
          <div v-if="canjeSeleccionado.cuponCodigo" class="space-y-1.5 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span class="font-semibold text-neutral-700 block">Cupón Asociado</span>
            <div class="flex justify-between items-center">
              <span class="text-neutral-500">Código:</span>
              <div class="flex items-center gap-1.5">
                <code class="font-mono font-bold bg-white px-2 py-0.5 rounded border border-neutral-200">
                  {{ canjeSeleccionado.cuponCodigo }}
                </code>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-copy"
                  @click="copiarTexto(canjeSeleccionado.cuponCodigo)"
                />
              </div>
            </div>
            <div class="flex justify-between">
              <span class="text-neutral-500">Estado del Cupón:</span>
              <span class="font-medium uppercase">{{ canjeSeleccionado.cuponEstatus }}</span>
            </div>
            <div v-if="canjeSeleccionado.cuponVencimiento" class="flex justify-between">
              <span class="text-neutral-500">Vigencia hasta:</span>
              <span class="font-mono text-neutral-700">{{ formatearFecha(canjeSeleccionado.cuponVencimiento) }}</span>
            </div>
          </div>

          <!-- Trazabilidad de Fechas -->
          <div class="space-y-1 text-[11px] text-neutral-400 pt-2 border-t border-neutral-100">
            <div class="flex justify-between">
              <span>Fecha de Canje:</span>
              <span class="font-mono text-neutral-600">{{ formatearFecha(canjeSeleccionado.fechaCanje) }}</span>
            </div>
            <div v-if="canjeSeleccionado.fechaEntrega" class="flex justify-between">
              <span>Fecha de Entrega:</span>
              <span class="font-mono text-neutral-600">{{ formatearFecha(canjeSeleccionado.fechaEntrega) }}</span>
            </div>
            <div v-if="canjeSeleccionado.motivoCancelacion" class="mt-2 p-2 bg-red-50 text-red-700 rounded-lg">
              <span class="font-bold block mb-0.5">Motivo de Cancelación:</span>
              <span>{{ canjeSeleccionado.motivoCancelacion }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
          <UButton color="neutral" variant="outline" size="sm" @click="mostrarDetallesModal = false">
            Cerrar
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal: Cancelar Canje (CancelarModal) -->
    <div
      v-if="mostrarCancelarModal && canjeACancelar"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="mostrarCancelarModal = false"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-neutral-200">
        <div class="flex items-center gap-3 text-red-600">
          <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-ban" class="size-6" />
          </div>
          <div>
            <h3 class="font-bold text-neutral-900 text-base">Cancelar Canje #{{ canjeACancelar.id }}</h3>
            <p class="text-xs text-neutral-500">Devolución automática de puntos de lealtad</p>
          </div>
        </div>

        <p class="text-xs text-neutral-600 leading-relaxed">
          Esta acción marcará el canje como cancelado, reintegrará
          <strong class="text-neutral-900 font-mono">{{ formatearEntero(canjeACancelar.puntosGastados) }} puntos</strong>
          al saldo del cliente
          <strong class="text-neutral-900">({{ canjeACancelar.clienteNombre }})</strong>
          y restaurará el stock de la recompensa si aplica.
        </p>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-neutral-700">Motivo de la cancelación *</label>
          <UTextarea
            v-model="motivoCancelacion"
            placeholder="Ejemplo: Solicitud del cliente por error de selección / Falta de stock físico..."
            :rows="3"
            class="w-full"
          />
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="cancelandoCanje"
            @click="mostrarCancelarModal = false"
          >
            Volver
          </UButton>
          <UButton
            color="error"
            variant="solid"
            size="sm"
            :loading="cancelandoCanje"
            :disabled="!motivoCancelacion.trim() || motivoCancelacion.trim().length < 3"
            @click="ejecutarCancelacion"
          >
            Confirmar Cancelación
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista de Gestión de Canjes · pages/admin/canjes.vue
// Administración de canjes, control de entrega y reversión de transacciones
// ==============================================================================

// ------------------------------------------------------------------------------
// IMPORTACIONES DE FORMATO Y UTILIDADES
// ------------------------------------------------------------------------------
import { formatearEntero } from '~/utils/formato'

// ------------------------------------------------------------------------------
// METADATOS Y LAYOUT
// ------------------------------------------------------------------------------
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

// ------------------------------------------------------------------------------
// TIPOS Y MODELOS
// ------------------------------------------------------------------------------
interface CanjeRegistro {
  id: number
  clienteId: number
  clienteNombre: string
  clienteCorreo: string | null
  clienteNivel: string
  recompensaId: number
  recompensaNombre: string
  recompensaTipo: 'producto' | 'descuento'
  recompensaFotoUrl: string | null
  puntosGastados: number
  estatus: 'pendiente' | 'entregado' | 'cancelado'
  fechaCanje: string
  fechaEntrega: string | null
  motivoCancelacion: string | null
  actualizadoEn: string
  cuponId: number | null
  cuponCodigo: string | null
  cuponEstatus: string | null
  cuponVencimiento: string | null
  cuponDescuentoTipo: string | null
  cuponDescuentoValor: string | null
}

// ------------------------------------------------------------------------------
// COMPOSABLES Y ESTADO REACTIVO
// ------------------------------------------------------------------------------
const toast = useToast()
const { tienePermiso } = useAuth()
const requestFetch = useRequestFetch()

// Paginación y búsqueda
const terminoBusqueda = ref('')
const paginaActual = ref(1)
const tamanioPagina = ref(10)

// Filtros
const filtroEstatus = ref<'todos' | 'pendiente' | 'entregado' | 'cancelado'>('todos')
const filtroTipo = ref<'todos' | 'producto' | 'descuento'>('todos')

const opcionesEstatus = [
  { label: 'Todos los estados', value: 'todos' },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Entregados', value: 'entregado' },
  { label: 'Cancelados', value: 'cancelado' },
]

const opcionesTipo = [
  { label: 'Todos los tipos', value: 'todos' },
  { label: 'Productos físicos', value: 'producto' },
  { label: 'Cupones descuento', value: 'descuento' },
]

// Modales y selección
const canjeSeleccionado = ref<CanjeRegistro | null>(null)
const mostrarDetallesModal = ref(false)

const canjeACancelar = ref<CanjeRegistro | null>(null)
const mostrarCancelarModal = ref(false)
const motivoCancelacion = ref('')
const cancelandoCanje = ref(false)

// ------------------------------------------------------------------------------
// CARGA ASÍNCRONA DE DATOS
// ------------------------------------------------------------------------------
const { data: respuestaApi, status, refresh: refrescarCanjes } = await useAsyncData<{
  ok: boolean
  canjes: CanjeRegistro[]
  total: number
}>('admin-canjes-catalogo', () => requestFetch('/api/admin/canjes'))

const cargando = computed(() => status.value === 'pending')

const listaCanjes = computed<CanjeRegistro[]>(() => {
  return respuestaApi.value?.canjes || []
})

// ------------------------------------------------------------------------------
// COLUMNAS PARA TablaCrud
// ------------------------------------------------------------------------------
const columnas = [
  { accessorKey: 'id', header: '#' },
  { accessorKey: 'cliente', header: 'Cliente' },
  { accessorKey: 'recompensa', header: 'Recompensa' },
  { accessorKey: 'puntosGastados', header: 'Puntos' },
  { accessorKey: 'estatus', header: 'Estatus' },
  { accessorKey: 'cupon', header: 'Cupón' },
  { accessorKey: 'fechaCanje', header: 'Fecha Canje' },
  { accessorKey: 'acciones', header: 'Acciones' },
]

// ------------------------------------------------------------------------------
// COMPUTADAS DE FILTRADO Y PAGINACIÓN
// ------------------------------------------------------------------------------
const canjesFiltrados = computed(() => {
  let resultado = listaCanjes.value

  // Filtro por estatus
  if (filtroEstatus.value !== 'todos') {
    resultado = resultado.filter(c => c.estatus === filtroEstatus.value)
  }

  // Filtro por tipo
  if (filtroTipo.value !== 'todos') {
    resultado = resultado.filter(c => c.recompensaTipo === filtroTipo.value)
  }

  // Búsqueda en memoria
  if (terminoBusqueda.value.trim()) {
    const term = terminoBusqueda.value.toLowerCase().trim()
    resultado = resultado.filter((c) => {
      return (
        c.clienteNombre.toLowerCase().includes(term) ||
        (c.clienteCorreo && c.clienteCorreo.toLowerCase().includes(term)) ||
        c.recompensaNombre.toLowerCase().includes(term) ||
        (c.cuponCodigo && c.cuponCodigo.toLowerCase().includes(term)) ||
        String(c.id).includes(term)
      )
    })
  }

  return resultado
})

const datosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * tamanioPagina.value
  return canjesFiltrados.value.slice(inicio, inicio + tamanioPagina.value)
})

// ------------------------------------------------------------------------------
// ACCIONES Y MÉTODOS
// ------------------------------------------------------------------------------
function abrirDetallesModal(canje: CanjeRegistro) {
  canjeSeleccionado.value = canje
  mostrarDetallesModal.value = true
}

async function confirmarEntrega(canje: CanjeRegistro) {
  try {
    const res = await $fetch<{ ok: boolean, mensaje: string }>(`/api/admin/canjes/${canje.id}`, {
      method: 'PATCH',
      body: { accion: 'entregar' },
    })
    toast.add({
      title: 'Canje Entregado',
      description: res.mensaje,
      color: 'success',
    })
    await refrescarCanjes()
  } catch (error: any) {
    toast.add({
      title: 'Error al entregar',
      description: error.data?.statusMessage || error.message || 'No se pudo actualizar el canje.',
      color: 'error',
    })
  }
}

function abrirCancelarModal(canje: CanjeRegistro) {
  canjeACancelar.value = canje
  motivoCancelacion.value = ''
  mostrarCancelarModal.value = true
}

async function ejecutarCancelacion() {
  if (!canjeACancelar.value || !motivoCancelacion.value.trim()) return

  cancelandoCanje.value = true
  try {
    const res = await $fetch<{ ok: boolean, mensaje: string }>(`/api/admin/canjes/${canjeACancelar.value.id}`, {
      method: 'PATCH',
      body: {
        accion: 'cancelar',
        motivoCancelacion: motivoCancelacion.value.trim(),
      },
    })

    toast.add({
      title: 'Canje Cancelado y Puntos Devueltos',
      description: res.mensaje,
      color: 'success',
    })

    mostrarCancelarModal.value = false
    canjeACancelar.value = null
    motivoCancelacion.value = ''
    await refrescarCanjes()
  } catch (error: any) {
    toast.add({
      title: 'Error al cancelar canje',
      description: error.data?.statusMessage || error.message || 'No se pudo cancelar el canje.',
      color: 'error',
    })
  } finally {
    cancelandoCanje.value = false
  }
}

async function copiarTexto(texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    toast.add({
      title: 'Copiado',
      description: `Código ${texto} copiado al portapapeles.`,
      color: 'success',
    })
  } catch {
    toast.add({
      title: 'Error al copiar',
      description: 'Por favor copia el código manualmente.',
      color: 'warning',
    })
  }
}

// ------------------------------------------------------------------------------
// UTILIDADES DE FORMATO Y ESTILO
// ------------------------------------------------------------------------------
function obtenerColorEstatus(estatus: string): 'warning' | 'success' | 'error' | 'neutral' {
  if (estatus === 'pendiente') return 'warning'
  if (estatus === 'entregado') return 'success'
  if (estatus === 'cancelado') return 'error'
  return 'neutral'
}

function obtenerTextoEstatus(estatus: string): string {
  if (estatus === 'pendiente') return 'Pendiente'
  if (estatus === 'entregado') return 'Entregado'
  if (estatus === 'cancelado') return 'Cancelado'
  return estatus
}

function formatearFecha(fechaStr: string | null): string {
  if (!fechaStr) return 'N/D'
  try {
    const f = new Date(fechaStr)
    if (isNaN(f.getTime())) return fechaStr
    const anio = f.getFullYear()
    const mes = String(f.getMonth() + 1).padStart(2, '0')
    const dia = String(f.getDate()).padStart(2, '0')
    return `${anio}-${mes}-${dia}`
  } catch {
    return fechaStr
  }
}
</script>
