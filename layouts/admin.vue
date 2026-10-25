<template>
  <div class="min-h-screen bg-white text-neutral-900 flex">
    <!-- Overlay móvil para Sidebar -->
    <div
      v-if="sidebarAbierto" class="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
      @click="sidebarAbierto = false"
    />

    <!-- Componente Barra Lateral (Sidebar) -->
    <AppSidebar :abierto="sidebarAbierto" @cerrar="sidebarAbierto = false" />

    <!-- Contenedor Principal (Navbar + Contenido + Footer) -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Componente Barra Superior (Navbar) -->
      <AppNavbar @toggle-sidebar="sidebarAbierto = !sidebarAbierto" />

      <!-- Área de Contenido Principal -->
      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Layout Administrativo · layouts/admin.vue
// Ensambla AppSidebar, AppNavbar y contenedor central
// ==============================================================================

// ------------------------------------------------------------------------------
// ESTADO REACTIVO
// ------------------------------------------------------------------------------
const sidebarAbierto = ref(false)
</script>
