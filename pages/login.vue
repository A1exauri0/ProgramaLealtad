<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 p-4 relative overflow-hidden">
    <!-- Círculos decorativos de fondo con desenfoque suave -->
    <div class="absolute -top-32 -left-32 size-96 bg-neutral-200/50 rounded-full blur-3xl pointer-events-none" />
    <div class="absolute -bottom-32 -right-32 size-96 bg-neutral-300/40 rounded-full blur-3xl pointer-events-none" />

    <!-- Card Contenedora del Login -->
    <div class="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-8 border border-neutral-200/80 shadow-2xl shadow-neutral-900/10 space-y-6 relative z-10">
      <!-- Marca y Título -->
      <div class="text-center space-y-3">
        <div class="flex justify-center">
          <LogoTienda tamanio="xl" />
        </div>
        <div>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200">
            <UIcon name="i-lucide-shield-check" class="size-3 text-neutral-600" />
            Panel Administrativo
          </span>
          <h1 class="text-2xl font-black tracking-tight text-neutral-900 mt-2">
            Iniciar Sesión
          </h1>
          <p class="text-xs text-neutral-500 mt-1">
            Ingresa tus credenciales del equipo para acceder al panel
          </p>
        </div>
      </div>

      <!-- Alerta de Error -->
      <UAlert
        v-if="errorAlerta"
        color="error"
        variant="soft"
        icon="i-lucide-alert-triangle"
        :title="errorAlerta"
        class="text-xs"
      />

      <!-- Formulario de Acceso con UForm y Zod -->
      <UForm
        :schema="esquemaLogin"
        :state="formularioLogin"
        class="space-y-4"
        @submit="manejarEnvioLogin"
      >
        <!-- Campo Correo -->
        <UFormField label="Correo Electrónico" name="correo" required>
          <UInput
            v-model="formularioLogin.correo"
            type="email"
            placeholder="ejemplo@correo.com"
            icon="i-lucide-mail"
            size="lg"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <!-- Campo Contraseña con Toggle de Visibilidad -->
        <UFormField label="Contraseña" name="password" required>
          <div class="relative w-full">
            <UInput
              v-model="formularioLogin.password"
              :type="mostrarPassword ? 'text' : 'password'"
              placeholder="••••••••"
              icon="i-lucide-lock"
              size="lg"
              autocomplete="current-password"
              class="w-full"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
              :title="mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
              @click="mostrarPassword = !mostrarPassword"
            >
              <UIcon :name="mostrarPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-4" />
            </button>
          </div>
        </UFormField>

        <!-- Botón de Envío -->
        <div class="pt-2">
          <UButton
            type="submit"
            color="neutral"
            variant="solid"
            size="lg"
            block
            :loading="cargando"
            icon="i-lucide-log-in"
            class="font-bold tracking-tight shadow-sm hover:shadow-md transition-all"
          >
            Entrar al Panel
          </UButton>
        </div>
      </UForm>

      <!-- Pie de Tarjeta con Redirección al Portal de Clientes -->
      <div class="pt-4 border-t border-neutral-100 text-center">
        <p class="text-xs text-neutral-500">
          ¿Eres cliente del Club de Lealtad?
        </p>
        <NuxtLink
          to="/portal/login"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-900 hover:text-neutral-700 hover:underline mt-1 transition-colors"
        >
          <span>Ir al Portal de Clientes</span>
          <UIcon name="i-lucide-arrow-right" class="size-3.5" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista de Inicio de Sesión · Login.vue
// Acceso seguro mediante UForm, esquema tipado con Zod y diseño prémium
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

const mostrarPassword = ref(false)
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
