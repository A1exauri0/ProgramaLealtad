<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 p-4 relative overflow-hidden">
    <!-- Círculos decorativos de fondo -->
    <div class="absolute -top-32 -right-32 size-96 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
    <div class="absolute -bottom-32 -left-32 size-96 bg-neutral-200/50 rounded-full blur-3xl pointer-events-none" />

    <!-- Card Contenedora del Login del Cliente -->
    <div class="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-8 border border-neutral-200/80 shadow-2xl shadow-neutral-900/10 space-y-6 relative z-10">
      <!-- Marca y Título -->
      <div class="text-center space-y-3">
        <div class="flex justify-center">
          <LogoTienda tamanio="xl" />
        </div>
        <div>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            <UIcon name="i-lucide-sparkles" class="size-3 text-amber-600" />
            Portal de Autoservicio
          </span>
          <h1 class="text-2xl font-black tracking-tight text-neutral-900 mt-2">
            Club de Fidelidad
          </h1>
          <p class="text-xs text-neutral-500 mt-1">
            Consulta tus puntos acumulados, nivel y canjea recompensas exclusivas
          </p>
        </div>
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
            size="lg"
            class="w-full"
            required
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-neutral-700">Contraseña</label>
          <div class="relative w-full">
            <UInput
              v-model="formulario.password"
              :type="mostrarPassword ? 'text' : 'password'"
              placeholder="••••••••"
              icon="i-lucide-lock"
              size="lg"
              class="w-full"
              required
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
        </div>

        <UButton
          type="submit"
          color="neutral"
          variant="solid"
          block
          size="lg"
          :loading="cargando"
          icon="i-lucide-log-in"
          class="w-full justify-center font-bold tracking-tight shadow-sm hover:shadow-md transition-all"
        >
          Acceder a mis Beneficios
        </UButton>
      </form>

      <!-- Nota Informativa de Clave Temporal -->
      <div class="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center text-xs text-neutral-600 space-y-1">
        <div class="flex items-center justify-center gap-1 font-bold text-neutral-800">
          <UIcon name="i-lucide-key-round" class="size-3.5 text-neutral-600" />
          <span>¿Es tu primera vez aquí?</span>
        </div>
        <p class="text-[11px] text-neutral-500 leading-relaxed">
          El personal de la tienda puede generar tu contraseña temporal en caja o en atención al cliente.
        </p>
      </div>

      <!-- Pie con Enlace al Panel Interno -->
      <div class="pt-3 border-t border-neutral-100 text-center">
        <p class="text-[11px] text-neutral-400">
          ¿Perteneces al equipo de la tienda?
        </p>
        <NuxtLink
          to="/login"
          class="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 hover:text-neutral-900 hover:underline mt-0.5 transition-colors"
        >
          <span>Acceso para Personal y Administradores</span>
          <UIcon name="i-lucide-arrow-right" class="size-3" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista: Inicio de Sesión Portal de Clientes · pages/portal/login.vue
// Diseño visual prémium con logotipo oficial y soporte para mostrar contraseña
// ==============================================================================

// ------------------------------------------------------------------------------
// METADATOS Y LAYOUT
// ------------------------------------------------------------------------------
definePageMeta({
  layout: false,
  middleware: 'portal-auth',
})

// ------------------------------------------------------------------------------
// COMPOSABLES Y ESTADO REACTIVO
// ------------------------------------------------------------------------------
const { iniciarSesionPortal } = usePortalAuth()

const formulario = reactive({
  correo: '',
  password: '',
})

const cargando = ref(false)
const mostrarPassword = ref(false)
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
