<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 w-64 bg-neutral-100 border-r border-neutral-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto"
    :class="abierto ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Cabecera de Marca del Sidebar -->
    <div class="h-16 flex items-center justify-between px-6 border-b border-neutral-200">
      <NuxtLink to="/" class="flex items-center space-x-3" @click="$emit('cerrar')">
        <div class="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center text-white font-semibold">
          PL
        </div>
        <div>
          <span class="font-semibold text-base tracking-tight block leading-none text-neutral-900">Fidelidad</span>
          <span class="text-[11px] text-neutral-500">Tienda en Línea</span>
        </div>
      </NuxtLink>

      <UButton
        class="lg:hidden"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="$emit('cerrar')"
      />
    </div>

    <!-- Navegación Organizada por Categorías con Labels -->
    <nav class="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
      <div v-for="categoria in categoriasVisibles" :key="categoria.titulo" class="space-y-1">
        <!-- Label de la Categoría -->
        <span class="block px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 select-none">
          {{ categoria.titulo }}
        </span>

        <!-- Enlaces de la Categoría -->
        <NuxtLink
          v-for="enlace in categoria.enlaces"
          :key="enlace.ruta"
          :to="enlace.ruta"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="esActivo(enlace) ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'"
          @click="$emit('cerrar')"
        >
          <UIcon :name="enlace.icono" class="size-4 shrink-0" />
          <span>{{ enlace.etiqueta }}</span>
        </NuxtLink>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
// ==============================================================================
// Componente Barra Lateral · AppSidebar.vue
// Sidebar responsive con navegación organizada en categorías y control de permisos
// ==============================================================================

// ------------------------------------------------------------------------------
// TIPOS
// ------------------------------------------------------------------------------
interface EnlaceSidebar {
  etiqueta: string
  ruta: string
  icono: string
  exacto?: boolean
  permiso?: string
}

interface CategoriaSidebar {
  titulo: string
  enlaces: EnlaceSidebar[]
}

// ------------------------------------------------------------------------------
// PROPS Y EMITS
// ------------------------------------------------------------------------------
defineProps<{
  abierto: boolean
}>()

defineEmits(['cerrar'])

// ------------------------------------------------------------------------------
// COMPOSABLES
// ------------------------------------------------------------------------------
const route = useRoute()
const { usuario } = useAuth()

// ------------------------------------------------------------------------------
// DEFINICIÓN DE CATEGORÍAS Y ENLACES
// ------------------------------------------------------------------------------
const categorias: CategoriaSidebar[] = [
  {
    titulo: 'General',
    enlaces: [
      { etiqueta: 'Dashboard', ruta: '/', icono: 'i-lucide-layout-dashboard', exacto: true },
    ],
  },
  {
    titulo: 'Fidelización',
    enlaces: [
      { etiqueta: 'Clientes', ruta: '/admin/clientes', icono: 'i-lucide-users', permiso: 'buscar_cliente_detalle' },
      { etiqueta: 'En Riesgo', ruta: '/admin/riesgo', icono: 'i-lucide-triangle-alert', permiso: 'ver_listas_riesgo_cumpleanos' },
      { etiqueta: 'Cumpleaños', ruta: '/admin/cumpleanios', icono: 'i-lucide-cake', permiso: 'ver_listas_riesgo_cumpleanos' },
      { etiqueta: 'Recompensas', ruta: '/admin/recompensas', icono: 'i-lucide-gift', permiso: 'gestionar_catalogo_recompensas' },
      { etiqueta: 'Canjes', ruta: '/admin/canjes', icono: 'i-lucide-ticket', permiso: 'gestionar_canjes' },
    ],
  },
  {
    titulo: 'Seguridad y Sistema',
    enlaces: [
      { etiqueta: 'Usuarios', ruta: '/admin/usuarios', icono: 'i-lucide-user-cog', permiso: 'gestionar_usuarios' },
      { etiqueta: 'Roles', ruta: '/admin/roles', icono: 'i-lucide-shield-check', permiso: 'gestionar_roles_permisos' },
      { etiqueta: 'Permisos', ruta: '/admin/permisos', icono: 'i-lucide-key-round', permiso: 'gestionar_roles_permisos' },
      { etiqueta: 'Tokens API', ruta: '/admin/tokens', icono: 'i-lucide-terminal', permiso: 'gestionar_tokens_api' },
    ],
  },
]

// ------------------------------------------------------------------------------
// COMPUTADAS
// ------------------------------------------------------------------------------
const categoriasVisibles = computed(() => {
  return categorias
    .map(c => ({
      ...c,
      enlaces: c.enlaces.filter(e => !e.permiso || (usuario.value?.permisos?.includes(e.permiso) ?? false)),
    }))
    .filter(c => c.enlaces.length > 0)
})

// ------------------------------------------------------------------------------
// MÉTODOS
// ------------------------------------------------------------------------------
function esActivo(enlace: EnlaceSidebar): boolean {
  return enlace.exacto ? route.path === enlace.ruta : route.path.startsWith(enlace.ruta)
}
</script>
