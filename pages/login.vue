<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
    <!-- Card Contenedora del Login -->
    <UCard class="w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-800">
      <div class="mb-5 text-center">
        <h1 class="text-xl font-bold text-neutral-900 ">
          Programa de Lealtad
        </h1>
        <p class="text-xs text-neutral-500 mt-1">
          Ingresa tus credenciales para acceder al panel
        </p>
      </div>

      <!-- Alerta de Error -->
      <UAlert
        v-if="errorAlerta" color="error" variant="soft" icon="i-lucide-alert-triangle" :title="errorAlerta"
        class="mb-4"
      />

      <!-- Formulario de Acceso con UForm y Zod -->
      <UForm :schema="esquemaLogin" :state="formularioLogin" class="space-y-4" @submit="manejarEnvioLogin">
        <!-- Campo Correo -->
        <UFormField label="Correo Electrónico" name="correo" required>
          <UInput
            v-model="formularioLogin.correo" type="email" placeholder="ejemplo@correo.com" icon="i-lucide-mail"
            size="md" autocomplete="email" class="w-full"
          />
        </UFormField>

        <!-- Campo Contraseña -->
        <UFormField label="Contraseña" name="password" required>
          <UInput
            v-model="formularioLogin.password" type="password" placeholder="••••••••" icon="i-lucide-lock"
            size="md" autocomplete="current-password" class="w-full"
          />
        </UFormField>

        <!-- Botón de Envío -->
        <div class="pt-2">
          <UButton
            type="submit" color="neutral" variant="solid" size="md" block :loading="cargando"
            icon="i-lucide-log-in"
          >
            Iniciar Sesión
          </UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista de Inicio de Sesión · Login.vue
// Acceso seguro mediante UForm y esquema de validación tipado con Zod
// ==============================================================================

// ------------------------------------------------------------------------------
// IMPORTACIONES
// ------------------------------------------------------------------------------
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false,
})

// ------------------------------------------------------------------------------
// ESQUEMA DE VALIDACIÓN (ZOD)
// ------------------------------------------------------------------------------
const esquemaLogin = z.object({
  correo: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type EsquemaLogin = z.output<typeof esquemaLogin>

// ------------------------------------------------------------------------------
// COMPOSABLES Y ESTADO REACTIVO
// ------------------------------------------------------------------------------
const { iniciarSesion, estaAutenticado, cargando } = useAuth()
const router = useRouter()

const formularioLogin = reactive({
  correo: '',
  password: '',
})

const errorAlerta = ref<string | null>(null)

// ------------------------------------------------------------------------------
// REDIRECCIÓN SI YA ESTÁ AUTENTICADO
// ------------------------------------------------------------------------------
onMounted(() => {
  if (estaAutenticado.value) {
    router.push('/')
  }
})

// ------------------------------------------------------------------------------
// MANEJADOR DE ENVÍO
// ------------------------------------------------------------------------------
async function manejarEnvioLogin(evento: FormSubmitEvent<EsquemaLogin>) {
  errorAlerta.value = null

  const { correo, password } = evento.data

  const resultado = await iniciarSesion(correo, password)

  if (resultado.exito) {
    router.push('/')
  } else {
    errorAlerta.value = resultado.mensaje || 'Error al iniciar sesión'
  }
}
</script>
