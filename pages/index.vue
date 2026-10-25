<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
    <div class="text-center space-y-4">
      <h1 class="text-xl font-semibold text-gray-800 dark:text-gray-200">
        Panel de Inicio
      </h1>
      <div>
        <UButton
          color="error"
          size="lg"
          icon="i-heroicons-arrow-left-on-rectangle"
          :loading="cargando"
          @click="cerrarSesion"
        >
          Cerrar Sesión
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista Principal (pages/index.vue) · Minimalista con botón de Logout
// ==============================================================================

import { useAuth } from '~/composables/useAuth'

definePageMeta({
  middleware: 'auth',
})

const { cerrarSesion, cargando } = useAuth()
</script>
