<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
    <!-- Card Contenedora del Login -->
    <UCard class="w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-800">
      <!-- Formulario de Acceso -->
      <form @submit.prevent="manejarEnvioLogin" class="space-y-4 py-2">
        <!-- Alerta de Error -->
        <UAlert
          v-if="errorAlerta" color="error" variant="soft" icon="i-heroicons-exclamation-triangle"
          :title="errorAlerta" class="mb-4"
        />

        <!-- Campo Correo -->
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Correo Electrónico
          </label>
          <UInput
            v-model="formularioLogin.correo" type="email" placeholder="ejemplo@correo.com"
            icon="i-heroicons-envelope" size="lg" required autocomplete="email" class="w-full"
          />
        </div>

        <!-- Campo Contraseña -->
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Contraseña
          </label>
          <UInput
            v-model="formularioLogin.password" type="password" placeholder="••••••••"
            icon="i-heroicons-lock-closed" size="lg" required autocomplete="current-password" class="w-full"
          />
        </div>

        <!-- Botón de Envío -->
        <div class="pt-2">
          <UButton
            type="submit" color="primary" size="lg" block :loading="cargando"
            icon="i-heroicons-arrow-right-on-rectangle"
          >
            Iniciar Sesión
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista de Inicio de Sesión · Login.vue
// Permite el acceso seguro al panel administrativo mediante correo y contraseña
// ==============================================================================

// --- Importaciones de Vue y Nuxt ---
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false,
})

// --- Composables y Utilidades ---
const { iniciarSesion, estaAutenticado, errorMensaje, cargando } = useAuth()
const router = useRouter()

// --- Estado Local del Formulario ---
const formularioLogin = reactive({
  correo: '',
  password: '',
})

const errorAlerta = ref<string | null>(null)

// --- Redirección si ya está autenticado ---
onMounted(() => {
  if (estaAutenticado.value) {
    router.push('/')
  }
})

// --- Manejador del Envío del Formulario (Submit Handler) ---
const manejarEnvioLogin = async () => {
  errorAlerta.value = null

  if (!formularioLogin.correo || !formularioLogin.password) {
    errorAlerta.value = 'Por favor ingresa tu correo y contraseña.'
    return
  }

  const resultado = await iniciarSesion(
    formularioLogin.correo,
    formularioLogin.password
  )

  if (resultado.exito) {
    // Redirigir al inicio tras login exitoso
    router.push('/')
  } else {
    errorAlerta.value = resultado.mensaje || 'Error al iniciar sesión'
  }
}
</script>
