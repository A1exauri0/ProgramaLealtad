<template>
  <div class="space-y-6">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Tokens de API (Evaluación)"
      descripcion="Generación y revocación de tokens Bearer para los endpoints públicos /api/fidelizacion/*. Solo se almacena su hash SHA-256."
      :badge-texto="`${listaTokens.length} tokens`"
      badge-color="neutral"
    >
      <template #acciones>
        <UButton
          color="neutral"
          variant="solid"
          size="sm"
          icon="i-lucide-key-round"
          @click="mostrarCrearTokenModal = true"
        >
          Generar Token Bearer
        </UButton>
      </template>
    </CabeceraPagina>

    <!-- Mensajes de Acción -->
    <div
      v-if="mensajeAccion"
      class="p-4 rounded-xl text-sm border flex items-center justify-between"
      :class="errorAccion ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
    >
      <span>{{ mensajeAccion }}</span>
      <button class="font-bold underline ml-2 text-xs" @click="mensajeAccion = ''">Cerrar</button>
    </div>

    <!-- Tabla de Tokens API -->
    <TablaCrud
      titulo="Tokens Registrados (SHA-256)"
      :columnas="columnas"
      :datos="listaTokens"
      :cargando="cargando"
      :mostrar-paginacion="false"
      mensaje-vacio="No hay tokens de API registrados."
    >
      <template #id-cell="{ row }">
        <span class="font-mono text-xs text-neutral-500 font-semibold">#{{ row.original.id }}</span>
      </template>

      <template #nombre-cell="{ row }">
        <div>
          <div class="font-semibold text-neutral-900">{{ row.original.nombre }}</div>
          <div class="text-xs text-neutral-500">Creado por: {{ row.original.creadoPorNombre }}</div>
        </div>
      </template>

      <template #hashResumen-cell="{ row }">
        <code class="font-mono text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
          SHA256: {{ row.original.hashResumen }}
        </code>
      </template>

      <template #revocado-cell="{ row }">
        <UBadge :color="row.original.revocado ? 'error' : 'success'" variant="subtle" size="xs">
          {{ row.original.revocado ? 'Revocado' : 'Activo' }}
        </UBadge>
      </template>

      <template #ultimoUsoEn-cell="{ row }">
        <span class="text-xs font-mono text-neutral-600">
          {{ row.original.ultimoUsoEn ? String(row.original.ultimoUsoEn).substring(0, 19).replace('T', ' ') : 'Sin uso aún' }}
        </span>
      </template>

      <template #acciones-cell="{ row }">
        <UButton
          :color="row.original.revocado ? 'success' : 'error'"
          variant="subtle"
          size="xs"
          :icon="row.original.revocado ? 'i-lucide-rotate-ccw' : 'i-lucide-ban'"
          :loading="procesandoId === row.original.id"
          @click="alternarRevocacion(row.original)"
        >
          {{ row.original.revocado ? 'Reactivar' : 'Revocar' }}
        </UButton>
      </template>
    </TablaCrud>

    <!-- Modal: Crear Nuevo Token (CrearTokenModal) -->
    <div
      v-if="mostrarCrearTokenModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <h2 class="text-lg font-bold text-neutral-900">Generar Nuevo Token de API</h2>
          <button class="text-neutral-400 hover:text-neutral-600" @click="mostrarCrearTokenModal = false">✕</button>
        </div>

        <div class="space-y-3">
          <label class="block text-xs font-semibold text-neutral-700">Nombre / Identificador del Evaluador *</label>
          <UInput
            v-model="nombreNuevoToken"
            placeholder="Ej. Evaluador Prueba Técnica Oficial"
            class="w-full"
          />
          <p class="text-xs text-neutral-500">
            El token en texto plano se mostrará <strong>una sola vez</strong>. En la base de datos únicamente se almacenará su hash criptográfico SHA-256.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
          <UButton color="neutral" variant="outline" @click="mostrarCrearTokenModal = false">
            Cancelar
          </UButton>
          <UButton color="neutral" variant="solid" :loading="creandoToken" @click="generarToken">
            Generar Token
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal: Mostrar Token Generado por Única Vez (TokenGeneradoModal) -->
    <div
      v-if="tokenRecienCreado"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        <div class="flex items-center gap-3 text-emerald-700">
          <div class="size-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <UIcon name="i-lucide-key-round" class="size-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-neutral-900">Token Bearer Generado</h2>
            <p class="text-xs text-neutral-500">Cópialo ahora; por seguridad no podrás volver a verlo.</p>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-neutral-900 text-white space-y-2">
          <span class="text-[11px] uppercase tracking-wider text-neutral-400 block">Token Bearer ({{ tokenRecienCreado.nombre }})</span>
          <div class="font-mono text-xs break-all select-all text-emerald-400 font-bold">
            {{ tokenRecienCreado.tokenPlano }}
          </div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-copy"
            @click="copiarTokenPlano(tokenRecienCreado.tokenPlano)"
          >
            {{ copiado ? '¡Copiado al portapapeles!' : 'Copiar Token' }}
          </UButton>

          <UButton color="neutral" variant="solid" size="sm" @click="tokenRecienCreado = null">
            Entendido, ya lo guardé
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista Gestión de Tokens API · pages/admin/tokens.vue
// Generación con visualización única y revocación de tokens para /api/fidelizacion/*
// ==============================================================================

// ------------------------------------------------------------------------------
// METADATOS Y LAYOUT
// ------------------------------------------------------------------------------
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  permiso: 'gestionar_tokens_api',
})

// ------------------------------------------------------------------------------
// COMPOSABLES Y ESTADO REACTIVO
// ------------------------------------------------------------------------------
const requestFetch = useRequestFetch()

const mostrarCrearTokenModal = ref(false)
const nombreNuevoToken = ref('')
const creandoToken = ref(false)
const procesandoId = ref<number | null>(null)
const tokenRecienCreado = ref<{ id: number; nombre: string; tokenPlano: string } | null>(null)
const copiado = ref(false)
const mensajeAccion = ref('')
const errorAccion = ref(false)

// ------------------------------------------------------------------------------
// CARGA DE TOKENS
// ------------------------------------------------------------------------------
const { data: respuestaTokens, status, refresh: refrescarTokens } = await useAsyncData<any>(
  'admin-tokens-api',
  () => requestFetch('/api/admin/tokens')
)

const cargando = computed(() => status.value === 'pending' && !respuestaTokens.value)
const listaTokens = computed(() => respuestaTokens.value?.tokens || [])

// ------------------------------------------------------------------------------
// COLUMNAS DE TABLA
// ------------------------------------------------------------------------------
const columnas = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'nombre', header: 'Etiqueta / Destino' },
  { accessorKey: 'hashResumen', header: 'Hash SHA-256 en BD' },
  { accessorKey: 'revocado', header: 'Estado' },
  { accessorKey: 'ultimoUsoEn', header: 'Último Uso' },
  { accessorKey: 'acciones', header: 'Acción' },
]

// ------------------------------------------------------------------------------
// MÉTODOS Y ACCIONES
// ------------------------------------------------------------------------------
async function generarToken() {
  if (!nombreNuevoToken.value.trim()) return

  creandoToken.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    const res: any = await $fetch('/api/admin/tokens', {
      method: 'POST',
      body: { nombre: nombreNuevoToken.value },
    })

    mostrarCrearTokenModal.value = false
    nombreNuevoToken.value = ''
    tokenRecienCreado.value = res.token
    copiado.value = false
    await refrescarTokens()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al generar token.'
  } finally {
    creandoToken.value = false
  }
}

async function alternarRevocacion(token: any) {
  procesandoId.value = token.id
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    const res: any = await $fetch(`/api/admin/tokens/${token.id}`, {
      method: 'PATCH',
      body: { revocado: !token.revocado },
    })
    mensajeAccion.value = res.mensaje
    await refrescarTokens()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al actualizar token.'
  } finally {
    procesandoId.value = null
  }
}

async function copiarTokenPlano(texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    copiado.value = true
  } catch {
    copiado.value = false
  }
}
</script>
