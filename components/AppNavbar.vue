<template>
  <header class="h-16 border-b border-neutral-200 bg-neutral-100 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
    <!-- Lado Izquierdo: Toggle Móvil y Título Contextual -->
    <div class="flex items-center space-x-3">
      <UButton
        class="lg:hidden"
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        @click="$emit('toggle-sidebar')"
      />

      <div class="hidden sm:block">
        <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">Corte Fijo</span>
        <span class="text-xs font-semibold text-neutral-800">30 de Abril 2026 (UTC-6)</span>
      </div>
    </div>

    <!-- Lado Derecho: Indicador protegido + Botón de Usuario (Nombre, Correo y Logout) -->
    <div class="flex items-center space-x-3">
      <!-- Indicador si no puede ver montos -->
      <div
        v-if="!puedeVerFinancieros"
        class="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-200/80 text-neutral-700 border border-neutral-300"
        title="Tu rol no tiene acceso a cifras de ventas ni pagos ($)"
      >
        🔒 Modo Protegido (Sin $)
      </div>

      <!-- Botón de Usuario con Menú Desplegable (Nombre, Correo y Logout) -->
      <UDropdownMenu :items="elementosMenuUsuario">
        <button
          type="button"
          class="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all shadow-sm text-left focus:outline-none"
        >
          <!-- Avatar con Iniciales -->
          <div class="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {{ obtenerIniciales(usuario?.nombre) }}
          </div>

          <!-- Nombre y Correo Visibles -->
          <div class="hidden sm:flex flex-col min-w-0 leading-tight">
            <span class="text-xs font-bold text-neutral-900 truncate max-w-[150px]">
              {{ usuario?.nombre || 'Usuario' }}
            </span>
            <span class="text-[11px] text-neutral-500 truncate max-w-[150px]">
              {{ usuario?.correo || '' }}
            </span>
          </div>

          <UIcon name="i-lucide-chevron-down" class="size-4 text-neutral-400 shrink-0" />
        </button>
      </UDropdownMenu>

      <!-- Botón Directo de Cerrar Sesión -->
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-log-out"
        :loading="cargandoLogout"
        title="Cerrar sesión"
        @click="handleLogout"
      >
        <span class="hidden lg:inline text-xs font-semibold">Salir</span>
      </UButton>
    </div>
  </header>
</template>

<script setup lang="ts">
// ==============================================================================
// Componente Barra Superior · AppNavbar.vue
// Header administrativo con indicador de rol, restricciones financieras y logout
// ==============================================================================

// ------------------------------------------------------------------------------
// EMITS Y COMPOSABLES
// ------------------------------------------------------------------------------
defineEmits(['toggle-sidebar'])

const router = useRouter()
const { usuario, logout } = useAuth()
const cargandoLogout = ref(false)

// ------------------------------------------------------------------------------
// COMPUTADAS
// ------------------------------------------------------------------------------
const puedeVerFinancieros = computed(() => {
  return usuario.value?.permisos?.includes('ver_montos_financieros') ?? false
})

// ------------------------------------------------------------------------------
// ELEMENTOS DEL MENÚ DE USUARIO
// ------------------------------------------------------------------------------
const elementosMenuUsuario = computed(() => [
  [
    {
      label: usuario.value?.nombre || 'Usuario',
      description: usuario.value?.correo || '',
      icon: 'i-lucide-user',
      disabled: true,
    },
    {
      label: `Rol: ${usuario.value?.rol || 'Usuario'}`,
      icon: 'i-lucide-shield',
      disabled: true,
    },
  ],
  [
    {
      label: 'Cerrar Sesión',
      icon: 'i-lucide-log-out',
      onSelect: () => handleLogout(),
    },
  ],
])

// ------------------------------------------------------------------------------
// UTILIDADES
// ------------------------------------------------------------------------------
function obtenerIniciales(nombre?: string): string {
  if (!nombre) return 'US'
  const partes = nombre.trim().split(' ')
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  }
  return nombre.substring(0, 2).toUpperCase()
}

// ------------------------------------------------------------------------------
// MÉTODOS
// ------------------------------------------------------------------------------
async function handleLogout() {
  cargandoLogout.value = true
  try {
    await logout()
    await router.push('/login')
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  } finally {
    cargandoLogout.value = false
  }
}
</script>
