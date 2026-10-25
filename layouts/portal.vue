<template>
  <div class="min-h-screen bg-neutral-50 flex flex-col text-neutral-900 font-sans">
    <!-- Barra Superior de Navegación del Portal -->
    <header class="bg-white border-b border-neutral-200 sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <!-- Logotipo y Nombre del Portal -->
        <NuxtLink to="/portal" class="flex items-center space-x-3 group">
          <div class="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
            PL
          </div>
          <div>
            <div class="font-bold text-sm leading-tight text-neutral-900 group-hover:text-neutral-700 transition-colors">
              Club de Fidelidad
            </div>
            <div class="text-[11px] text-neutral-500 leading-tight">
              Portal de Beneficios
            </div>
          </div>
        </NuxtLink>

        <!-- Información del Cliente y Acciones -->
        <div v-if="clientePortal" class="flex items-center gap-3 sm:gap-5">
          <!-- Saldo Rápido de Puntos -->
          <div class="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-semibold">
            <UIcon name="i-lucide-sparkles" class="size-4 text-amber-500" />
            <span class="font-mono text-neutral-900">{{ formatearEntero(clientePortal.puntosDisponibles) }}</span>
            <span class="text-neutral-500 text-[11px]">pts</span>
          </div>

          <!-- Nivel del Cliente -->
          <UBadge :color="obtenerColorNivel(clientePortal.nivel)" variant="subtle" size="sm">
            {{ clientePortal.nivel }}
          </UBadge>

          <!-- Perfil y Menú -->
          <div class="hidden sm:flex flex-col text-right">
            <span class="text-xs font-bold text-neutral-900 leading-none">{{ clientePortal.nombre }}</span>
            <span class="text-[11px] text-neutral-400 leading-none mt-1">{{ clientePortal.correo }}</span>
          </div>

          <!-- Botón de Salir -->
          <UButton
            color="error"
            variant="soft"
            size="sm"
            icon="i-lucide-log-out"
            label="Cerrar sesión"
            @click="cerrarSesionPortal"
          />
        </div>
      </div>
    </header>

    <!-- Contenido Principal -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <!-- Pie de Página -->
    <footer class="bg-white border-t border-neutral-200 py-6 text-center text-xs text-neutral-500">
      <div class="max-w-7xl mx-auto px-4">
        &copy; 2026 Club de Lealtad · Todos los derechos reservados.
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Layout: Portal del Cliente · layouts/portal.vue
// Encabezado con saldo de puntos, nivel y cierre de sesión
// ==============================================================================

// ------------------------------------------------------------------------------
// IMPORTACIONES Y UTILIDADES
// ------------------------------------------------------------------------------
import { formatearEntero } from '~/utils/formato'

// ------------------------------------------------------------------------------
// COMPOSABLES
// ------------------------------------------------------------------------------
const { clientePortal, cerrarSesionPortal } = usePortalAuth()

function obtenerColorNivel(nivel?: string): 'warning' | 'neutral' | 'primary' {
  if (nivel === 'Oro') return 'warning'
  if (nivel === 'Plata') return 'neutral'
  return 'neutral'
}
</script>
