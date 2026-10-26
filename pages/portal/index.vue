<template>
  <div class="space-y-8">
    <!-- Bandeja de Notificaciones del Portal (NotificacionesPortalBanner) -->
    <div v-if="datosDashboard?.notificaciones?.length" class="space-y-2.5">
      <div
        v-for="notif in datosDashboard.notificaciones"
        :key="notif.id"
        class="flex items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs shadow-xs"
        :class="
          notif.tipo === 'cupon_por_vencer'
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : notif.tipo === 'producto_entregado'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-white border-neutral-200 text-neutral-800'
        "
      >
        <div class="flex items-start sm:items-center gap-3">
          <div
            class="size-8 rounded-xl flex items-center justify-center shrink-0"
            :class="
              notif.tipo === 'cupon_por_vencer'
                ? 'bg-amber-100 text-amber-700'
                : notif.tipo === 'producto_entregado'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-neutral-900 text-white'
            "
          >
            <UIcon
              :name="
                notif.tipo === 'cupon_por_vencer'
                  ? 'i-lucide-clock-alert'
                  : notif.tipo === 'producto_entregado'
                    ? 'i-lucide-package-check'
                    : 'i-lucide-bell-ring'
              "
              class="size-4"
            />
          </div>
          <div>
            <div class="font-bold">{{ notif.titulo }}</div>
            <div class="text-neutral-600">{{ notif.mensaje }}</div>
          </div>
        </div>
        <span class="text-[11px] font-mono text-neutral-400 shrink-0">
          {{ formatearFecha(notif.fecha) }}
        </span>
      </div>
    </div>

    <!-- Tarjeta de Bienvenida y Estatus de Lealtad (ResumenKpiCard) -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <!-- Saludo y Nivel -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400">Tu Membresía</span>
            <UBadge :color="obtenerColorNivel(datosDashboard?.cliente?.nivel)" variant="subtle" size="sm">
              Nivel {{ datosDashboard?.cliente?.nivel }}
            </UBadge>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            ¡Hola, {{ datosDashboard?.cliente?.nombre }}!
          </h1>
          <p class="text-xs text-neutral-500 max-w-xl">
            Acumula puntos en cada una de tus compras y canjéalos por productos exclusivos y cupones de descuento para la tienda en línea.
          </p>
        </div>

        <!-- Puntos Disponibles Destacados -->
        <div class="flex items-center gap-4 bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-100">
          <div class="size-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-sparkles" class="size-6 text-amber-400" />
          </div>
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Puntos Disponibles</span>
            <div class="text-3xl font-black text-neutral-900 font-mono tracking-tight">
              {{ formatearEntero(datosDashboard?.cliente?.puntosDisponibles) }}
              <span class="text-sm font-semibold text-neutral-500 font-sans">pts</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Progreso hacia el Siguiente Nivel -->
      <div v-if="datosDashboard?.cliente?.siguienteNivel" class="mt-6 pt-6 border-t border-neutral-100 space-y-2">
        <div class="flex justify-between text-xs">
          <span class="font-medium text-neutral-700">
            Progreso a nivel <strong>{{ datosDashboard?.cliente?.siguienteNivel }}</strong>
          </span>
          <span class="text-neutral-500 font-mono">
            Te faltan ${{ formatearMonto(datosDashboard?.cliente?.gastoParaSiguiente) }} MXN en compras
          </span>
        </div>
        <div class="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-neutral-900 rounded-full transition-all duration-500"
            :style="{ width: `${datosDashboard?.cliente?.porcentajeNivel}%` }"
          />
        </div>
      </div>
      <div v-else class="mt-6 pt-6 border-t border-neutral-100 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
        <UIcon name="i-lucide-trophy" class="size-4 text-amber-500" />
        <span>¡Felicidades! Has alcanzado el nivel máximo (Oro) con los mejores beneficios exclusivos.</span>
      </div>
    </div>

    <!-- Navegación por Pestañas del Portal -->
    <div class="flex flex-wrap border-b border-neutral-200 gap-6">
      <button
        type="button"
        class="pb-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2"
        :class="pestanaActiva === 'catalogo' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'"
        @click="pestanaActiva = 'catalogo'"
      >
        <UIcon name="i-lucide-gift" class="size-4" />
        <span>Catálogo de Beneficios</span>
        <UBadge color="neutral" variant="subtle" size="xs">
          {{ datosDashboard?.recompensas?.length || 0 }}
        </UBadge>
      </button>

      <button
        type="button"
        class="pb-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2"
        :class="pestanaActiva === 'canjes' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'"
        @click="pestanaActiva = 'canjes'"
      >
        <UIcon name="i-lucide-shopping-bag" class="size-4" />
        <span>Mis Canjes</span>
        <UBadge v-if="datosDashboard?.canjes?.length" color="neutral" variant="subtle" size="xs">
          {{ datosDashboard?.canjes?.length }}
        </UBadge>
      </button>

      <button
        type="button"
        class="pb-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2"
        :class="pestanaActiva === 'cupones' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'"
        @click="pestanaActiva = 'cupones'"
      >
        <UIcon name="i-lucide-ticket" class="size-4" />
        <span>Mis Cupones</span>
        <UBadge v-if="datosDashboard?.cupones?.length" color="neutral" variant="subtle" size="xs">
          {{ datosDashboard?.cupones?.length }}
        </UBadge>
      </button>

      <button
        type="button"
        class="pb-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2"
        :class="pestanaActiva === 'movimientos' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'"
        @click="pestanaActiva = 'movimientos'"
      >
        <UIcon name="i-lucide-history" class="size-4" />
        <span>Historial de Puntos</span>
      </button>
    </div>

    <!-- PESTAÑA 1: CATÁLOGO DE RECOMPENSAS -->
    <div v-if="pestanaActiva === 'catalogo'" class="space-y-6">
      <div v-if="!datosDashboard?.recompensas?.length" class="text-center py-12 text-neutral-400 text-sm">
        No hay recompensas disponibles en este momento.
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="rec in datosDashboard?.recompensas"
          :key="rec.id"
          class="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div>
            <!-- Imagen o Placeholder -->
            <div class="h-44 bg-neutral-100 relative overflow-hidden flex items-center justify-center border-b border-neutral-100">
              <img
                v-if="rec.fotoUrl"
                :src="rec.fotoUrl"
                :alt="rec.nombre"
                class="w-full h-full object-cover"
              />
              <UIcon
                v-else
                :name="rec.tipo === 'descuento' ? 'i-lucide-ticket-percent' : 'i-lucide-package'"
                class="size-16 text-neutral-300"
              />

              <!-- Badge de Tipo -->
              <div class="absolute top-3 left-3">
                <UBadge color="neutral" variant="solid" size="xs">
                  {{ rec.tipo === 'descuento' ? 'Cupón' : 'Producto' }}
                </UBadge>
              </div>

              <!-- Nivel Mínimo Requerido -->
              <div class="absolute top-3 right-3">
                <UBadge :color="obtenerColorNivel(rec.nivelMinimo)" variant="subtle" size="xs">
                  Nivel {{ rec.nivelMinimo }}
                </UBadge>
              </div>
            </div>

            <!-- Contenido de la Recompensa -->
            <div class="p-5 space-y-3">
              <div>
                <h3 class="font-bold text-base text-neutral-900 leading-tight">
                  {{ rec.nombre }}
                </h3>
                <p class="text-xs text-neutral-500 mt-1 line-clamp-2">
                  {{ rec.descripcion || 'Sin descripción detallada.' }}
                </p>
              </div>

              <!-- Detalle de Descuento si aplica -->
              <div v-if="rec.tipo === 'descuento'" class="text-xs bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 space-y-1">
                <div class="flex justify-between font-semibold text-neutral-900">
                  <span>Descuento:</span>
                  <span>{{ rec.descuentoTipo === 'porcentaje' ? `${Number(rec.descuentoValor)}%` : `$${formatearMonto(rec.descuentoValor)} MXN` }}</span>
                </div>
                <div v-if="rec.compraMinimaMxn" class="flex justify-between text-neutral-500 text-[11px]">
                  <span>Compra mínima:</span>
                  <span>${{ formatearMonto(rec.compraMinimaMxn) }} MXN</span>
                </div>
              </div>

              <!-- Stock si es producto físico -->
              <div v-else-if="rec.stock !== null" class="text-[11px] text-neutral-500 flex items-center gap-1">
                <UIcon name="i-lucide-box" class="size-3.5" />
                <span>{{ rec.stock > 0 ? `${rec.stock} unidades disponibles` : 'Agotado' }}</span>
              </div>
            </div>
          </div>

          <!-- Pie de la Tarjeta: Costo en Puntos y Botón de Canje -->
          <div class="p-5 pt-0 border-t border-neutral-100 mt-2 flex items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold text-neutral-400 block uppercase">Costo</span>
              <span class="font-mono font-extrabold text-neutral-900 text-lg">
                {{ formatearEntero(rec.puntosRequeridos) }}
                <span class="text-xs font-semibold text-neutral-500 font-sans">pts</span>
              </span>
            </div>

            <!-- Botón Canjear -->
            <UButton
              v-if="rec.puedeCanjear"
              color="neutral"
              variant="solid"
              size="sm"
              icon="i-lucide-sparkles"
              @click="abrirConfirmarCanjeModal(rec)"
            >
              Canjear
            </UButton>
            <div v-else class="text-right">
              <UBadge color="neutral" variant="subtle" size="xs">
                {{ rec.motivoBloqueo }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PESTAÑA 1.5: SEGUIMIENTO DE MIS CANJES -->
    <div v-if="pestanaActiva === 'canjes'" class="space-y-4">
      <div class="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xs">
        <div class="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-base text-neutral-900">
              Seguimiento de Mis Canjes
            </h3>
            <p class="text-xs text-neutral-500">
              Consulta el estado de entrega de tus productos o el estatus de tus beneficios canjeados.
            </p>
          </div>
          <span class="text-xs text-neutral-400">{{ datosDashboard?.canjes?.length || 0 }} canjes</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th class="py-3 px-4">Folio</th>
                <th class="py-3 px-4">Recompensa</th>
                <th class="py-3 px-4">Tipo</th>
                <th class="py-3 px-4">Puntos Usados</th>
                <th class="py-3 px-4">Estatus de Entrega</th>
                <th class="py-3 px-4">Fecha</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr v-if="!datosDashboard?.canjes?.length">
                <td colspan="6" class="py-8 text-center text-neutral-400">
                  Aún no has realizado ningún canje de recompensas.
                </td>
              </tr>
              <tr
                v-for="canje in datosDashboard?.canjes"
                :key="canje.id"
                class="hover:bg-neutral-50/50 transition-colors"
              >
                <td class="py-3 px-4 font-mono font-semibold text-neutral-500">
                  #{{ canje.id }}
                </td>
                <td class="py-3 px-4 font-bold text-neutral-900">
                  {{ canje.recompensaNombre }}
                </td>
                <td class="py-3 px-4">
                  <UBadge color="neutral" variant="subtle" size="xs">
                    {{ canje.recompensaTipo === 'descuento' ? 'Cupón' : 'Producto Físico' }}
                  </UBadge>
                </td>
                <td class="py-3 px-4 font-mono font-semibold text-neutral-800">
                  -{{ formatearEntero(canje.puntosUsados) }} pts
                </td>
                <td class="py-3 px-4">
                  <UBadge
                    :color="canje.estatus === 'entregado' ? 'success' : canje.estatus === 'pendiente' ? 'warning' : 'error'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ canje.estatus === 'entregado' ? 'Entregado' : canje.estatus === 'pendiente' ? 'Pendiente de Entrega' : 'Cancelado (Puntos Devueltos)' }}
                  </UBadge>
                </td>
                <td class="py-3 px-4 font-mono text-neutral-500">
                  {{ formatearFecha(canje.creadoEn) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PESTAÑA 2: MIS CUPONES Y BENEFICIOS -->
    <div v-if="pestanaActiva === 'cupones'" class="space-y-6">
      <div v-if="!datosDashboard?.cupones?.length" class="text-center py-12 text-neutral-400 text-sm">
        Aún no has canjeado ningún cupón de descuento. ¡Explora el catálogo para obtener el tuyo!
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="cupon in datosDashboard?.cupones"
          :key="cupon.id"
          class="bg-white rounded-3xl border border-dashed border-neutral-300 p-6 shadow-xs relative overflow-hidden flex flex-col justify-between gap-4"
        >
          <!-- Cabecera del Cupón -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <UBadge :color="cupon.estatus === 'vigente' ? 'success' : 'neutral'" variant="subtle" size="xs">
                {{ cupon.estatus === 'vigente' ? 'Vigente' : cupon.estatus }}
              </UBadge>
              <span class="text-[11px] text-neutral-400 font-mono">
                Vence: {{ formatearFecha(cupon.fechaVencimiento) }}
              </span>
            </div>

            <h3 class="font-bold text-lg text-neutral-900 leading-tight">
              {{ cupon.descuentoTipo === 'porcentaje' ? `${Number(cupon.descuentoValor)}% de Descuento` : `$${formatearMonto(cupon.descuentoValor)} MXN de Descuento` }}
            </h3>
            <p class="text-xs text-neutral-500">
              {{ cupon.recompensaNombre }}
            </p>
          </div>

          <!-- Código Copiable -->
          <div class="bg-neutral-50 rounded-2xl p-3 border border-neutral-200 flex items-center justify-between">
            <code class="font-mono font-black text-sm tracking-widest text-neutral-900">
              {{ cupon.codigo }}
            </code>
            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              icon="i-lucide-copy"
              @click="copiarTexto(cupon.codigo)"
            >
              Copiar
            </UButton>
          </div>

          <!-- Compra Mínima si aplica -->
          <div v-if="cupon.compraMinimaMxn" class="text-[11px] text-neutral-400">
            * Aplica en compras a partir de ${{ formatearMonto(cupon.compraMinimaMxn) }} MXN
          </div>
        </div>
      </div>
    </div>

    <!-- PESTAÑA 3: HISTORIAL DE PUNTOS -->
    <div v-if="pestanaActiva === 'movimientos'" class="space-y-4">
      <div class="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xs">
        <div class="p-5 border-b border-neutral-100 flex items-center justify-between">
          <h3 class="font-bold text-base text-neutral-900">
            Trazabilidad de Movimientos
          </h3>
          <span class="text-xs text-neutral-400">Últimos registros</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th class="py-3 px-4">Fecha</th>
                <th class="py-3 px-4">Concepto</th>
                <th class="py-3 px-4">Referencia</th>
                <th class="py-3 px-4 text-right">Puntos</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr v-if="!datosDashboard?.movimientos?.length">
                <td colspan="4" class="py-8 text-center text-neutral-400">
                  No hay movimientos registrados en tu cuenta.
                </td>
              </tr>
              <tr
                v-for="mov in datosDashboard?.movimientos"
                :key="mov.id"
                class="hover:bg-neutral-50/50 transition-colors"
              >
                <td class="py-3 px-4 font-mono text-neutral-600">
                  {{ mov.fecha }}
                </td>
                <td class="py-3 px-4 font-medium text-neutral-900">
                  {{ obtenerConceptoMovimiento(mov.tipo) }}
                </td>
                <td class="py-3 px-4 font-mono text-neutral-400 text-[11px]">
                  {{ mov.referencia }}
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold">
                  <span :class="mov.puntos >= 0 ? 'text-emerald-600' : 'text-neutral-900'">
                    {{ mov.puntos >= 0 ? `+${formatearEntero(mov.puntos)}` : formatearEntero(mov.puntos) }} pts
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación de Canje (ConfirmarCanjeModal) -->
    <div
      v-if="mostrarConfirmarCanjeModal && recompensaACanjear"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      @click.self="mostrarConfirmarCanjeModal = false"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-200">
        <div class="text-center space-y-2">
          <div class="size-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-sm">
            <UIcon name="i-lucide-gift" class="size-6 text-amber-400" />
          </div>
          <h3 class="text-xl font-bold text-neutral-900">
            ¿Deseas canjear esta recompensa?
          </h3>
          <p class="text-xs text-neutral-500">
            Se descontarán <strong class="text-neutral-900 font-mono">{{ formatearEntero(recompensaACanjear.puntosRequeridos) }} pts</strong> de tu saldo de lealtad.
          </p>
        </div>

        <!-- Tarjeta Resumen -->
        <div class="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-neutral-500">Recompensa:</span>
            <span class="font-bold text-neutral-900">{{ recompensaACanjear.nombre }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-500">Tipo de beneficio:</span>
            <span class="font-medium text-neutral-900">
              {{ recompensaACanjear.tipo === 'descuento' ? 'Cupón de Descuento Inmediato' : 'Producto Físico en Tienda' }}
            </span>
          </div>
          <div class="flex justify-between border-t border-neutral-200 pt-2 font-bold">
            <span class="text-neutral-700">Saldo tras el canje:</span>
            <span class="font-mono text-neutral-900">
              {{ formatearEntero((datosDashboard?.cliente?.puntosDisponibles || 0) - recompensaACanjear.puntosRequeridos) }} pts
            </span>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="procesandoCanje"
            @click="mostrarConfirmarCanjeModal = false"
          >
            Cancelar
          </UButton>
          <UButton
            color="neutral"
            variant="solid"
            size="sm"
            :loading="procesandoCanje"
            @click="ejecutarCanje"
          >
            Confirmar Canje
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista: Dashboard de Autoservicio del Cliente · pages/portal/index.vue
// Catálogo de recompensas, canje transaccional, cupones e historial
// ==============================================================================

// ------------------------------------------------------------------------------
// IMPORTACIONES Y UTILIDADES
// ------------------------------------------------------------------------------
import { formatearEntero, formatearMonto } from '~/utils/formato'

// ------------------------------------------------------------------------------
// METADATOS Y LAYOUT
// ------------------------------------------------------------------------------
definePageMeta({
  layout: 'portal',
  middleware: 'portal-auth',
})

// ------------------------------------------------------------------------------
// COMPOSABLES Y ESTADO REACTIVO
// ------------------------------------------------------------------------------
const toast = useToast()
const requestFetch = useRequestFetch()

const pestanaActiva = ref<'catalogo' | 'canjes' | 'cupones' | 'movimientos'>('catalogo')

// Estado del Modal de Canje
const recompensaACanjear = ref<any>(null)
const mostrarConfirmarCanjeModal = ref(false)
const procesandoCanje = ref(false)

// ------------------------------------------------------------------------------
// CARGA ASÍNCRONA DE DATOS
// ------------------------------------------------------------------------------
const { data: datosDashboard, refresh: refrescarDashboard } = await useAsyncData<any>(
  'portal-dashboard-datos',
  () => requestFetch('/api/portal/dashboard')
)

// ------------------------------------------------------------------------------
// ACCIONES Y MÉTODOS
// ------------------------------------------------------------------------------
function abrirConfirmarCanjeModal(rec: any) {
  recompensaACanjear.value = rec
  mostrarConfirmarCanjeModal.value = true
}

async function ejecutarCanje() {
  if (!recompensaACanjear.value) return

  procesandoCanje.value = true
  try {
    const res = await $fetch<{ ok: boolean, mensaje: string, datos: any }>('/api/portal/canjear', {
      method: 'POST',
      body: {
        recompensaId: recompensaACanjear.value.id,
      },
    })

    toast.add({
      title: '¡Felicidades!',
      description: res.mensaje,
      color: 'success',
    })

    mostrarConfirmarCanjeModal.value = false
    recompensaACanjear.value = null

    // Refrescar datos
    await refrescarDashboard()

    // Si fue cupón, cambiar a la pestaña de cupones para que lo vea de inmediato
    if (res.datos?.cupon) {
      pestanaActiva.value = 'cupones'
    }
  } catch (error: any) {
    toast.add({
      title: 'Error al canjear',
      description: error.data?.statusMessage || error.message || 'No se pudo procesar el canje.',
      color: 'error',
    })
  } finally {
    procesandoCanje.value = false
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
      title: 'Error',
      description: 'Copia el código manualmente.',
      color: 'warning',
    })
  }
}

// ------------------------------------------------------------------------------
// UTILIDADES DE FORMATO Y ESTILO
// ------------------------------------------------------------------------------
function obtenerColorNivel(nivel?: string): 'warning' | 'neutral' | 'primary' {
  if (nivel === 'Oro') return 'warning'
  if (nivel === 'Plata') return 'neutral'
  return 'neutral'
}

function obtenerConceptoMovimiento(tipo: string): string {
  if (tipo === 'pago') return 'Puntos ganados por compra'
  if (tipo === 'reembolso') return 'Deducción por reembolso de orden'
  if (tipo === 'bono_orden_entregada') return 'Bono por entrega de pedido'
  if (tipo === 'canje') return 'Canje de recompensa'
  if (tipo === 'devolucion') return 'Reembolso por canje cancelado'
  return tipo
}

function formatearFecha(fechaStr: string | null): string {
  if (!fechaStr) return 'N/D'
  try {
    const f = new Date(fechaStr)
    if (isNaN(f.getTime())) return fechaStr
    const anio = f.getFullYear()
    const mes = String(f.getMonth() + 1).padStart(2, '0')
    const dia = String(f.getDate()).padStart(2, '0')
    return `${dia}/${mes}/${anio}`
  } catch {
    return fechaStr
  }
}
</script>
