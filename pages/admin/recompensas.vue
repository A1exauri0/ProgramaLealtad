<template>
  <div class="space-y-6">
    <!-- Cabecera Unificada de Vista -->
    <CabeceraPagina
      titulo="Catálogo de Recompensas"
      descripcion="Administración de productos físicos y cupones de descuento canjeables por puntos de lealtad."
    >
      <template v-if="tienePermiso('gestionar_catalogo_recompensas')" #acciones>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-cloud-download"
          :loading="importandoProductos"
          @click="importarDesdeFakeApi"
        >
          Importar de /products
        </UButton>
      </template>
    </CabeceraPagina>

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

    <!-- Componente CRUD Tabla Reutilizable con Buscador Integrado -->
    <TablaCrud
      v-model:busqueda="terminoBusqueda"
      titulo="Catálogo de Beneficios"
      placeholder-busqueda="Buscar recompensas por nombre, tipo o nivel..."
      :columnas="columnas"
      :datos="datosPaginados"
      :cargando="cargando"
      :total-registros="recompensasFiltradas.length"
      :pagina-actual="paginaActual"
      :tamanio-pagina="tamanioPagina"
      :mostrar-boton-crear="tienePermiso('gestionar_catalogo_recompensas')"
      texto-boton-crear="Nueva Recompensa"
      icono-boton-crear="i-lucide-gift"
      @update:busqueda="paginaActual = 1"
      @cambiar-pagina="p => paginaActual = p"
      @cambiar-tamanio="t => { tamanioPagina = t; paginaActual = 1 }"
      @crear="abrirCrearModal"
    >
      <!-- Slots de Celdas Personalizadas -->
      <template #tipo-cell="{ row }">
        <UBadge
          :color="row.original.tipo === 'descuento' ? 'neutral' : 'neutral'"
          variant="subtle"
          size="xs"
          class="flex items-center gap-1.5 w-fit"
        >
          <UIcon :name="row.original.tipo === 'descuento' ? 'i-lucide-ticket-percent' : 'i-lucide-package'" class="size-3.5" />
          <span>{{ row.original.tipo === 'descuento' ? 'Cupón Descuento' : 'Producto Físico' }}</span>
        </UBadge>
      </template>

      <template #nombre-cell="{ row }">
        <div>
          <div class="font-bold text-neutral-900">{{ row.original.nombre }}</div>
          <div class="text-xs text-neutral-500 line-clamp-1">{{ row.original.descripcion || 'Sin descripción' }}</div>
        </div>
      </template>

      <template #puntosRequeridos-cell="{ row }">
        <span class="font-bold text-xs text-neutral-900 font-mono bg-neutral-100 px-2 py-0.5 rounded-md">
          {{ formatearEntero(row.original.puntosRequeridos) }} pts
        </span>
      </template>

      <template #nivelMinimo-cell="{ row }">
        <UBadge :color="obtenerColorNivel(row.original.nivelMinimo)" variant="subtle" size="xs">
          {{ row.original.nivelMinimo }}
        </UBadge>
      </template>

      <template #stock-cell="{ row }">
        <div v-if="row.original.tipo === 'producto'">
          <span
            v-if="row.original.stock === null"
            class="text-xs text-neutral-600 font-medium"
          >
            Ilimitado
          </span>
          <span
            v-else-if="row.original.stock <= 0"
            class="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded"
          >
            Agotado (0)
          </span>
          <span
            v-else
            class="text-xs font-semibold"
            :class="row.original.stock <= 5 ? 'text-amber-700' : 'text-neutral-800'"
          >
            {{ row.original.stock }} unidades
          </span>
        </div>
        <div v-else>
          <span class="text-xs text-neutral-500 italic">Digital (Genera cupón)</span>
        </div>
      </template>

      <template #activo-cell="{ row }">
        <UBadge :color="row.original.activo ? 'success' : 'neutral'" variant="subtle" size="xs">
          {{ row.original.activo ? 'Activa' : 'Inactiva' }}
        </UBadge>
      </template>

      <template #totalCanjes-cell="{ row }">
        <span class="text-xs font-medium text-neutral-700">
          {{ row.original.totalCanjes }} {{ row.original.totalCanjes === 1 ? 'canje' : 'canjes' }}
        </span>
      </template>

      <!-- Botones de Acción Estándar por Fila -->
      <template #acciones-cell="{ row }">
        <div class="flex items-center gap-1.5">
          <!-- Botón Ver (Verde) -->
          <UButton
            color="success"
            variant="subtle"
            size="xs"
            icon="i-lucide-eye"
            @click="abrirVerModal(row.original)"
          >
            Ver
          </UButton>

          <!-- Botón Editar (Amarillo) -->
          <UButton
            v-if="tienePermiso('gestionar_catalogo_recompensas')"
            color="warning"
            variant="subtle"
            size="xs"
            icon="i-lucide-pencil"
            @click="abrirEditarModal(row.original)"
          >
            Editar
          </UButton>

          <!-- Botón Activar / Desactivar (Rojo / Verde) -->
          <UButton
            v-if="tienePermiso('gestionar_catalogo_recompensas')"
            :color="row.original.activo ? 'error' : 'success'"
            variant="subtle"
            size="xs"
            :icon="row.original.activo ? 'i-lucide-slash' : 'i-lucide-check'"
            :loading="alternandoId === row.original.id"
            @click="alternarEstatus(row.original)"
          >
            {{ row.original.activo ? 'Desactivar' : 'Activar' }}
          </UButton>
        </div>
      </template>
    </TablaCrud>

    <!-- Modal 1: Ver Detalle de la Recompensa (VerRecompensaModal) -->
    <div
      v-if="mostrarVerModal && recompensaSeleccionada"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <UIcon :name="recompensaSeleccionada.tipo === 'descuento' ? 'i-lucide-ticket-percent' : 'i-lucide-package'" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-neutral-900">{{ recompensaSeleccionada.nombre }}</h2>
              <p class="text-xs text-neutral-500">ID #{{ recompensaSeleccionada.id }} · {{ recompensaSeleccionada.tipo === 'descuento' ? 'Cupón Digital' : 'Producto Físico' }}</p>
            </div>
          </div>
          <button class="text-neutral-400 hover:text-neutral-600 text-lg" @click="mostrarVerModal = false">✕</button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <span class="text-neutral-400 block font-medium">Puntos Requeridos</span>
              <span class="font-bold text-neutral-900 text-sm font-mono">{{ formatearEntero(recompensaSeleccionada.puntosRequeridos) }} pts</span>
            </div>
            <div>
              <span class="text-neutral-400 block font-medium">Nivel Mínimo Requerido</span>
              <span class="font-bold text-neutral-900 text-sm">{{ recompensaSeleccionada.nivelMinimo }}</span>
            </div>
            <div>
              <span class="text-neutral-400 block font-medium">Disponibilidad / Stock</span>
              <span class="font-bold text-neutral-800">
                {{ recompensaSeleccionada.tipo === 'producto' ? (recompensaSeleccionada.stock !== null ? `${recompensaSeleccionada.stock} unidades` : 'Ilimitado') : 'Generación automática' }}
              </span>
            </div>
            <div>
              <span class="text-neutral-400 block font-medium">Total de Canjes Realizados</span>
              <span class="font-bold text-neutral-800">{{ recompensaSeleccionada.totalCanjes }} canjes</span>
            </div>
            <div class="col-span-2">
              <span class="text-neutral-400 block font-medium">Descripción</span>
              <span class="text-neutral-700">{{ recompensaSeleccionada.descripcion || 'Sin descripción detallada registrada.' }}</span>
            </div>
          </div>

          <!-- Si es Cupón de Descuento -->
          <div v-if="recompensaSeleccionada.tipo === 'descuento'" class="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
            <h3 class="font-bold text-neutral-900">Condiciones del Cupón de Descuento:</h3>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-neutral-400 block">Tipo de Beneficio</span>
                <span class="font-bold text-neutral-800">{{ recompensaSeleccionada.descuentoTipo === 'porcentaje' ? `${recompensaSeleccionada.descuentoValor}% de descuento` : `$${recompensaSeleccionada.descuentoValor} MXN de descuento` }}</span>
              </div>
              <div>
                <span class="text-neutral-400 block">Compra Mínima</span>
                <span class="font-bold text-neutral-800">{{ recompensaSeleccionada.compraMinimaMxn ? `$${recompensaSeleccionada.compraMinimaMxn} MXN` : 'Sin compra mínima' }}</span>
              </div>
              <div>
                <span class="text-neutral-400 block">Vigencia del Cupón</span>
                <span class="font-bold text-neutral-800">{{ recompensaSeleccionada.vigenciaDias || 30 }} días a partir del canje</span>
              </div>
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

    <!-- Modal 2: Crear Nueva Recompensa (CrearRecompensaModal) -->
    <div
      v-if="mostrarCrearModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
              <UIcon name="i-lucide-gift" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-neutral-900">Nueva Recompensa</h2>
              <p class="text-xs text-neutral-500">Agrega un producto o cupón para el programa de lealtad</p>
            </div>
          </div>
          <button class="text-neutral-400 hover:text-neutral-600 text-lg" @click="mostrarCrearModal = false">✕</button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 space-y-4">
          <!-- Selector de Tipo -->
          <div>
            <label class="block text-xs font-semibold text-neutral-700 mb-1.5">Tipo de Recompensa *</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all"
                :class="formularioCrear.tipo === 'producto' ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'"
                @click="formularioCrear.tipo = 'producto'"
              >
                <UIcon name="i-lucide-package" class="size-4" />
                <span>Producto Físico</span>
              </button>
              <button
                type="button"
                class="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all"
                :class="formularioCrear.tipo === 'descuento' ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'"
                @click="formularioCrear.tipo = 'descuento'"
              >
                <UIcon name="i-lucide-ticket-percent" class="size-4" />
                <span>Cupón de Descuento</span>
              </button>
            </div>
          </div>

          <UFormField label="Nombre de la Recompensa *" name="nombre">
            <UInput v-model="formularioCrear.nombre" placeholder="Ej. Termo Acero Inoxidable 750ml" class="w-full" />
          </UFormField>

          <UFormField label="Descripción" name="descripcion">
            <UTextarea v-model="formularioCrear.descripcion" placeholder="Detalles de la recompensa..." class="w-full" :rows="2" />
          </UFormField>

          <!-- Foto en Supabase Storage -->
          <div class="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-neutral-800">Foto de la Recompensa (Supabase Storage)</span>
              <span v-if="subiendoFoto" class="text-[11px] font-semibold text-neutral-600">Subiendo imagen...</span>
            </div>
            <div class="flex items-center gap-3">
              <div v-if="formularioCrear.fotoUrl" class="size-12 rounded-lg overflow-hidden border border-neutral-200 bg-white shrink-0">
                <img :src="formularioCrear.fotoUrl" alt="Preview" class="w-full h-full object-cover" />
              </div>
              <input
                type="file"
                accept="image/*"
                class="block w-full text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800"
                @change="e => manejarSubidaFoto(e, 'crear')"
              />
            </div>
            <UInput v-model="formularioCrear.fotoUrl" placeholder="O pega la URL pública de la imagen..." class="w-full text-xs" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <UFormField label="Puntos Requeridos *" name="puntosRequeridos">
              <UInput v-model.number="formularioCrear.puntosRequeridos" type="number" placeholder="Ej. 5000" class="w-full font-mono" />
            </UFormField>

            <UFormField label="Nivel Mínimo *" name="nivelMinimo">
              <select
                v-model="formularioCrear.nivelMinimo"
                class="w-full px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="Bronce">Bronce (Todos)</option>
                <option value="Plata">Plata</option>
                <option value="Oro">Oro</option>
              </select>
            </UFormField>

            <UFormField label="Límite / Cliente" name="limitePorCliente">
              <UInput v-model.number="formularioCrear.limitePorCliente" type="number" placeholder="Ilimitado" class="w-full font-mono" />
            </UFormField>
          </div>

          <!-- Campos Específicos para Producto Físico -->
          <div v-if="formularioCrear.tipo === 'producto'" class="space-y-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span class="block text-xs font-bold text-neutral-800">Inventario del Producto</span>
            <UFormField label="Stock Inicial (deja vacío si es ilimitado)" name="stock">
              <UInput v-model.number="formularioCrear.stock" type="number" placeholder="Ej. 25" class="w-full" />
            </UFormField>
          </div>

          <!-- Campos Específicos para Cupón de Descuento -->
          <div v-else class="space-y-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span class="block text-xs font-bold text-neutral-800">Parámetros del Cupón Digital</span>
            <div class="grid grid-cols-2 gap-2">
              <UFormField label="Tipo Descuento *" name="descuentoTipo">
                <select
                  v-model="formularioCrear.descuentoTipo"
                  class="w-full px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="monto_fijo">Monto Fijo ($ MXN)</option>
                </select>
              </UFormField>

              <UFormField :label="formularioCrear.descuentoTipo === 'porcentaje' ? 'Porcentaje (%) *' : 'Monto ($ MXN) *'" name="descuentoValor">
                <UInput v-model="formularioCrear.descuentoValor" placeholder="Ej. 15" class="w-full font-mono" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <UFormField label="Compra Mínima ($ MXN)" name="compraMinimaMxn">
                <UInput v-model="formularioCrear.compraMinimaMxn" placeholder="Ej. 500" class="w-full font-mono" />
              </UFormField>
              <UFormField label="Vigencia (Días)" name="vigenciaDias">
                <UInput v-model.number="formularioCrear.vigenciaDias" type="number" placeholder="Ej. 30" class="w-full font-mono" />
              </UFormField>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
          <UButton color="neutral" variant="outline" type="button" @click="mostrarCrearModal = false">
            Cancelar
          </UButton>
          <UButton color="neutral" variant="solid" :loading="guardandoRecompensa" @click="guardarNuevaRecompensa">
            Guardar Recompensa
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal 3: Editar Recompensa (EditarRecompensaModal) -->
    <div
      v-if="mostrarEditarModal && recompensaSeleccionada"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <UIcon name="i-lucide-pencil" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-neutral-900">Editar Recompensa</h2>
              <p class="text-xs text-neutral-500">ID #{{ recompensaSeleccionada.id }} · {{ recompensaSeleccionada.nombre }}</p>
            </div>
          </div>
          <button class="text-neutral-400 hover:text-neutral-600 text-lg" @click="mostrarEditarModal = false">✕</button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 space-y-4">
          <UFormField label="Nombre *" name="nombre">
            <UInput v-model="formularioEditar.nombre" class="w-full" />
          </UFormField>

          <UFormField label="Descripción" name="descripcion">
            <UTextarea v-model="formularioEditar.descripcion" class="w-full" :rows="2" />
          </UFormField>

          <!-- Foto en Supabase Storage -->
          <div class="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-neutral-800">Foto de la Recompensa (Supabase Storage)</span>
              <span v-if="subiendoFoto" class="text-[11px] font-semibold text-neutral-600">Subiendo imagen...</span>
            </div>
            <div class="flex items-center gap-3">
              <div v-if="formularioEditar.fotoUrl" class="size-12 rounded-lg overflow-hidden border border-neutral-200 bg-white shrink-0">
                <img :src="formularioEditar.fotoUrl" alt="Preview" class="w-full h-full object-cover" />
              </div>
              <input
                type="file"
                accept="image/*"
                class="block w-full text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800"
                @change="e => manejarSubidaFoto(e, 'editar')"
              />
            </div>
            <UInput v-model="formularioEditar.fotoUrl" placeholder="URL pública de la imagen..." class="w-full text-xs" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <UFormField label="Puntos Requeridos *" name="puntosRequeridos">
              <UInput v-model.number="formularioEditar.puntosRequeridos" type="number" class="w-full font-mono" />
            </UFormField>

            <UFormField label="Nivel Mínimo *" name="nivelMinimo">
              <select
                v-model="formularioEditar.nivelMinimo"
                class="w-full px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="Bronce">Bronce (Todos)</option>
                <option value="Plata">Plata</option>
                <option value="Oro">Oro</option>
              </select>
            </UFormField>

            <UFormField label="Límite / Cliente" name="limitePorCliente">
              <UInput v-model.number="formularioEditar.limitePorCliente" type="number" placeholder="Ilimitado" class="w-full font-mono" />
            </UFormField>
          </div>

          <div v-if="recompensaSeleccionada.tipo === 'producto'" class="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <UFormField label="Stock de Unidades" name="stock">
              <UInput v-model.number="formularioEditar.stock" type="number" placeholder="Dejar vacío para ilimitado" class="w-full font-mono" />
            </UFormField>
          </div>

          <div v-else class="space-y-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div class="grid grid-cols-2 gap-2">
              <UFormField label="Valor de Descuento *" name="descuentoValor">
                <UInput v-model="formularioEditar.descuentoValor" class="w-full font-mono" />
              </UFormField>
              <UFormField label="Compra Mínima ($ MXN)" name="compraMinimaMxn">
                <UInput v-model="formularioEditar.compraMinimaMxn" class="w-full font-mono" />
              </UFormField>
            </div>
            <UFormField label="Vigencia (Días)" name="vigenciaDias">
              <UInput v-model.number="formularioEditar.vigenciaDias" type="number" class="w-full font-mono" />
            </UFormField>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
          <UButton color="neutral" variant="outline" type="button" @click="mostrarEditarModal = false">
            Cancelar
          </UButton>
          <UButton color="neutral" variant="solid" :loading="guardandoRecompensa" @click="guardarEdicionRecompensa">
            Guardar Cambios
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ==============================================================================
// Vista Catálogo de Recompensas · pages/admin/recompensas.vue
// Administración de productos físicos y cupones de descuento canjeables
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
  permiso: 'gestionar_catalogo_recompensas',
})

// ------------------------------------------------------------------------------
// ESTADO REACTIVO Y PAGINACIÓN
// ------------------------------------------------------------------------------
const paginaActual = ref(1)
const terminoBusqueda = ref('')
const mensajeAccion = ref('')
const errorAccion = ref(false)

// Modales
const mostrarVerModal = ref(false)
const mostrarCrearModal = ref(false)
const mostrarEditarModal = ref(false)

// Cargas activas
const guardandoRecompensa = ref(false)
const subiendoFoto = ref(false)
const importandoProductos = ref(false)
const alternandoId = ref<number | null>(null)
const recompensaSeleccionada = ref<any>(null)

// Formulario de creación
const formularioCrear = reactive({
  tipo: 'producto' as 'producto' | 'descuento',
  nombre: '',
  descripcion: '',
  fotoUrl: '',
  puntosRequeridos: 1000,
  nivelMinimo: 'Bronce',
  stock: null as number | null,
  limitePorCliente: null as number | null,
  descuentoTipo: 'porcentaje' as 'porcentaje' | 'monto_fijo',
  descuentoValor: '',
  compraMinimaMxn: '',
  vigenciaDias: 30,
})

// Formulario de edición
const formularioEditar = reactive({
  nombre: '',
  descripcion: '',
  fotoUrl: '',
  puntosRequeridos: 1000,
  nivelMinimo: 'Bronce',
  stock: null as number | null,
  limitePorCliente: null as number | null,
  descuentoValor: '',
  compraMinimaMxn: '',
  vigenciaDias: 30,
})

// ------------------------------------------------------------------------------
// CARGA DE RECOMPENSAS
// ------------------------------------------------------------------------------
const requestFetch = useRequestFetch()
const { data: respuestaRecompensas, status, refresh: refrescarRecompensas } = await useAsyncData<any>(
  'admin-recompensas-lista',
  () => requestFetch('/api/admin/recompensas')
)

const cargando = computed(() => status.value === 'pending' && !respuestaRecompensas.value)
const listaRecompensas = computed(() => respuestaRecompensas.value?.recompensas || [])

// Filtrado reactivo por término de búsqueda
const recompensasFiltradas = computed(() => {
  if (!terminoBusqueda.value.trim()) return listaRecompensas.value
  const t = terminoBusqueda.value.toLowerCase().trim()
  return listaRecompensas.value.filter((r: any) =>
    r.nombre.toLowerCase().includes(t) ||
    r.tipo.toLowerCase().includes(t) ||
    r.nivelMinimo.toLowerCase().includes(t) ||
    (r.descripcion && r.descripcion.toLowerCase().includes(t))
  )
})

const datosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * tamanioPagina.value
  return recompensasFiltradas.value.slice(inicio, inicio + tamanioPagina.value)
})

// ------------------------------------------------------------------------------
// DEFINICIÓN DE COLUMNAS PARA UTable
// ------------------------------------------------------------------------------
const columnas = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'tipo', header: 'Tipo' },
  { accessorKey: 'nombre', header: 'Nombre / Recompensa' },
  { accessorKey: 'puntosRequeridos', header: 'Puntos' },
  { accessorKey: 'nivelMinimo', header: 'Nivel Mín.' },
  { accessorKey: 'stock', header: 'Inventario / Regla' },
  { accessorKey: 'activo', header: 'Estatus' },
  { accessorKey: 'totalCanjes', header: 'Canjes' },
  { accessorKey: 'acciones', header: 'Acciones' },
]

// ------------------------------------------------------------------------------
// UTILIDADES DE FORMATO
// ------------------------------------------------------------------------------
function obtenerColorNivel(nivel: string): 'warning' | 'neutral' {
  if (nivel === 'Oro') return 'warning'
  return 'neutral'
}

// ------------------------------------------------------------------------------
// MÉTODOS Y ACCIONES
// ------------------------------------------------------------------------------
function abrirVerModal(rec: any) {
  recompensaSeleccionada.value = rec
  mostrarVerModal.value = true
}

function abrirCrearModal() {
  formularioCrear.tipo = 'producto'
  formularioCrear.nombre = ''
  formularioCrear.descripcion = ''
  formularioCrear.fotoUrl = ''
  formularioCrear.puntosRequeridos = 1000
  formularioCrear.nivelMinimo = 'Bronce'
  formularioCrear.stock = null
  formularioCrear.limitePorCliente = null
  formularioCrear.descuentoTipo = 'porcentaje'
  formularioCrear.descuentoValor = ''
  formularioCrear.compraMinimaMxn = ''
  formularioCrear.vigenciaDias = 30
  mostrarCrearModal.value = true
}

async function manejarSubidaFoto(evento: Event, destino: 'crear' | 'editar') {
  const input = evento.target as HTMLInputElement
  const archivo = input.files?.[0]
  if (!archivo) return

  subiendoFoto.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    const formData = new FormData()
    formData.append('foto', archivo)

    const res: any = await $fetch('/api/admin/recompensas/subir-foto', {
      method: 'POST',
      body: formData,
    })

    if (destino === 'crear') {
      formularioCrear.fotoUrl = res.fotoUrl
    } else {
      formularioEditar.fotoUrl = res.fotoUrl
    }
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al subir la foto a Supabase Storage.'
  } finally {
    subiendoFoto.value = false
    input.value = ''
  }
}

async function importarDesdeFakeApi() {
  importandoProductos.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    const res: any = await $fetch('/api/admin/recompensas/importar-productos', {
      method: 'POST',
    })
    mensajeAccion.value = res.mensaje
    await refrescarRecompensas()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al importar productos.'
  } finally {
    importandoProductos.value = false
  }
}

async function guardarNuevaRecompensa() {
  if (!formularioCrear.nombre.trim()) {
    errorAccion.value = true
    mensajeAccion.value = 'El nombre de la recompensa es obligatorio.'
    return
  }

  guardandoRecompensa.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    const res: any = await $fetch('/api/admin/recompensas', {
      method: 'POST',
      body: formularioCrear,
    })

    mensajeAccion.value = res.mensaje || 'Recompensa creada exitosamente.'
    mostrarCrearModal.value = false
    await refrescarRecompensas()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al crear la recompensa.'
  } finally {
    guardandoRecompensa.value = false
  }
}

function abrirEditarModal(rec: any) {
  recompensaSeleccionada.value = rec
  formularioEditar.nombre = rec.nombre
  formularioEditar.descripcion = rec.descripcion || ''
  formularioEditar.fotoUrl = rec.fotoUrl || ''
  formularioEditar.puntosRequeridos = rec.puntosRequeridos
  formularioEditar.nivelMinimo = rec.nivelMinimo
  formularioEditar.stock = rec.stock
  formularioEditar.limitePorCliente = rec.limitePorCliente ?? null
  formularioEditar.descuentoValor = rec.descuentoValor || ''
  formularioEditar.compraMinimaMxn = rec.compraMinimaMxn || ''
  formularioEditar.vigenciaDias = rec.vigenciaDias || 30
  mostrarEditarModal.value = true
}

async function guardarEdicionRecompensa() {
  if (!recompensaSeleccionada.value) return

  guardandoRecompensa.value = true
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    const res: any = await $fetch(`/api/admin/recompensas/${recompensaSeleccionada.value.id}`, {
      method: 'PATCH',
      body: formularioEditar,
    })

    mensajeAccion.value = res.mensaje || 'Recompensa actualizada correctamente.'
    mostrarEditarModal.value = false
    await refrescarRecompensas()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al actualizar la recompensa.'
  } finally {
    guardandoRecompensa.value = false
  }
}

async function alternarEstatus(rec: any) {
  alternandoId.value = rec.id
  mensajeAccion.value = ''
  errorAccion.value = false

  try {
    await $fetch(`/api/admin/recompensas/${rec.id}`, {
      method: 'PATCH',
      body: {
        activo: !rec.activo,
      },
    })

    mensajeAccion.value = `Recompensa "${rec.nombre}" ${!rec.activo ? 'activada' : 'desactivada'} correctamente.`
    await refrescarRecompensas()
  } catch (err: any) {
    errorAccion.value = true
    mensajeAccion.value = err.data?.statusMessage || err.message || 'Error al cambiar estatus.'
  } finally {
    alternandoId.value = null
  }
}
</script>
