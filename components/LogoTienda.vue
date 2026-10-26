<template>
  <div
    class="inline-flex items-center justify-center shrink-0 overflow-hidden rounded-xl bg-white border border-neutral-200 shadow-xs transition-transform duration-200 hover:scale-105"
    :class="clasesContenedor"
  >
    <img
      src="/logo.png"
      alt="Logo Tienda"
      class="object-contain p-1"
      :class="clasesImagen"
    >
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Componente de Marca · LogoTienda.vue
// Renderiza el logotipo oficial de la tienda física / e-commerce
// ==============================================================================

const props = withDefaults(
  defineProps<{
    tamanio?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  {
    tamanio: 'md',
  }
)

const clasesContenedor = computed(() => {
  switch (props.tamanio) {
    case 'xs':
      return 'size-7 rounded-lg'
    case 'sm':
      return 'size-9 rounded-xl'
    case 'md':
      return 'size-11 rounded-2xl'
    case 'lg':
      return 'size-14 rounded-2xl shadow-sm'
    case 'xl':
      return 'size-20 rounded-3xl shadow-md'
    default:
      return 'size-11 rounded-2xl'
  }
})

const clasesImagen = computed(() => {
  switch (props.tamanio) {
    case 'xs':
      return 'size-5'
    case 'sm':
      return 'size-7'
    case 'md':
      return 'size-9'
    case 'lg':
      return 'size-11'
    case 'xl':
      return 'size-16'
    default:
      return 'size-9'
  }
})
</script>
