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

      <!-- Acceso al Portal del Cliente -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div class="text-left sm:text-right">
          <span class="text-[11px] text-neutral-400 block font-medium">Estado del Portal</span>
          <UBadge
            :color="detalleCliente?.cuentaPortal?.estadoAcceso === 'activo' ? 'success' : 'neutral'"
            variant="subtle"
            size="xs"
          >
            {{ detalleCliente?.cuentaPortal?.estadoAcceso === 'activo' ? 'Portal Activo' : 'Sin Acceso Activado' }}
          </UBadge>
        </div>

        <UButton
          v-if="tienePermiso('generar_acceso_portal_cliente')"
          color="neutral"
          variant="solid"
          size="sm"
          icon="i-lucide-key-round"
          :loading="generandoAcceso"
          @click="solicitarAccesoPortal"
        >
          {{ detalleCliente?.cuentaPortal?.estadoAcceso === 'activo' ? 'Restablecer Clave Portal' : 'Generar Acceso al Portal' }}
        </UButton>
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

    <!-- Modal: Acceso al Portal Generado (AccesoPortalModal) -->
    <div
      v-if="mostrarModalAcceso && credencialesGeneradas"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <UIcon name="i-lucide-key" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-neutral-900">Credenciales del Portal</h2>
              <p class="text-xs text-neutral-500">Contraseña temporal de un solo uso</p>
            </div>
          </div>
          <button class="text-neutral-400 hover:text-neutral-600 text-lg" @click="mostrarModalAcceso = false">✕</button>
        </div>

        <div class="space-y-4 text-xs">
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
            <UIcon name="i-lucide-info" class="size-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span class="font-bold block">Contraseña de un solo uso</span>
              <span>Entrega esta clave al cliente. Al iniciar sesión en el portal, el sistema le exigirá definir una contraseña nueva personal.</span>
            </div>
          </div>

          <div class="space-y-2.5 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <span class="text-neutral-400 block font-medium">Correo Electrónico (Usuario)</span>
              <span class="font-bold text-neutral-900 font-mono text-xs">{{ credencialesGeneradas.correo }}</span>
            </div>
            <div>
              <span class="text-neutral-400 block font-medium">Contraseña Temporal Generada</span>
              <div class="flex items-center justify-between gap-2 mt-1">
                <span class="font-bold text-neutral-900 font-mono text-sm tracking-wider bg-white px-3 py-1.5 rounded-lg border border-neutral-200 select-all flex-1">
                  {{ credencialesGeneradas.passwordTemporal }}
                </span>
                <UButton
                  color="neutral"
                  variant="outline"
                  size="xs"
                  :icon="copiado ? 'i-lucide-check' : 'i-lucide-copy'"
                  @click="copiarCredenciales"
                >
                  {{ copiado ? '¡Copiado!' : 'Copiar' }}
                </UButton>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end pt-3 border-t border-neutral-200">
          <UButton color="neutral" variant="solid" @click="mostrarModalAcceso = false">
            Entendido y Cerrar
          </UButton>
        </div>
      </div>
    </div>
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
const toast = useToast()
const { tienePermiso } = useAuth()

const pestanaActiva = ref<'movimientos' | 'pedidos' | 'pagos'>('movimientos')

// Estado para acceso al portal
const generandoAcceso = ref(false)
const credencialesGeneradas = ref<{
  clienteId: number
  correo: string
  passwordTemporal: string
  estadoAcceso: string
  urlPortal: string
} | null>(null)
const mostrarModalAcceso = ref(false)
const copiado = ref(false)

// ------------------------------------------------------------------------------
// CARGA DE DATOS DE LA FICHA
// ------------------------------------------------------------------------------
const requestFetch = useRequestFetch()
const { data: detalleCliente, refresh: refrescarCliente } = await useAsyncData<any>(
  `admin-cliente-${clienteId}`,
  () => requestFetch(`/api/admin/clientes/${clienteId}`)
)

// ------------------------------------------------------------------------------
// ACCIONES DE ACCESO AL PORTAL
// ------------------------------------------------------------------------------
async function solicitarAccesoPortal() {
  if (!detalleCliente.value?.cliente?.correo) {
    toast.add({
      title: 'Cliente sin correo',
      description: 'El cliente debe tener un correo electrónico registrado para habilitar su acceso al portal.',
      color: 'warning',
    })
    return
  }

  generandoAcceso.value = true
  try {
    const respuesta = await $fetch<{
      ok: boolean
      mensaje: string
      datos: {
        clienteId: number
        correo: string
        passwordTemporal: string
        estadoAcceso: string
        urlPortal: string
      }
    }>(`/api/admin/clientes/${clienteId}/generar-acceso`, {
      method: 'POST',
    })

    credencialesGeneradas.value = respuesta.datos
    mostrarModalAcceso.value = true
    await refrescarCliente()

    toast.add({
      title: 'Credenciales generadas',
      description: respuesta.mensaje,
      color: 'success',
    })
  } catch (error: any) {
    toast.add({
      title: 'Error al generar credenciales',
      description: error.data?.message || error.message || 'No se pudo generar el acceso.',
      color: 'error',
    })
  } finally {
    generandoAcceso.value = false
  }
}

async function copiarCredenciales() {
  if (!credencialesGeneradas.value) return
  const texto = `Portal de Clientes:\nURL: ${credencialesGeneradas.value.urlPortal}\nUsuario: ${credencialesGeneradas.value.correo}\nContraseña Temporal: ${credencialesGeneradas.value.passwordTemporal}\n\n*Nota: Se te solicitará crear una nueva contraseña en tu primer inicio de sesión.*`

  try {
    await navigator.clipboard.writeText(texto)
    copiado.value = true
    setTimeout(() => {
      copiado.value = false
    }, 2500)
    toast.add({
      title: 'Copiado al portapapeles',
      description: 'Las credenciales están listas para ser enviadas al cliente.',
      color: 'success',
    })
  } catch {
    toast.add({
      title: 'Error al copiar',
      description: 'Por favor copia el texto manualmente.',
      color: 'warning',
    })
  }
}

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
