<template>
  <div class="space-y-6">
    <!-- Navegación de Regreso -->
    <div>
      <NuxtLink to="/admin/clientes" class="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 inline-flex items-center gap-1">
        &larr; Volver al directorio de clientes
      </NuxtLink>
    </div>

    <!-- Encabezado de la Ficha del Cliente -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
      <div class="flex items-center space-x-4">
        <div class="w-14 h-14 rounded-2xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-xl text-neutral-600 dark:text-neutral-300">
          {{ obtenerIniciales(detalleCliente?.cliente?.nombre) }}
        </div>
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-2xl font-bold tracking-tight">
              {{ detalleCliente?.cliente?.nombre }}
            </h1>
            <UBadge :color="obtenerColorNivel(detalleCliente?.cliente?.nivel)" variant="subtle" size="sm">
              {{ detalleCliente?.cliente?.nivel }}
            </UBadge>
            <UBadge v-if="detalleCliente?.cliente?.enRiesgo" color="warning" variant="subtle" size="xs">
              En Riesgo ({{ detalleCliente?.cliente?.diasSinActividad }} días inactivo)
            </UBadge>
          </div>
          <div class="text-xs text-neutral-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>ID:</strong> #{{ detalleCliente?.cliente?.id }}</span>
            <span><strong>Correo:</strong> {{ detalleCliente?.cliente?.correo || 'N/D' }}</span>
            <span><strong>Teléfono:</strong> {{ detalleCliente?.cliente?.telefono || 'N/D' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tarjetas de Información Rápida (KpiCards) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Puntos Disponibles -->
      <UCard>
        <div class="space-y-1">
          <span class="text-xs font-semibold uppercase text-neutral-500">Puntos Disponibles</span>
          <div class="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
            {{ formatearEntero(detalleCliente?.cliente?.puntosDisponibles) }} pts
          </div>
          <span class="text-xs text-neutral-500">Saldo listo para canje</span>
        </div>
      </UCard>

      <!-- Puntos Históricos -->
      <UCard>
        <div class="space-y-1">
          <span class="text-xs font-semibold uppercase text-neutral-500">Total Puntos Ganados</span>
          <div class="text-2xl font-extrabold text-neutral-800 dark:text-neutral-200">
            {{ formatearEntero(detalleCliente?.cliente?.puntos) }} pts
          </div>
          <span class="text-xs text-neutral-500">Acumulado histórico</span>
        </div>
      </UCard>

      <!-- Gasto Últimos 12 Meses (Protegido por Permiso) -->
      <UCard>
        <div class="space-y-1">
          <span class="text-xs font-semibold uppercase text-neutral-500">Gasto 12 Meses (MXN)</span>
          <div v-if="detalleCliente?.puedeVerMontos && detalleCliente?.cliente?.gasto12m" class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ${{ formatearMonto(detalleCliente?.cliente?.gasto12m) }}
          </div>
          <div v-else-if="!detalleCliente?.puedeVerMontos" class="text-sm font-semibold text-neutral-400 italic">
            🔒 Enmascarado (Sin permiso)
          </div>
          <div v-else class="text-2xl font-extrabold text-neutral-400">$0.00</div>
          <span class="text-xs text-neutral-500">Ventana: 01-May-2025 al 30-Abr-2026</span>
        </div>
      </UCard>

      <!-- Cuenta del Portal del Cliente -->
      <UCard>
        <div class="space-y-1">
          <span class="text-xs font-semibold uppercase text-neutral-500">Acceso Portal Autoservicio</span>
          <div class="text-lg font-bold">
            <UBadge :color="detalleCliente?.cuentaPortal?.estadoAcceso === 'activo' ? 'success' : 'neutral'" variant="subtle" size="sm">
              {{ detalleCliente?.cuentaPortal?.estadoAcceso === 'activo' ? 'Cuenta Activada' : 'Sin Acceso Activado' }}
            </UBadge>
          </div>
          <span class="text-xs text-neutral-500 block">
            Cumpleaños: {{ detalleCliente?.cliente?.fechaCumpleanos || detalleCliente?.cliente?.fechaNacimiento || 'N/D' }}
          </span>
        </div>
      </UCard>
    </div>

    <!-- Navegación de Pestañas de Detalle -->
    <div class="border-b border-neutral-200 dark:border-neutral-800 flex space-x-4">
      <button
        class="py-2.5 px-3 text-sm font-semibold border-b-2 transition-colors"
        :class="pestanaActiva === 'movimientos' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'"
        @click="pestanaActiva = 'movimientos'"
      >
        Movimientos de Puntos ({{ detalleCliente?.movimientos?.length || 0 }})
      </button>

      <button
        class="py-2.5 px-3 text-sm font-semibold border-b-2 transition-colors"
        :class="pestanaActiva === 'pedidos' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'"
        @click="pestanaActiva = 'pedidos'"
      >
        Pedidos ({{ detalleCliente?.pedidos?.length || 0 }})
      </button>

      <button
        class="py-2.5 px-3 text-sm font-semibold border-b-2 transition-colors"
        :class="pestanaActiva === 'pagos' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'"
        @click="pestanaActiva = 'pagos'"
      >
        Pagos ({{ detalleCliente?.pagos?.length || 0 }})
      </button>
    </div>

    <!-- Contenido de la Pestaña: Movimientos de Puntos -->
    <TablaCrud
      v-if="pestanaActiva === 'movimientos'"
      titulo="Historial de Movimientos de Puntos"
      :columnas="columnasMovimientos"
      :datos="detalleCliente?.movimientos || []"
      :mostrar-paginacion="false"
      mensaje-vacio="No se registran movimientos de puntos para este cliente."
    >
      <template #fecha-cell="{ row }">
        <span class="font-mono text-xs">{{ row.original.fecha }}</span>
      </template>

      <template #tipo-cell="{ row }">
        <UBadge :color="(row.original.puntos ?? 0) >= 0 ? 'success' : 'error'" variant="subtle" size="xs">
          {{ row.original.tipo }}
        </UBadge>
      </template>

      <template #referencia-cell="{ row }">
        <span class="text-xs font-mono text-neutral-600 dark:text-neutral-400">{{ row.original.referencia }}</span>
      </template>

      <template #origen-cell="{ row }">
        <span class="text-xs text-neutral-500">{{ row.original.origen }}</span>
      </template>

      <template #puntos-cell="{ row }">
        <div class="text-right font-bold" :class="(row.original.puntos ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'">
          {{ (row.original.puntos ?? 0) >= 0 ? '+' : '' }}{{ formatearEntero(row.original.puntos) }} pts
        </div>
      </template>
    </TablaCrud>

    <!-- Contenido de la Pestaña: Pedidos -->
    <TablaCrud
      v-if="pestanaActiva === 'pedidos'"
      titulo="Historial de Pedidos en Tienda"
      :columnas="columnasPedidos"
      :datos="detalleCliente?.pedidos || []"
      :mostrar-paginacion="false"
      mensaje-vacio="No hay pedidos registrados para este cliente."
    >
      <template #numeroOrden-cell="{ row }">
        <span class="font-mono font-semibold">#{{ row.original.numeroOrden }}</span>
      </template>

      <template #fechaLocal-cell="{ row }">
        <span class="text-xs text-neutral-600">{{ row.original.fechaLocal }}</span>
      </template>

      <template #estatus-cell="{ row }">
        <UBadge :color="row.original.estatus === 'delivered' ? 'success' : row.original.estatus === 'cancelled' ? 'error' : 'neutral'" variant="subtle" size="xs">
          {{ row.original.estatus }}
        </UBadge>
      </template>

      <template #estatusPago-cell="{ row }">
        <UBadge :color="row.original.estatusPago === 'paid' ? 'success' : 'neutral'" variant="subtle" size="xs">
          {{ row.original.estatusPago }}
        </UBadge>
      </template>

      <template #total-cell="{ row }">
        <div class="text-right font-mono text-xs font-semibold">
          <span v-if="detalleCliente?.puedeVerMontos && row.original.total">${{ formatearMonto(row.original.total) }}</span>
          <span v-else-if="!detalleCliente?.puedeVerMontos" class="text-neutral-400 italic">🔒 Enmascarado</span>
          <span v-else class="text-neutral-400">N/D</span>
        </div>
      </template>
    </TablaCrud>

    <!-- Contenido de la Pestaña: Pagos -->
    <TablaCrud
      v-if="pestanaActiva === 'pagos'"
      titulo="Registro de Transacciones de Pago"
      :columnas="columnasPagos"
      :datos="detalleCliente?.pagos || []"
      :mostrar-paginacion="false"
      mensaje-vacio="No se registran transacciones de pago para este cliente."
    >
      <template #id-cell="{ row }">
        <span class="font-mono text-xs">#{{ row.original.id }}</span>
      </template>

      <template #fechaLocal-cell="{ row }">
        <span class="text-xs text-neutral-600">{{ row.original.fechaLocal }}</span>
      </template>

      <template #moneda-cell="{ row }">
        <span class="font-semibold text-xs">{{ row.original.moneda }}</span>
      </template>

      <template #estatus-cell="{ row }">
        <UBadge :color="row.original.estatus === 'succeeded' ? 'success' : pgEstatusColor(row.original.estatus)" variant="subtle" size="xs">
          {{ row.original.estatus }}
        </UBadge>
      </template>

      <template #montoOriginal-cell="{ row }">
        <div class="text-right font-mono text-xs">
          <span v-if="detalleCliente?.puedeVerMontos && row.original.montoOriginal">{{ formatearMonto(row.original.montoOriginal) }} {{ row.original.moneda }}</span>
          <span v-else-if="!detalleCliente?.puedeVerMontos" class="text-neutral-400 italic">🔒 Enmascarado</span>
          <span v-else class="text-neutral-400">N/D</span>
        </div>
      </template>

      <template #montoMxn-cell="{ row }">
        <div class="text-right font-mono text-xs font-bold text-neutral-800">
          <span v-if="detalleCliente?.puedeVerMontos && row.original.montoMxn">${{ formatearMonto(row.original.montoMxn) }} MXN</span>
          <span v-else-if="!detalleCliente?.puedeVerMontos" class="text-neutral-400 italic">🔒 Enmascarado</span>
          <span v-else class="text-neutral-400">$0.00</span>
        </div>
      </template>
    </TablaCrud>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista Ficha del Cliente · pages/admin/clientes/[id].vue
// Detalle consolidado: datos, pedidos, pagos y movimientos de puntos
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
const clienteId = route.params.id as string

const pestanaActiva = ref<'movimientos' | 'pedidos' | 'pagos'>('movimientos')

// ------------------------------------------------------------------------------
// CARGA DE DATOS DE LA FICHA
// ------------------------------------------------------------------------------
const requestFetch = useRequestFetch()
const { data: detalleCliente } = await useAsyncData<any>(
  `admin-cliente-${clienteId}`,
  () => requestFetch(`/api/admin/clientes/${clienteId}`)
)

// ------------------------------------------------------------------------------
// DEFINICIÓN DE COLUMNAS PARA UTable
// ------------------------------------------------------------------------------
const columnasMovimientos = [
  { accessorKey: 'fecha', header: 'Fecha' },
  { accessorKey: 'tipo', header: 'Tipo Movimiento' },
  { accessorKey: 'referencia', header: 'Referencia' },
  { accessorKey: 'origen', header: 'Origen' },
  { accessorKey: 'puntos', header: 'Puntos' },
]

const columnasPedidos = [
  { accessorKey: 'numeroOrden', header: 'Orden #' },
  { accessorKey: 'fechaLocal', header: 'Fecha Local' },
  { accessorKey: 'estatus', header: 'Estatus Orden' },
  { accessorKey: 'estatusPago', header: 'Estatus Pago' },
  { accessorKey: 'total', header: 'Total' },
]

const columnasPagos = [
  { accessorKey: 'id', header: 'ID Pago' },
  { accessorKey: 'fechaLocal', header: 'Fecha' },
  { accessorKey: 'moneda', header: 'Moneda' },
  { accessorKey: 'estatus', header: 'Estatus' },
  { accessorKey: 'montoOriginal', header: 'Monto Original' },
  { accessorKey: 'montoMxn', header: 'Monto en MXN' },
]

// ------------------------------------------------------------------------------
// UTILIDADES DE FORMATO
// ------------------------------------------------------------------------------
function pgEstatusColor(estatus: string): 'warning' | 'error' | 'neutral' {
  if (estatus === 'refunded') return 'warning'
  if (estatus === 'failed') return 'error'
  return 'neutral'
}

function obtenerColorNivel(nivel?: string): 'warning' | 'neutral' | 'primary' {
  if (nivel === 'Oro') return 'warning'
  if (nivel === 'Plata') return 'neutral'
  return 'warning'
}

function obtenerIniciales(nombre?: string): string {
  if (!nombre) return 'CL'
  const partes = nombre.trim().split(/\s+/)
  const inicial1 = partes[0]?.[0] || ''
  const inicial2 = partes[1]?.[0] || ''
  if (inicial1 && inicial2) {
    return `${inicial1}${inicial2}`.toUpperCase()
  }
  return nombre.trim().substring(0, 2).toUpperCase() || 'CL'
}
</script>
