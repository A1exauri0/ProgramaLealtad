<template>
  <div class="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-3xl p-8 border border-neutral-200 shadow-xl space-y-6">
      <!-- Marca y Título -->
      <div class="text-center space-y-2">
        <div class="inline-flex size-12 rounded-2xl bg-neutral-900 text-white items-center justify-center font-bold text-lg mb-2 shadow-sm">
          PL
        </div>
        <h1 class="text-2xl font-extrabold tracking-tight text-neutral-900">
          Club de Fidelidad
        </h1>
        <p class="text-xs text-neutral-500">
          Inicia sesión para consultar tus puntos y canjear recompensas exclusivas
        </p>
      </div>

      <!-- Alerta de Error -->
      <div
        v-if="mensajeError"
        class="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-start gap-2.5"
      >
        <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0 mt-0.5" />
        <span>{{ mensajeError }}</span>
      </div>

      <!-- Formulario de Acceso -->
      <form class="space-y-4" @submit.prevent="ejecutarLogin">
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-neutral-700">Correo Electrónico</label>
          <UInput
            v-model="formulario.correo"
            type="email"
            placeholder="ejemplo@correo.com"
            icon="i-lucide-mail"
            class="w-full"
            required
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-neutral-700">Contraseña</label>
          <UInput
            v-model="formulario.password"
            type="password"
            placeholder="••••••••"
            icon="i-lucide-lock"
            class="w-full"
            required
          />
        </div>

        <UButton
          type="submit"
          color="neutral"
          variant="solid"
          block
          size="lg"
          :loading="cargando"
          class="w-full justify-center font-bold"
        >
          Acceder al Portal
        </UButton>
      </form>

      <!-- Nota Informativa de Clave Temporal -->
      <div class="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center text-xs text-neutral-500 space-y-1">
        <span class="font-semibold text-neutral-700 block">¿Es tu primera vez aquí?</span>
        <p class="text-[11px] leading-relaxed">
          El personal de la tienda puede proporcionarte tu contraseña temporal de acceso.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista: Inicio de Sesión Portal de Clientes · pages/portal/login.vue
// ==============================================================================

// ------------------------------------------------------------------------------
// METADATOS Y LAYOUT
// ------------------------------------------------------------------------------
definePageMeta({
  layout: false,
  middleware: 'portal-auth',
})

// ------------------------------------------------------------------------------
// COMPOSABLES Y ESTADO
// ------------------------------------------------------------------------------
const { iniciarSesionPortal } = usePortalAuth()

const formulario = reactive({
  correo: '',
  password: '',
})

const cargando = ref(false)
const mensajeError = ref('')

// ------------------------------------------------------------------------------
// ACCIÓN DE INICIO DE SESIÓN
// ------------------------------------------------------------------------------
async function ejecutarLogin() {
  mensajeError.value = ''
  cargando.value = true

  try {
    const res = await iniciarSesionPortal(formulario.correo, formulario.password)
    if (res.requiereCambioPassword) {
      await navigateTo('/portal/cambiar-password')
    } else {
      await navigateTo('/portal')
    }
  } catch (error: any) {
    mensajeError.value = error.data?.statusMessage || error.message || 'No se pudo iniciar sesión.'
  } finally {
    cargando.value = false
  }
}
</script>
