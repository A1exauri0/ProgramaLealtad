<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900">
          {{ titulo }}
        </h1>
        <UBadge
          v-if="badgeTexto !== undefined && badgeTexto !== null"
          :color="badgeColor || 'neutral'"
          variant="subtle"
          size="md"
        >
          {{ badgeTexto }}
        </UBadge>
      </div>
      <p v-if="descripcion" class="text-xs text-neutral-500 mt-1">
        {{ descripcion }}
      </p>
    </div>

    <!-- Acciones en el extremo derecho de la cabecera -->
    <div v-if="$slots.acciones || $slots.default" class="flex items-center gap-3">
      <slot name="acciones">
        <slot />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Componente de Cabecera Unificada de Vista · CabeceraPagina.vue
// Garantiza que todas las páginas tengan exactamente la misma tipografía y disposición
// ==============================================================================

defineProps<{
  titulo: string
  descripcion?: string
  badgeTexto?: string | number
  badgeColor?: 'neutral' | 'primary' | 'success' | 'warning' | 'error'
}>()
</script>
