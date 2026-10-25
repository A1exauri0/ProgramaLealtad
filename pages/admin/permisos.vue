<template>
  <div class="space-y-6">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Catálogo de Permisos"
      descripcion="Matriz de privilegios del sistema y asignación de acceso a los roles de la plataforma."
    />

    <!-- Mensajes de Notificación -->
    <div
      v-if="mensajeAccion" class="p-4 rounded-xl text-sm border flex items-center justify-between transition-all"
      :class="errorAccion ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'"
    >
      <div class="flex items-center gap-2">
        <UIcon :name="errorAccion ? 'i-lucide-alert-circle' : 'i-lucide-check-circle-2'" class="size-5 shrink-0" />
        <span>{{ mensajeAccion }}</span>
      </div>
      <button class="font-bold underline ml-2 text-xs" @click="mensajeAccion = ''">Cerrar</button>
    </div>

    <!-- Componente CRUD Tabla Reutilizable con Botones Estándar -->
    <TablaCrud
      v-model:busqueda="terminoBusqueda"
      titulo="Permisos del Sistema"
      placeholder-busqueda="Buscar permisos por clave, descripción o rol..."
      :columnas="columnas"
      :datos="datosPaginados"
      :cargando="cargando"
      :total-registros="permisosFiltrados.length"
      :pagina-actual="paginaActual"
      :tamanio-pagina="tamanioPagina"
      :mostrar-boton-crear="tienePermiso('gestionar_roles_permisos')"
      texto-boton-crear="Nuevo Permiso"
      :mostrar-boton-ver="true"
      texto-boton-ver="Ver"
      :mostrar-boton-editar="tienePermiso('gestionar_roles_permisos')"
      texto-boton-editar="Editar"
      :mostrar-boton-eliminar="tienePermiso('gestionar_roles_permisos')"
      texto-boton-eliminar="Eliminar"
      :deshabilitar-boton-eliminar="p => p.esSistema"
      @update:busqueda="paginaActual = 1"
      @cambiar-pagina="p => paginaActual = p"
      @cambiar-tamanio="t => { tamanioPagina = t; paginaActual = 1 }"
      @crear="abrirCrearPermisoModal"
      @ver="abrirVerPermisoModal"
      @editar="abrirEditarPermisoModal"
      @eliminar="abrirEliminarPermisoModal"
    >
      <!-- Slots de Celdas Personalizadas -->
      <template #clave-cell="{ row }">
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
            {{ row.original.clave }}
          </span>
        </div>
      </template>

      <template #descripcion-cell="{ row }">
        <span class="text-xs text-neutral-700">{{ row.original.descripcion }}</span>
      </template>

      <template #roles-cell="{ row }">
        <div class="flex flex-wrap gap-1.5">
          <UBadge v-for="r in row.original.roles" :key="r.id" color="neutral" variant="subtle" size="xs">
            {{ r.nombre }}
          </UBadge>
          <span v-if="!row.original.roles?.length" class="text-xs text-neutral-400 italic">
            Sin roles asignados
          </span>
        </div>
      </template>

      <template #totalRoles-cell="{ row }">
        <span class="font-semibold text-xs text-neutral-800">
          {{ row.original.totalRoles }} {{ row.original.totalRoles === 1 ? 'rol' : 'roles' }}
        </span>
      </template>
    </TablaCrud>

    <!-- Modal 1: Ver Detalle del Permiso (VerPermisoModal) -->
    <div
      v-if="mostrarVerModal && permisoSeleccionado"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div
        class="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div class="flex items-center gap-2.5">
            <div
              class="size-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700"
            >
              <UIcon name="i-lucide-key-round" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-neutral-900 font-mono">{{ permisoSeleccionado.clave }}</h2>
              <p class="text-xs text-neutral-500">Detalles del privilegio del sistema</p>
            </div>
          </div>
          <button class="text-neutral-400 hover:text-neutral-600 text-lg" @click="mostrarVerModal = false">✕</button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
          <div class="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
            <div>
              <span class="text-neutral-400 block font-medium">Descripción Oficial</span>
              <span class="font-semibold text-neutral-800 text-sm">{{ permisoSeleccionado.descripcion }}</span>
            </div>
            <div>
              <span class="text-neutral-400 block font-medium">Tipo de Privilegio</span>

            </div>
          </div>

          <div>
            <h3 class="font-bold text-neutral-900 mb-2">Roles que cuentan con este permiso:</h3>
            <div v-if="permisoSeleccionado.roles?.length" class="space-y-1.5">
              <div
                v-for="r in permisoSeleccionado.roles" :key="r.id"
                class="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 bg-white"
              >
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-shield-check" class="size-4 text-emerald-600" />
                  <span class="font-bold text-neutral-900">{{ r.nombre }}</span>
                </div>
                <UBadge color="neutral" variant="subtle" size="xs">Rol Activo</UBadge>
              </div>
            </div>
            <div v-else class="text-neutral-500 italic p-3 bg-neutral-50 rounded-lg text-center">
              Ningún rol tiene asignado este privilegio actualmente.
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end pt-3 border-t border-neutral-200">
          <UButton color="neutral" variant="outline" type="button" @click="mostrarVerModal = false">
            Cerrar
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal 2: Crear Nuevo Permiso (CrearPermisoModal) -->
    <div
      v-if="mostrarCrearModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div
        class="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
              <UIcon name="i-lucide-plus" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-neutral-900">Crear Nuevo Permiso</h2>
              <p class="text-xs text-neutral-500">Registra un nuevo privilegio para la plataforma</p>
            </div>
          </div>
          <button class="text-neutral-400 hover:text-neutral-600 text-lg" @click="mostrarCrearModal = false">✕</button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 space-y-4">
          <UFormField
            label="Clave del Permiso * (snake_case)" name="clave"
            description="Solo letras minúsculas, números y guiones bajos (ej. gestionar_sucursales)"
          >
            <UInput v-model="formularioCrear.clave" placeholder="ejemplo_nuevo_permiso" class="w-full font-mono" />
          </UFormField>

          <UFormField label="Descripción del Privilegio *" name="descripcion">
            <UTextarea
              v-model="formularioCrear.descripcion"
              placeholder="Describe qué acciones autoriza este permiso..." class="w-full" :rows="2"
            />
          </UFormField>

          <div>
            <label class="block text-xs font-semibold text-neutral-700 mb-1.5">
              Asignar a Roles Iniciales:
            </label>
            <div class="space-y-2 max-h-40 overflow-y-auto">
              <label
                v-for="r in catalogoRoles" :key="r.id"
                class="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs transition-colors"
              >
                <div class="flex items-center gap-2.5">
                  <input
                    type="checkbox" :value="r.id" :checked="formularioCrear.rolesIds.includes(r.id)"
                    class="size-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                    @change="alternarRolCrear(r.id)"
                  />
                  <span class="font-bold text-neutral-900">{{ r.nombre }}</span>
                </div>
                <UBadge v-if="r.esSistema" color="neutral" variant="subtle" size="xs">Sistema</UBadge>
              </label>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
          <UButton color="neutral" variant="outline" type="button" @click="mostrarCrearModal = false">
            Cancelar
          </UButton>
          <UButton color="neutral" variant="solid" :loading="guardandoPermiso" @click="guardarNuevoPermiso">
            Crear Permiso
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal 3: Editar Permiso y Asignar Roles (EditarPermisoModal) -->
    <div
      v-if="mostrarEditarModal && permisoSeleccionado"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div
        class="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div class="flex items-center gap-2.5">
            <div
              class="size-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700"
            >
              <UIcon name="i-lucide-pencil" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-neutral-900">Editar Permiso</h2>
              <p class="text-xs text-neutral-500 font-mono">{{ permisoSeleccionado.clave }}</p>
            </div>
          </div>
          <button class="text-neutral-400 hover:text-neutral-600 text-lg" @click="mostrarEditarModal = false">✕</button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 space-y-4">
          <UFormField label="Descripción del Privilegio *" name="descripcion">
            <UTextarea
              v-model="formularioEditar.descripcion" placeholder="Descripción clara del permiso..."
              class="w-full" :rows="2"
            />
          </UFormField>

          <div>
            <label class="block text-xs font-semibold text-neutral-700 mb-1.5">
              Roles con acceso a este privilegio ({{ rolesSeleccionadosIds.length }} seleccionados):
            </label>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <label
                v-for="r in catalogoRoles" :key="r.id"
                class="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                <div class="flex items-center gap-3">
                  <input
                    type="checkbox" :value="r.id" :checked="rolesSeleccionadosIds.includes(r.id)"
                    :disabled="r.nombre === 'Administrador' && permisoSeleccionado.clave === 'gestionar_roles_permisos'"
                    class="size-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                    @change="alternarRolEditar(r.id)"
                  />
                  <div>
                    <div class="font-bold text-sm text-neutral-900">{{ r.nombre }}</div>
                    <div class="text-xs text-neutral-500">{{ r.descripcion || 'Sin descripción' }}</div>
                  </div>
                </div>
                <UBadge v-if="r.esSistema" color="neutral" variant="subtle" size="xs">
                  Sistema
                </UBadge>
              </label>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-neutral-200">
          <span class="text-xs text-neutral-500">
            {{ rolesSeleccionadosIds.length }} roles seleccionados
          </span>
          <div class="flex items-center gap-2">
            <UButton color="neutral" variant="outline" type="button" @click="mostrarEditarModal = false">
              Cancelar
            </UButton>
            <UButton color="neutral" variant="solid" :loading="guardandoRoles" @click="guardarEdicionPermiso">
              Guardar Cambios
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 4: Confirmar Eliminación de Permiso (EliminarPermisoModal) -->
    <div
      v-if="mostrarEliminarModal && permisoAEliminar"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <UIcon name="i-lucide-trash-2" class="size-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-neutral-900">¿Eliminar Permiso?</h3>
            <p class="text-xs text-neutral-500">Esta acción no se puede deshacer.</p>
          </div>
        </div>

        <p class="text-sm text-neutral-700">
          ¿Estás seguro de que deseas eliminar permanentemente el permiso
          <strong class="font-mono text-neutral-900">"{{ permisoAEliminar.clave }}"</strong>?
        </p>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
          <UButton color="neutral" variant="outline" @click="mostrarEliminarModal = false">
            Cancelar
          </UButton>
          <UButton color="error" variant="solid" :loading="eliminandoPermiso" @click="ejecutarEliminarPermiso">
            Sí, Eliminar
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista Catálogo de Permisos · pages/admin/permisos.vue
// Administración dinámica de privilegios: crear, ver, editar y eliminar permisos
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
const mostrarVerModal = ref(false)
const mostrarCrearModal = ref(false)
const mostrarEditarModal = ref(false)
const mostrarEliminarModal = ref(false)

// Estados de carga
const guardandoPermiso = ref(false)
const guardandoRoles = ref(false)
const eliminandoPermiso = ref(false)

// Selección activa
const terminoBusqueda = ref('')
const permisoSeleccionado = ref<any>(null)
const permisoAEliminar = ref<any>(null)
const rolesSeleccionadosIds = ref<number[]>([])

// Formularios
const formularioCrear = reactive({
  clave: '',
  descripcion: '',
  rolesIds: [] as number[],
})

const formularioEditar = reactive({
  descripcion: '',
})

// ------------------------------------------------------------------------------
// CARGA DE PERMISOS Y ROLES
// ------------------------------------------------------------------------------
const requestFetch = useRequestFetch()
const { data: respuestaPermisos, status, refresh: refrescarPermisos } = await useAsyncData<any>(
  'admin-permisos-lista',
  () => requestFetch('/api/admin/permisos')
)

const { data: respuestaRoles, refresh: refrescarRoles } = await useAsyncData<any>(
  'admin-roles-para-permisos',
  () => requestFetch('/api/admin/roles')
)

const cargando = computed(() => status.value === 'pending' && !respuestaPermisos.value)
const listaPermisos = computed(() => respuestaPermisos.value?.permisos || [])
const catalogoRoles = computed(() => respuestaRoles.value?.roles || [])

// Filtrado reactivo por término de búsqueda
const permisosFiltrados = computed(() => {
  if (!terminoBusqueda.value.trim()) return listaPermisos.value
  const t = terminoBusqueda.value.toLowerCase().trim()
  return listaPermisos.value.filter((p: any) =>
    p.clave.toLowerCase().includes(t) ||
    p.descripcion.toLowerCase().includes(t) ||
    p.roles?.some((r: any) => r.nombre.toLowerCase().includes(t))
  )
})

const datosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * tamanioPagina.value
  return permisosFiltrados.value.slice(inicio, inicio + tamanioPagina.value)
})

// ------------------------------------------------------------------------------
// DEFINICIÓN DE COLUMNAS PARA UTable
// ------------------------------------------------------------------------------
const columnas = [
  { accessorKey: 'clave', header: 'Clave Permiso' },
  { accessorKey: 'descripcion', header: 'Descripción del Privilegio' },
  {
    accessorKey: 'roles',
    header: 'Roles Asignados',
    accessorFn: (row: any) => row.roles?.map((r: any) => r.nombre).join(', ') || 'Sin roles',
  },
  { accessorKey: 'totalRoles', header: 'Total' },
  { accessorKey: 'acciones', header: 'Acciones' },
]

// ------------------------------------------------------------------------------
// ACCIONES: VER, CREAR, EDITAR, ELIMINAR
// ------------------------------------------------------------------------------
function abrirVerPermisoModal(permiso: any) {
  permisoSeleccionado.value = permiso
  mostrarVerModal.value = true
}

function abrirCrearPermisoModal() {
  formularioCrear.clave = ''
  formularioCrear.descripcion = ''
  formularioCrear.rolesIds = []
  mostrarCrearModal.value = true
}

function alternarRolCrear(rolId: number) {
  const index = formularioCrear.rolesIds.indexOf(rolId)
  if (index >= 0) {
    formularioCrear.rolesIds.splice(index, 1)
  } else {
    formularioCrear.rolesIds.push(rolId)
  }
}

async function guardarNuevoPermiso() {
  if (!formularioCrear.clave.trim() || !formularioCrear.descripcion.trim()) {
    errorAccion.value = true
    mensajeAccion.value = 'La clave y la descripción del permiso son obligatorias.'
    return
  }

  guardandoPermiso.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    const res: any = await $fetch('/api/admin/permisos', {
      method: 'POST',
      body: formularioCrear,
    })

    mensajeAccion.value = res.mensaje || 'Permiso creado exitosamente.'
    mostrarCrearModal.value = false
    await refrescarPermisos()
    await refrescarRoles()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al crear el permiso.'
  } finally {
    guardandoPermiso.value = false
  }
}

function abrirEditarPermisoModal(permiso: any) {
  permisoSeleccionado.value = permiso
  formularioEditar.descripcion = permiso.descripcion || ''
  rolesSeleccionadosIds.value = (permiso.roles || []).map((r: any) => r.id)
  mostrarEditarModal.value = true
}

function alternarRolEditar(rolId: number) {
  const index = rolesSeleccionadosIds.value.indexOf(rolId)
  if (index >= 0) {
    rolesSeleccionadosIds.value.splice(index, 1)
  } else {
    rolesSeleccionadosIds.value.push(rolId)
  }
}

async function guardarEdicionPermiso() {
  if (!permisoSeleccionado.value) return

  guardandoRoles.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    await $fetch(`/api/admin/permisos/${permisoSeleccionado.value.clave}`, {
      method: 'PATCH',
      body: {
        descripcion: formularioEditar.descripcion,
        rolesIds: rolesSeleccionadosIds.value,
      },
    })

    mensajeAccion.value = `Permiso "${permisoSeleccionado.value.clave}" actualizado correctamente.`
    mostrarEditarModal.value = false
    await refrescarPermisos()
    await refrescarRoles()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al actualizar el permiso.'
  } finally {
    guardandoRoles.value = false
  }
}

function abrirEliminarPermisoModal(permiso: any) {
  permisoAEliminar.value = permiso
  mostrarEliminarModal.value = true
}

async function ejecutarEliminarPermiso() {
  if (!permisoAEliminar.value) return

  eliminandoPermiso.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    const res: any = await $fetch(`/api/admin/permisos/${permisoAEliminar.value.clave}`, {
      method: 'DELETE',
    })

    mensajeAccion.value = res.mensaje || 'Permiso eliminado exitosamente.'
    mostrarEliminarModal.value = false
    await refrescarPermisos()
    await refrescarRoles()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al eliminar el permiso.'
  } finally {
    eliminandoPermiso.value = false
  }
}
</script>
