<template>
  <div class="space-y-6">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Usuarios y Accesos"
      descripcion="Administración de cuentas internas del personal, asignación de roles y control de privilegios de acceso."
    />

    <!-- Mensajes de Éxito o Error -->
    <div
      v-if="mensajeAccion" class="p-4 rounded-xl text-sm border flex items-center justify-between"
      :class="errorAccion ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
    >
      <span>{{ mensajeAccion }}</span>
      <button class="font-bold underline ml-2" @click="mensajeAccion = ''">Cerrar</button>
    </div>

    <!-- Tabla CRUD Reutilizable con Botón de Creación Integrado -->
    <TablaCrud
      v-model:busqueda="terminoBusqueda"
      titulo="Cuentas del Personal"
      placeholder-busqueda="Buscar usuarios por nombre, correo o rol..."
      :columnas="columnas"
      :datos="datosPaginados"
      :cargando="cargando"
      :total-registros="usuariosFiltrados.length"
      :pagina-actual="paginaActual"
      :tamanio-pagina="tamanioPagina"
      mostrar-boton-crear
      texto-boton-crear="Crear Usuario Interno"
      icono-boton-crear="i-lucide-user-plus"
      @update:busqueda="paginaActual = 1"
      @crear="mostrarModalCrear = true"
      @cambiar-pagina="p => paginaActual = p"
      @cambiar-tamanio="t => { tamanioPagina = t; paginaActual = 1 }"
    >

      <!-- Slots de Celdas Personalizadas -->
      <template #id-cell="{ row }">
        <span class="font-mono text-xs text-neutral-500 font-semibold">#{{ row.original.id }}</span>
      </template>

      <template #nombre-cell="{ row }">
        <div>
          <div class="font-semibold text-neutral-900">{{ row.original.nombre }}</div>
          <div class="text-xs text-neutral-500">{{ row.original.correo }}</div>
        </div>
      </template>

      <template #rolNombre-cell="{ row }">
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ row.original.rolNombre }}
        </UBadge>
      </template>

      <template #activo-cell="{ row }">
        <UBadge :color="row.original.activo ? 'success' : 'neutral'" variant="subtle" size="xs">
          {{ row.original.activo ? 'Activo' : 'Inactivo' }}
        </UBadge>
      </template>

      <template #creadoEn-cell="{ row }">
        <span class="text-xs font-mono text-neutral-500">
          {{ formatearFechaRegistro(row.original.creadoEn) }}
        </span>
      </template>

      <template #acciones-cell="{ row }">
        <div class="flex items-center gap-2">
          <!-- Botón Editar (Amarillo) -->
          <UButton
            color="warning"
            variant="subtle"
            size="xs"
            icon="i-lucide-pencil"
            @click="abrirEditarUsuarioModal(row.original)"
          >
            Editar
          </UButton>

          <!-- Botón Desactivar / Eliminar (Rojo) o Activar (Verde) -->
          <UButton
            :color="row.original.activo ? 'error' : 'success'"
            variant="subtle"
            size="xs"
            :icon="row.original.activo ? 'i-lucide-user-x' : 'i-lucide-user-check'"
            :disabled="row.original.id === usuarioActual?.id || guardandoId === row.original.id"
            @click="alternarEstatus(row.original)"
          >
            {{ row.original.activo ? 'Desactivar' : 'Activar' }}
          </UButton>
        </div>
      </template>
    </TablaCrud>

    <!-- Modal para Editar Usuario Existente (EditarUsuarioModal) -->
    <div
      v-if="mostrarEditarUsuarioModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <h2 class="text-lg font-bold text-neutral-900">Editar Usuario #{{ formularioEditar.id }}</h2>
          <button class="text-neutral-400 hover:text-neutral-600" @click="mostrarEditarUsuarioModal = false">✕</button>
        </div>

        <UForm
          :schema="esquemaEditarUsuario" :state="formularioEditar" class="space-y-4"
          @submit="guardarEdicionUsuario"
        >
          <UFormField label="Nombre Completo" name="nombre" required>
            <UInput v-model="formularioEditar.nombre" type="text" placeholder="Ej. Carlos Mendoza" class="w-full" />
          </UFormField>

          <UFormField label="Correo Electrónico" name="correo" required>
            <UInput v-model="formularioEditar.correo" type="email" placeholder="carlos@tienda.com" class="w-full" />
          </UFormField>

          <UFormField label="Rol en el Sistema" name="rolId" required>
            <select
              v-model="formularioEditar.rolId"
              class="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option v-for="r in respuestaUsuarios?.roles" :key="r.id" :value="r.id">
                {{ r.nombre }} - {{ r.descripcion }}
              </option>
            </select>
          </UFormField>

          <div class="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-200">
            <UButton color="neutral" variant="outline" type="button" @click="mostrarEditarUsuarioModal = false">
              Cancelar
            </UButton>
            <UButton color="neutral" variant="solid" type="submit" :loading="editandoUsuario">
              Guardar Cambios
            </UButton>
          </div>
        </UForm>
      </div>
    </div>

    <!-- Modal para Crear Nuevo Usuario -->
    <div
      v-if="mostrarModalCrear"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <h2 class="text-lg font-bold text-neutral-900">Crear Usuario Interno</h2>
          <button class="text-neutral-400 hover:text-neutral-600" @click="mostrarModalCrear = false">✕</button>
        </div>

        <UForm :schema="esquemaNuevoUsuario" :state="formularioNuevo" class="space-y-4" @submit="crearUsuario">
          <UFormField label="Nombre Completo" name="nombre" required>
            <UInput v-model="formularioNuevo.nombre" type="text" placeholder="Ej. Carlos Mendoza" class="w-full" />
          </UFormField>

          <UFormField label="Correo Electrónico" name="correo" required>
            <UInput v-model="formularioNuevo.correo" type="email" placeholder="carlos@tienda.com" class="w-full" />
          </UFormField>

          <UFormField label="Contraseña" name="password" description="Mínimo 6 caracteres" required>
            <UInput v-model="formularioNuevo.password" type="password" placeholder="••••••••" class="w-full" />
          </UFormField>

          <UFormField label="Rol en el Sistema" name="rolId" required>
            <select
              v-model="formularioNuevo.rolId"
              class="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option v-for="r in respuestaUsuarios?.roles" :key="r.id" :value="r.id">
                {{ r.nombre }} - {{ r.descripcion }}
              </option>
            </select>
          </UFormField>

          <div class="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-200">
            <UButton color="neutral" variant="outline" type="button" @click="mostrarModalCrear = false">
              Cancelar
            </UButton>
            <UButton color="neutral" variant="solid" type="submit" :loading="creandoUsuario">
              Guardar Usuario
            </UButton>
          </div>
        </UForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista Gestión de Usuarios · pages/admin/usuarios.vue
// Administración de usuarios, asignación de roles con TablaCrud compartida
// ==============================================================================

// ------------------------------------------------------------------------------
// IMPORTACIONES
// ------------------------------------------------------------------------------
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

// ------------------------------------------------------------------------------
// METADATOS Y LAYOUT
// ------------------------------------------------------------------------------
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
})

// ------------------------------------------------------------------------------
// ESQUEMAS DE VALIDACIÓN (ZOD)
// ------------------------------------------------------------------------------
const esquemaNuevoUsuario = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  correo: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rolId: z.coerce.number().positive('Selecciona un rol válido'),
})

const esquemaEditarUsuario = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  correo: z.string().email('Ingresa un correo electrónico válido'),
  rolId: z.coerce.number().positive('Selecciona un rol válido'),
})

type EsquemaNuevoUsuario = z.output<typeof esquemaNuevoUsuario>
type EsquemaEditarUsuario = z.output<typeof esquemaEditarUsuario>

// ------------------------------------------------------------------------------
// COMPOSABLES Y ESTADO REACTIVO
// ------------------------------------------------------------------------------
const { usuario: usuarioActual } = useAuth()

const guardandoId = ref<number | null>(null)
const creandoUsuario = ref(false)
const editandoUsuario = ref(false)
const mostrarModalCrear = ref(false)
const mostrarEditarUsuarioModal = ref(false)
const mensajeAccion = ref('')
const errorAccion = ref(false)

const paginaActual = ref(1)
const { tamanioPagina } = usePaginacionPantalla({ margenOffset: 340 })

const formularioNuevo = reactive({
  nombre: '',
  correo: '',
  password: '',
  rolId: 1,
})

const formularioEditar = reactive({
  id: 0,
  nombre: '',
  correo: '',
  rolId: 1,
})

// ------------------------------------------------------------------------------
// CARGA DE DATOS DE USUARIOS
// ------------------------------------------------------------------------------
const requestFetch = useRequestFetch()
const { data: respuestaUsuarios, status, refresh: refrescarUsuarios } = await useAsyncData<any>(
  'admin-usuarios-lista',
  () => requestFetch('/api/admin/usuarios')
)

const terminoBusqueda = ref('')
const cargando = computed(() => status.value === 'pending' && !respuestaUsuarios.value)

const listaUsuarios = computed(() => respuestaUsuarios.value?.usuarios || [])

// Filtrado reactivo por término de búsqueda
const usuariosFiltrados = computed(() => {
  if (!terminoBusqueda.value.trim()) return listaUsuarios.value
  const t = terminoBusqueda.value.toLowerCase().trim()
  return listaUsuarios.value.filter((u: any) =>
    u.nombre?.toLowerCase().includes(t) ||
    u.correo?.toLowerCase().includes(t) ||
    u.rolNombre?.toLowerCase().includes(t)
  )
})

const datosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * tamanioPagina.value
  return usuariosFiltrados.value.slice(inicio, inicio + tamanioPagina.value)
})

// Preseleccionar primer rol si no está asignado
watchEffect(() => {
  if (respuestaUsuarios.value?.roles?.length && !formularioNuevo.rolId) {
    formularioNuevo.rolId = respuestaUsuarios.value.roles[0].id
  }
})

// ------------------------------------------------------------------------------
// DEFINICIÓN DE COLUMNAS PARA UTable
// ------------------------------------------------------------------------------
const columnas = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'nombre', header: 'Usuario' },
  { accessorKey: 'rolNombre', header: 'Rol Asignado' },
  { accessorKey: 'activo', header: 'Estatus' },
  { accessorKey: 'creadoEn', header: 'Fecha Registro' },
  { accessorKey: 'acciones', header: 'Acciones' },
]

// ------------------------------------------------------------------------------
// MÉTODOS Y ACCIONES
// ------------------------------------------------------------------------------
async function alternarEstatus(u: any) {
  guardandoId.value = u.id
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    await $fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'PATCH',
      body: { activo: !u.activo },
    })
    mensajeAccion.value = `Usuario ${u.nombre} ${u.activo ? 'desactivado' : 'activado'} correctamente.`
    await refrescarUsuarios()
  } catch (error: any) {
    errorAccion.value = true
    mensajeAccion.value = error.data?.statusMessage || error.message || 'Error al actualizar usuario.'
  } finally {
    guardandoId.value = null
  }
}

async function crearUsuario(evento: FormSubmitEvent<EsquemaNuevoUsuario>) {
  creandoUsuario.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    await $fetch('/api/admin/usuarios', {
      method: 'POST',
      body: evento.data,
    })

    mensajeAccion.value = `Usuario ${evento.data.nombre} creado exitosamente.`
    mostrarModalCrear.value = false
    formularioNuevo.nombre = ''
    formularioNuevo.correo = ''
    formularioNuevo.password = ''
    await refrescarUsuarios()
  } catch (error: any) {
    errorAccion.value = true
    mensajeAccion.value = error.data?.statusMessage || error.message || 'Error al crear usuario.'
  } finally {
    creandoUsuario.value = false
  }
}

function abrirEditarUsuarioModal(u: any) {
  formularioEditar.id = u.id
  formularioEditar.nombre = u.nombre
  formularioEditar.correo = u.correo
  formularioEditar.rolId = u.rolId
  mostrarEditarUsuarioModal.value = true
}

async function guardarEdicionUsuario(evento: FormSubmitEvent<EsquemaEditarUsuario>) {
  editandoUsuario.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    await $fetch(`/api/admin/usuarios/${formularioEditar.id}`, {
      method: 'PATCH',
      body: evento.data,
    })

    mensajeAccion.value = `Usuario ${evento.data.nombre} actualizado correctamente.`
    mostrarEditarUsuarioModal.value = false
    await refrescarUsuarios()
  } catch (error: any) {
    errorAccion.value = true
    mensajeAccion.value = error.data?.statusMessage || error.message || 'Error al actualizar usuario.'
  } finally {
    editandoUsuario.value = false
  }
}

function formatearFechaRegistro(fechaStr?: string | null): string {
  if (!fechaStr) return 'N/D'
  return String(fechaStr).substring(0, 10)
}
</script>
