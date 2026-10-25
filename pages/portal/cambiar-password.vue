<template>
  <div class="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-3xl p-8 border border-neutral-200 shadow-xl space-y-6">
      <!-- Encabezado -->
      <div class="text-center space-y-2">
        <div class="inline-flex size-12 rounded-2xl bg-amber-50 text-amber-700 items-center justify-center font-bold text-lg mb-2 border border-amber-200">
          <UIcon name="i-lucide-shield-alert" class="size-6" />
        </div>
        <h1 class="text-2xl font-extrabold tracking-tight text-neutral-900">
          Actualiza tu Contraseña
        </h1>
        <p class="text-xs text-neutral-500">
          Has ingresado con una contraseña temporal. Por seguridad de tu cuenta, define una contraseña personal definitiva.
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

      <!-- Formulario de Cambio de Contraseña -->
      <form class="space-y-4" @submit.prevent="ejecutarCambio">
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-neutral-700">Contraseña Temporal Actual</label>
          <UInput
            v-model="formulario.passwordActual"
            type="password"
            placeholder="La clave con la que entraste"
            icon="i-lucide-key"
            class="w-full"
            required
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-neutral-700">Nueva Contraseña Definitiva</label>
          <UInput
            v-model="formulario.passwordNuevo"
            type="password"
            placeholder="Mínimo 6 caracteres"
            icon="i-lucide-lock"
            class="w-full"
            required
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-neutral-700">Confirmar Nueva Contraseña</label>
          <UInput
            v-model="formulario.confirmarPassword"
            type="password"
            placeholder="Repite tu nueva contraseña"
            icon="i-lucide-check"
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
          Guardar y Continuar al Portal
        </UButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista: Cambio Obligatorio de Contraseña · pages/portal/cambiar-password.vue
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
const toast = useToast()
const { cambiarPasswordPortal } = usePortalAuth()

const formulario = reactive({
  passwordActual: '',
  passwordNuevo: '',
  confirmarPassword: '',
})

const cargando = ref(false)
const mensajeError = ref('')

// ------------------------------------------------------------------------------
// ACCIÓN DE CAMBIO DE CONTRASEÑA
// ------------------------------------------------------------------------------
async function ejecutarCambio() {
  mensajeError.value = ''

  if (formulario.passwordNuevo.length < 6) {
    mensajeError.value = 'La nueva contraseña debe tener al menos 6 caracteres.'
    return
  }

  if (formulario.passwordNuevo !== formulario.confirmarPassword) {
    mensajeError.value = 'Las contraseñas no coinciden.'
    return
  }

  cargando.value = true
  try {
    const res = await cambiarPasswordPortal(formulario)
    toast.add({
      title: 'Contraseña Actualizada',
      description: res.mensaje,
      color: 'success',
    })
    await navigateTo('/portal')
  } catch (error: any) {
    mensajeError.value = error.data?.statusMessage || error.message || 'Error al actualizar la contraseña.'
  } finally {
    cargando.value = false
  }
}
</script>
