<template>
  <div class="space-y-6">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Roles del Sistema"
      descripcion="Administración de roles internos y asignación de la matriz de privilegios."
    />

    <!-- Mensajes de Notificación -->
    <div
      v-if="mensajeAccion"
      class="p-4 rounded-xl text-sm border flex items-center justify-between transition-all"
      :class="errorAccion ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
    >
      <div class="flex items-center gap-2">
        <UIcon :name="errorAccion ? 'i-lucide-alert-circle' : 'i-lucide-check-circle-2'" class="size-5 shrink-0" />
        <span>{{ mensajeAccion }}</span>
      </div>
      <button class="font-bold underline ml-2 text-xs" @click="mensajeAccion = ''">Cerrar</button>
    </div>

    <!-- Componente CRUD Tabla Reutilizable con Botones de Acción Estándar -->
    <TablaCrud
      v-model:busqueda="terminoBusqueda"
      titulo="Catálogo de Roles"
      placeholder-busqueda="Buscar roles por nombre o descripción..."
      :columnas="columnas"
      :datos="datosPaginados"
      :cargando="cargando"
      :total-registros="rolesFiltrados.length"
      :pagina-actual="paginaActual"
      :tamanio-pagina="tamanioPagina"
      :mostrar-boton-crear="tienePermiso('gestionar_roles_permisos')"
      texto-boton-crear="Nuevo Rol"
      :mostrar-boton-ver="true"
      texto-boton-ver="Ver"
      :mostrar-boton-editar="tienePermiso('gestionar_roles_permisos')"
      texto-boton-editar="Editar"
      :mostrar-boton-eliminar="tienePermiso('gestionar_roles_permisos')"
      texto-boton-eliminar="Eliminar"
      :deshabilitar-boton-eliminar="esRolProtegido"
      @update:busqueda="paginaActual = 1"
      @cambiar-pagina="p => paginaActual = p"
      @cambiar-tamanio="t => { tamanioPagina = t; paginaActual = 1 }"
      @crear="abrirCrearRolModal"
      @ver="abrirVerRolModal"
      @editar="abrirEditarPermisosModal"
      @eliminar="abrirEliminarRolModal"
    >
      <!-- Slots de Celdas Personalizadas -->
      <template #id-cell="{ row }">
        <span class="font-mono text-xs text-neutral-500 font-semibold">#{{ row.original.id }}</span>
      </template>

      <template #nombre-cell="{ row }">
        <div class="flex items-center gap-2">
          <span class="font-bold text-neutral-900">{{ row.original.nombre }}</span>
          <UBadge v-if="row.original.esSistema" color="neutral" variant="subtle" size="xs">
            Sistema
          </UBadge>
        </div>
      </template>

      <template #descripcion-cell="{ row }">
        <span class="text-xs text-neutral-600">{{ row.original.descripcion || 'Sin descripción' }}</span>
      </template>

      <template #totalUsuarios-cell="{ row }">
        <span class="font-semibold text-xs text-neutral-800">
          {{ row.original.totalUsuarios }} {{ row.original.totalUsuarios === 1 ? 'usuario' : 'usuarios' }}
        </span>
      </template>

      <template #totalPermisos-cell="{ row }">
        <UBadge color="neutral" variant="subtle" size="sm">
          {{ row.original.totalPermisos }} de 12 permisos
        </UBadge>
      </template>
    </TablaCrud>

    <!-- Modal 1: Ver Detalles del Rol (VerRolModal) -->
    <div
      v-if="mostrarVerRolModal && rolSeleccionado"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <UIcon name="i-lucide-shield" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-neutral-900">{{ rolSeleccionado.nombre }}</h2>
              <p class="text-xs text-neutral-500">Detalles y matriz de privilegios del rol</p>
            </div>
          </div>
          <button class="text-neutral-400 hover:text-neutral-600 text-lg" @click="mostrarVerRolModal = false">✕</button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <span class="text-neutral-400 block font-medium">Tipo de Rol</span>
              <span class="font-bold text-neutral-800">{{ rolSeleccionado.esSistema ? 'Base de Sistema (Protegido)' : 'Personalizado' }}</span>
            </div>
            <div>
              <span class="text-neutral-400 block font-medium">Usuarios Asignados</span>
              <span class="font-bold text-neutral-800">{{ rolSeleccionado.totalUsuarios }} usuario(s)</span>
            </div>
            <div class="col-span-2">
              <span class="text-neutral-400 block font-medium">Descripción</span>
              <span class="text-neutral-700">{{ rolSeleccionado.descripcion || 'Sin descripción registrada' }}</span>
            </div>
          </div>

          <div>
            <h3 class="font-bold text-neutral-900 mb-2">Privilegios Otorgados ({{ rolSeleccionado.permisos?.length || 0 }} de 12):</h3>
            <div class="space-y-1.5 max-h-56 overflow-y-auto">
              <div
                v-for="p in catalogoPermisos"
                :key="p.clave"
                class="flex items-center justify-between p-2 rounded-lg border text-xs"
                :class="rolSeleccionado.permisos?.includes(p.clave) ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-neutral-50/50 border-neutral-100 text-neutral-400'"
              >
                <div>
                  <span class="font-bold block">{{ p.clave }}</span>
                  <span class="text-[11px] opacity-80">{{ p.descripcion }}</span>
                </div>
                <UIcon
                  :name="rolSeleccionado.permisos?.includes(p.clave) ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
                  class="size-4 shrink-0 ml-2"
                  :class="rolSeleccionado.permisos?.includes(p.clave) ? 'text-emerald-600' : 'text-neutral-300'"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end pt-3 border-t border-neutral-200">
          <UButton color="neutral" variant="outline" type="button" @click="mostrarVerRolModal = false">
            Cerrar
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal 2: Crear Nuevo Rol (CrearRolModal) -->
    <div
      v-if="mostrarCrearRolModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
              <UIcon name="i-lucide-plus" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-neutral-900">Registrar Nuevo Rol</h2>
              <p class="text-xs text-neutral-500">Define el nombre y los permisos asociados</p>
            </div>
          </div>
          <button class="text-neutral-400 hover:text-neutral-600 text-lg" @click="mostrarCrearRolModal = false">✕</button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 space-y-4">
          <UFormField label="Nombre del Rol *" name="nombre">
            <UInput v-model="formularioCrear.nombre" placeholder="Ej. Supervisor de Sucursal" class="w-full" />
          </UFormField>

          <UFormField label="Descripción" name="descripcion">
            <UTextarea v-model="formularioCrear.descripcion" placeholder="Explica las responsabilidades de este rol..." class="w-full" :rows="2" />
          </UFormField>

          <div>
            <label class="block text-xs font-semibold text-neutral-700 mb-1.5">
              Asignar Privilegios Iniciales ({{ formularioCrear.permisos.length }} seleccionados):
            </label>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <label
                v-for="p in catalogoPermisos"
                :key="p.clave"
                class="flex items-start gap-2.5 p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs transition-colors"
              >
                <input
                  type="checkbox"
                  :value="p.clave"
                  :checked="formularioCrear.permisos.includes(p.clave)"
                  class="mt-0.5 size-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  @change="alternarPermisoCrear(p.clave)"
                />
                <div>
                  <div class="font-bold text-neutral-900">{{ p.clave }}</div>
                  <div class="text-neutral-500 text-[11px]">{{ p.descripcion }}</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
          <UButton color="neutral" variant="outline" type="button" @click="mostrarCrearRolModal = false">
            Cancelar
          </UButton>
          <UButton color="neutral" variant="solid" :loading="guardandoRol" @click="guardarNuevoRol">
            Crear Rol
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal 3: Configurar Permisos del Rol (PermisosModal) -->
    <div
      v-if="mostrarModalPermisos && rolSeleccionado"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div
        class="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <UIcon name="i-lucide-shield-check" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-neutral-900">
                Editar Permisos: {{ rolSeleccionado.nombre }}
              </h2>
              <p class="text-xs text-neutral-500">
                Selecciona los privilegios asignados a este rol.
              </p>
            </div>
          </div>
          <button
            class="text-neutral-400 hover:text-neutral-600 text-lg"
            @click="mostrarModalPermisos = false"
          >✕</button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 space-y-2.5">
          <label
            v-for="p in catalogoPermisos" :key="p.clave"
            class="flex items-start gap-3 p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox" :value="p.clave" :checked="permisosSeleccionados.includes(p.clave)"
              :disabled="rolSeleccionado.nombre === 'Administrador' && p.clave === 'gestionar_roles_permisos'"
              class="mt-1 size-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
              @change="alternarPermiso(p.clave)"
            />
            <div class="text-xs">
              <div class="font-bold text-neutral-900">{{ p.clave }}</div>
              <div class="text-neutral-500">{{ p.descripcion }}</div>
            </div>
          </label>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-neutral-200">
          <span class="text-xs text-neutral-500">
            {{ permisosSeleccionados.length }} permisos seleccionados
          </span>
          <div class="flex items-center gap-2">
            <UButton color="neutral" variant="outline" type="button" @click="mostrarModalPermisos = false">
              Cancelar
            </UButton>
            <UButton color="neutral" variant="solid" :loading="guardandoPermisos" @click="guardarPermisosRol">
              Guardar Cambios
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 4: Confirmar Eliminación de Rol (EliminarRolModal) -->
    <div
      v-if="mostrarEliminarModal && rolAEliminar"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <UIcon name="i-lucide-trash-2" class="size-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-neutral-900">¿Eliminar Rol?</h3>
            <p class="text-xs text-neutral-500">Esta acción no se puede deshacer.</p>
          </div>
        </div>

        <p class="text-sm text-neutral-700">
          ¿Estás seguro de que deseas eliminar permanentemente el rol
          <strong>"{{ rolAEliminar.nombre }}"</strong>?
        </p>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
          <UButton color="neutral" variant="outline" @click="mostrarEliminarModal = false">
            Cancelar
          </UButton>
          <UButton color="error" variant="solid" :loading="eliminandoRol" @click="ejecutarEliminarRol">
            Sí, Eliminar
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista Gestión de Roles · pages/admin/roles.vue
// Administración del catálogo de roles, creación, edición de permisos y eliminación
// ==============================================================================

// ------------------------------------------------------------------------------
// COMPOSABLES
// ------------------------------------------------------------------------------
const { tienePermiso } = useAuth()
const { tamanioPagina } = usePaginacionPantalla({ margenOffset: 340 })

// ------------------------------------------------------------------------------
// METADATOS Y LAYOUT
// ------------------------------------------------------------------------------
definePageMeta({
  middleware: 'auth',
  layout: 'admin',
  permiso: 'gestionar_roles_permisos',
})

// ------------------------------------------------------------------------------
// ESTADO REACTIVO Y PAGINACIÓN
// ------------------------------------------------------------------------------
const paginaActual = ref(1)
const mensajeAccion = ref('')
const errorAccion = ref(false)

// Modales
const mostrarVerRolModal = ref(false)
const mostrarCrearRolModal = ref(false)
const mostrarModalPermisos = ref(false)
const mostrarEliminarModal = ref(false)

// Estados de carga
const guardandoRol = ref(false)
const guardandoPermisos = ref(false)
const eliminandoRol = ref(false)

// Selección activa
const terminoBusqueda = ref('')
const rolSeleccionado = ref<any>(null)
const rolAEliminar = ref<any>(null)
const permisosSeleccionados = ref<string[]>([])

// Formulario de creación
const formularioCrear = reactive({
  nombre: '',
  descripcion: '',
  permisos: [] as string[],
})

// ------------------------------------------------------------------------------
// CARGA DE ROLES Y CATÁLOGO DE PERMISOS
// ------------------------------------------------------------------------------
const requestFetch = useRequestFetch()
const { data: respuestaRoles, status, refresh: refrescarRoles } = await useAsyncData<any>(
  'admin-roles-lista',
  () => requestFetch('/api/admin/roles')
)

const cargando = computed(() => status.value === 'pending' && !respuestaRoles.value)
const listaRoles = computed(() => respuestaRoles.value?.roles || [])
const catalogoPermisos = computed(() => respuestaRoles.value?.catalogoPermisos || [])

// Filtrado reactivo por término de búsqueda
const rolesFiltrados = computed(() => {
  if (!terminoBusqueda.value.trim()) return listaRoles.value
  const t = terminoBusqueda.value.toLowerCase().trim()
  return listaRoles.value.filter((r: any) =>
    r.nombre.toLowerCase().includes(t) ||
    (r.descripcion && r.descripcion.toLowerCase().includes(t)) ||
    r.permisos?.some((p: string) => p.toLowerCase().includes(t))
  )
})

const datosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * tamanioPagina.value
  return rolesFiltrados.value.slice(inicio, inicio + tamanioPagina.value)
})

// ------------------------------------------------------------------------------
// DEFINICIÓN DE COLUMNAS PARA UTable
// ------------------------------------------------------------------------------
const columnas = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'nombre', header: 'Rol' },
  { accessorKey: 'descripcion', header: 'Descripción' },
  { accessorKey: 'totalUsuarios', header: 'Usuarios' },
  { accessorKey: 'totalPermisos', header: 'Privilegios' },
  { accessorKey: 'acciones', header: 'Acciones' },
]

// ------------------------------------------------------------------------------
// REGLAS DE PROTECCIÓN
// ------------------------------------------------------------------------------
function esRolProtegido(rol: any): boolean {
  return Boolean(rol.esSistema || rol.nombre === 'Administrador' || rol.totalUsuarios > 0)
}

// ------------------------------------------------------------------------------
// ACCIONES: VER, CREAR, EDITAR, ELIMINAR
// ------------------------------------------------------------------------------
function abrirVerRolModal(rol: any) {
  rolSeleccionado.value = rol
  mostrarVerRolModal.value = true
}

function abrirCrearRolModal() {
  formularioCrear.nombre = ''
  formularioCrear.descripcion = ''
  formularioCrear.permisos = []
  mostrarCrearRolModal.value = true
}

function alternarPermisoCrear(clave: string) {
  const index = formularioCrear.permisos.indexOf(clave)
  if (index >= 0) {
    formularioCrear.permisos.splice(index, 1)
  } else {
    formularioCrear.permisos.push(clave)
  }
}

async function guardarNuevoRol() {
  if (!formularioCrear.nombre.trim()) {
    errorAccion.value = true
    mensajeAccion.value = 'El nombre del rol es obligatorio.'
    return
  }

  guardandoRol.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    const res: any = await $fetch('/api/admin/roles', {
      method: 'POST',
      body: formularioCrear,
    })

    mensajeAccion.value = res.mensaje || 'Rol creado exitosamente.'
    mostrarCrearRolModal.value = false
    await refrescarRoles()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al crear el rol.'
  } finally {
    guardandoRol.value = false
  }
}

function abrirEditarPermisosModal(rol: any) {
  rolSeleccionado.value = rol
  permisosSeleccionados.value = [...(rol.permisos || [])]
  mostrarModalPermisos.value = true
}

function alternarPermiso(clave: string) {
  const index = permisosSeleccionados.value.indexOf(clave)
  if (index >= 0) {
    permisosSeleccionados.value.splice(index, 1)
  } else {
    permisosSeleccionados.value.push(clave)
  }
}

async function guardarPermisosRol() {
  if (!rolSeleccionado.value) return

  guardandoPermisos.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    await $fetch(`/api/admin/roles/${rolSeleccionado.value.id}`, {
      method: 'PATCH',
      body: {
        permisos: permisosSeleccionados.value,
      },
    })

    mensajeAccion.value = `Permisos para el rol "${rolSeleccionado.value.nombre}" actualizados correctamente.`
    mostrarModalPermisos.value = false
    await refrescarRoles()
  } catch (error: any) {
    errorAccion.value = true
    mensajeAccion.value = error.data?.statusMessage || error.message || 'Error al actualizar permisos.'
  } finally {
    guardandoPermisos.value = false
  }
}

function abrirEliminarRolModal(rol: any) {
  rolAEliminar.value = rol
  mostrarEliminarModal.value = true
}

async function ejecutarEliminarRol() {
  if (!rolAEliminar.value) return

  eliminandoRol.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    const res: any = await $fetch(`/api/admin/roles/${rolAEliminar.value.id}`, {
      method: 'DELETE',
    })

    mensajeAccion.value = res.mensaje || 'Rol eliminado exitosamente.'
    mostrarEliminarModal.value = false
    await refrescarRoles()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al eliminar el rol.'
  } finally {
    eliminandoRol.value = false
  }
}
</script>
