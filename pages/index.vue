<template>
  <div class="space-y-8">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Dashboard de Fidelización"
      descripcion="Métricas consolidadas y niveles de clientes al corte fijo del 30 de abril de 2026."
      badge-texto="Corte 30-Abr-2026"
      badge-color="neutral"
    >
      <template v-if="puedeSincronizar" #acciones>
        <UButton
          color="neutral"
          variant="solid"
          size="sm"
          icon="i-lucide-refresh-cw"
          :loading="sincronizando"
          @click="ejecutarSincronizacionManual"
        >
          Sincronizar fakeapi.dev
        </UButton>
      </template>
    </CabeceraPagina>

    <!-- Alerta de Estado de Sincronización si ocurrió recientemente -->
    <div
      v-if="mensajeSync"
      class="p-4 rounded-xl text-sm border flex items-center justify-between"
      :class="errorSync ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-900' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900'"
    >
      <span>{{ mensajeSync }}</span>
      <button class="font-bold underline ml-2" @click="mensajeSync = ''">Cerrar</button>
    </div>

    <!-- Tarjetas de Métricas Globales (ResumenCards) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Clientes -->
      <UCard>
        <div class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total Clientes</span>
          <div class="text-3xl font-extrabold tracking-tight">
            {{ formatearEntero(datosDashboard?.metricas?.totalClientes) }}
          </div>
          <span class="text-xs text-neutral-500 block">Sincronizados desde fakeapi.dev</span>
        </div>
      </UCard>

      <!-- Puntos Emitidos -->
      <UCard>
        <div class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Puntos Emitidos</span>
          <div class="text-3xl font-extrabold tracking-tight text-primary-600 dark:text-primary-400">
            {{ formatearEntero(datosDashboard?.metricas?.totalPuntosEmitidos) }}
          </div>
          <span class="text-xs text-neutral-500 block">Pagos válidos y bonos de orden</span>
        </div>
      </UCard>

      <!-- Puntos Disponibles -->
      <UCard>
        <div class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Puntos Disponibles</span>
          <div class="text-3xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            {{ formatearEntero(datosDashboard?.metricas?.totalPuntosDisponibles) }}
          </div>
          <span class="text-xs text-neutral-500 block">Saldo activo para canjes</span>
        </div>
      </UCard>

      <!-- Clientes en Riesgo -->
      <UCard>
        <div class="space-y-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-neutral-500">Clientes en Riesgo</span>
          <div class="text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
            {{ formatearEntero(datosDashboard?.metricas?.totalEnRiesgo) }}
          </div>
          <NuxtLink to="/admin/riesgo" class="text-xs text-amber-600 dark:text-amber-400 hover:underline block font-medium">
            Ver listado de riesgo &rarr;
          </NuxtLink>
        </div>
      </UCard>
    </div>

    <!-- Distribución por Niveles de Fidelización -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold">Distribución por Niveles de Fidelización</h2>
          <span class="text-xs text-neutral-500">Gasto últimos 12 meses a MXN</span>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Nivel Bronce -->
        <div class="p-4 rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-amber-800 dark:text-amber-300">Nivel Bronce</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">&lt; $150k MXN</span>
          </div>
          <div class="text-2xl font-extrabold text-amber-900 dark:text-amber-100">
            {{ datosDashboard?.metricas?.niveles?.Bronce || 0 }} clientes
          </div>
          <div class="w-full bg-amber-200 dark:bg-amber-900 rounded-full h-2">
            <div
              class="bg-amber-600 h-2 rounded-full"
              :style="{ width: calcularPorcentaje(datosDashboard?.metricas?.niveles?.Bronce) + '%' }"
            />
          </div>
          <span class="text-xs text-neutral-500 block">
            {{ calcularPorcentaje(datosDashboard?.metricas?.niveles?.Bronce) }}% del total
          </span>
        </div>

        <!-- Nivel Plata -->
        <div class="p-4 rounded-xl border border-slate-300 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-700 dark:text-slate-300">Nivel Plata</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">$150k - $400k</span>
          </div>
          <div class="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {{ datosDashboard?.metricas?.niveles?.Plata || 0 }} clientes
          </div>
          <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
            <div
              class="bg-slate-500 h-2 rounded-full"
              :style="{ width: calcularPorcentaje(datosDashboard?.metricas?.niveles?.Plata) + '%' }"
            />
          </div>
          <span class="text-xs text-neutral-500 block">
            {{ calcularPorcentaje(datosDashboard?.metricas?.niveles?.Plata) }}% del total
          </span>
        </div>

        <!-- Nivel Oro -->
        <div class="p-4 rounded-xl border border-yellow-300 bg-yellow-50/50 dark:border-yellow-900/50 dark:bg-yellow-950/20 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-yellow-700 dark:text-yellow-300">Nivel Oro</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200">&gt; $400k MXN</span>
          </div>
          <div class="text-2xl font-extrabold text-yellow-800 dark:text-yellow-100">
            {{ datosDashboard?.metricas?.niveles?.Oro || 0 }} clientes
          </div>
          <div class="w-full bg-yellow-200 dark:bg-yellow-900 rounded-full h-2">
            <div
              class="bg-yellow-500 h-2 rounded-full"
              :style="{ width: calcularPorcentaje(datosDashboard?.metricas?.niveles?.Oro) + '%' }"
            />
          </div>
          <span class="text-xs text-neutral-500 block">
            {{ calcularPorcentaje(datosDashboard?.metricas?.niveles?.Oro) }}% del total
          </span>
        </div>
      </div>
    </UCard>

    <!-- Top 10 Clientes con Mayor Saldo de Puntos -->
    <TablaCrud
      titulo="Top 10 Clientes con Mayor Saldo de Puntos"
      :columnas="columnasTop10"
      :datos="datosDashboard?.top10Clientes || []"
      :cargando="cargando"
      :mostrar-paginacion="false"
    >
      <template #acciones>
        <NuxtLink
          to="/admin/clientes"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100 transition-colors shadow-xs"
        >
          <span>Ver todos los clientes</span>
          <UIcon name="i-lucide-arrow-right" class="size-3.5" />
        </NuxtLink>
      </template>

      <template #id-cell="{ row }">
        <span class="font-mono text-xs text-neutral-500 font-semibold">#{{ row.original.id }}</span>
      </template>

      <template #nombre-cell="{ row }">
        <div>
          <div class="font-semibold text-neutral-900">{{ row.original.nombre }}</div>
          <div class="text-xs text-neutral-500">{{ row.original.correo }}</div>
        </div>
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

      <template #enRiesgo-cell="{ row }">
        <UBadge v-if="row.original.enRiesgo" color="warning" variant="subtle" size="xs">
          En Riesgo
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
// Vista Principal · Dashboard Administrativo (pages/index.vue)
// Métricas consolidadas, distribución por niveles, Top 10 y trigger de sincronización
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
const { usuario } = useAuth()
const sincronizando = ref(false)
const mensajeSync = ref('')
const errorSync = ref(false)

// ------------------------------------------------------------------------------
// CARGA DE DATOS DEL DASHBOARD
// ------------------------------------------------------------------------------
const requestFetch = useRequestFetch()
const { data: datosDashboard, status, refresh: refrescarDashboard } = await useAsyncData<any>('dashboard-admin', () =>
  requestFetch('/api/admin/dashboard')
)

const cargando = computed(() => status.value === 'pending' && !datosDashboard.value)

// ------------------------------------------------------------------------------
// COMPUTADAS
// ------------------------------------------------------------------------------
const puedeSincronizar = computed(() => {
  return usuario.value?.permisos?.includes('ejecutar_sincronizacion') ?? false
})

// ------------------------------------------------------------------------------
// DEFINICIÓN DE COLUMNAS PARA UTable
// ------------------------------------------------------------------------------
const columnasTop10 = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'nombre', header: 'Cliente' },
  { accessorKey: 'nivel', header: 'Nivel' },
  { accessorKey: 'puntosDisponibles', header: 'Puntos' },
  { accessorKey: 'enRiesgo', header: 'Estado' },
  { accessorKey: 'acciones', header: 'Acción' },
]

// ------------------------------------------------------------------------------
// FUNCIONES Y UTILIDADES
// ------------------------------------------------------------------------------
function calcularPorcentaje(cantidad?: number): number {
  const total = datosDashboard.value?.metricas?.totalClientes || 1
  if (!cantidad) return 0
  return Math.round((cantidad / total) * 100)
}

function obtenerColorNivel(nivel: string): 'warning' | 'neutral' | 'primary' {
  if (nivel === 'Oro') return 'warning'
  if (nivel === 'Plata') return 'neutral'
  return 'warning'
}

async function ejecutarSincronizacionManual() {
  sincronizando.value = true
  mensajeSync.value = ''
  errorSync.value = false

  try {
    const respuesta = await $fetch<{ exito: boolean; mensaje: string }>('/api/admin/sincronizar', {
      method: 'POST',
    })
    mensajeSync.value = respuesta.mensaje || 'Sincronización completada exitosamente.'
    await refrescarDashboard()
  } catch (error: any) {
    errorSync.value = true
    mensajeSync.value = error.data?.statusMessage || error.message || 'Error durante la sincronización.'
  } finally {
    sincronizando.value = false
  }
}
</script>
