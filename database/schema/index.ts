// ==============================================================================
// Esquema de Base de Datos · Modelos Drizzle ORM (PostgreSQL / Supabase)
// Estructura organizada al estilo Laravel: Modelos de datos y relaciones
// ==============================================================================

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  numeric,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ------------------------------------------------------------------------------
// 1. MÓDULO DE SEGURIDAD, USUARIOS Y ROLES (Panel Interno)
// ------------------------------------------------------------------------------

/**
 * Tabla de Roles del sistema (Administrador, Gerente, Atención a clientes, etc.)
 */
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 50 }).notNull().unique(),
  descripcion: text('descripcion'),
  esSistema: boolean('es_sistema').default(false).notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Tabla intermedia para la matriz de permisos de cada rol
 */
export const rolesPermisos = pgTable(
  'roles_permisos',
  {
    id: serial('id').primaryKey(),
    rolId: integer('rol_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permisoClave: varchar('permiso_clave', { length: 80 }).notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (tabla) => [
    uniqueIndex('uq_rol_permiso').on(tabla.rolId, tabla.permisoClave),
  ]
)

/**
 * Usuarios internos del equipo que acceden al panel de administración
 */
export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  correo: varchar('correo', { length: 150 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  rolId: integer('rol_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'restrict' }),
  activo: boolean('activo').default(true).notNull(),
  intentosFallidos: integer('intentos_fallidos').default(0).notNull(),
  bloqueadoHasta: timestamp('bloqueado_hasta', { withTimezone: true }),
  notas: text('notas'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Tokens Bearer generados por el Administrador para consumir APIs de evaluación
 */
export const tokensApi = pgTable('tokens_api', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  creadoPorUsuarioId: integer('creado_por_usuario_id').references(() => usuarios.id, {
    onDelete: 'set null',
  }),
  revocado: boolean('revocado').default(false).notNull(),
  ultimoUsoEn: timestamp('ultimo_uso_en', { withTimezone: true }),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
})

// ------------------------------------------------------------------------------
// 2. MÓDULO DE TIENDA, CLIENTES Y FIDELIZACIÓN (fakeapi.dev + Cálculos)
// ------------------------------------------------------------------------------

/**
 * Clientes sincronizados desde fakeapi.dev (/users) con campos calculados
 */
export const clientes = pgTable('clientes', {
  id: integer('id').primaryKey(), // ID original de fakeapi.dev
  nombre: varchar('nombre', { length: 150 }).notNull(),
  correo: varchar('correo', { length: 150 }),
  telefono: varchar('telefono', { length: 50 }),
  dob: varchar('dob', { length: 50 }),
  fechaNacimiento: varchar('fecha_nacimiento', { length: 10 }), // YYYY-MM-DD
  creadoEnFuente: timestamp('creado_en_fuente', { withTimezone: true }),
  puntos: integer('puntos').default(0).notNull(),
  puntosDisponibles: integer('puntos_disponibles').default(0).notNull(),
  nivel: varchar('nivel', { length: 20 }).default('Bronce').notNull(), // Bronce, Plata, Oro
  gasto12m: numeric('gasto_12m', { precision: 12, scale: 2 }).default('0.00').notNull(),
  enRiesgo: boolean('en_riesgo').default(false).notNull(),
  diasSinActividad: integer('dias_sin_actividad'),
  fechaCumpleanos: varchar('fecha_cumpleanos', { length: 10 }), // Formato 2026-MM-DD
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Pedidos sincronizados desde fakeapi.dev (/orders)
 */
export const pedidos = pgTable(
  'pedidos',
  {
    id: integer('id').primaryKey(),
    numeroOrden: varchar('numero_orden', { length: 50 }),
    clienteId: integer('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),
    estatus: varchar('estatus', { length: 30 }).notNull(),
    estatusPago: varchar('estatus_pago', { length: 30 }).notNull(),
    total: numeric('total', { precision: 12, scale: 2 }),
    fechaCreacionUtc: timestamp('fecha_creacion_utc', { withTimezone: true }).notNull(),
    fechaLocal: varchar('fecha_local', { length: 10 }).notNull(), // UTC-6
    datosCrudos: jsonb('datos_crudos'),
  },
  (tabla) => [
    index('idx_pedidos_cliente').on(tabla.clienteId),
    index('idx_pedidos_fecha_local').on(tabla.fechaLocal),
  ]
)

/**
 * Pagos sincronizados desde fakeapi.dev (/payments) con conversión fija a MXN
 */
export const pagos = pgTable(
  'pagos',
  {
    id: integer('id').primaryKey(),
    clienteId: integer('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),
    pedidoId: integer('pedido_id'),
    montoOriginal: numeric('monto_original', { precision: 12, scale: 2 }).notNull(),
    moneda: varchar('moneda', { length: 10 }).notNull(),
    montoMxn: numeric('monto_mxn', { precision: 12, scale: 2 }).notNull(),
    estatus: varchar('estatus', { length: 30 }).notNull(),
    fechaPagoUtc: timestamp('fecha_pago_utc', { withTimezone: true }).notNull(),
    fechaLocal: varchar('fecha_local', { length: 10 }).notNull(), // UTC-6
    datosCrudos: jsonb('datos_crudos'),
  },
  (tabla) => [
    index('idx_pagos_cliente').on(tabla.clienteId),
    index('idx_pagos_fecha_local').on(tabla.fechaLocal),
  ]
)

/**
 * Historial de movimientos de puntos (idempotencia estricta por cliente, tipo y referencia)
 */
export const movimientosPuntos = pgTable(
  'movimientos_puntos',
  {
    id: serial('id').primaryKey(),
    clienteId: integer('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),
    fecha: varchar('fecha', { length: 10 }).notNull(), // YYYY-MM-DD
    tipo: varchar('tipo', { length: 40 }).notNull(), // pago, reembolso, bono_orden_entregada, canje, devolucion
    referencia: varchar('referencia', { length: 60 }).notNull(), // pago:123, orden:456, canje:789
    puntos: integer('puntos').notNull(),
    origen: varchar('origen', { length: 20 }).default('sync').notNull(), // sync, manual, canje
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (tabla) => [
    uniqueIndex('uq_movimiento_cliente_tipo_ref').on(
      tabla.clienteId,
      tabla.tipo,
      tabla.referencia
    ),
    index('idx_movimientos_cliente').on(tabla.clienteId),
  ]
)

// ------------------------------------------------------------------------------
// 3. MÓDULO DEL PORTAL DEL CLIENTE Y RECOMPENSAS
// ------------------------------------------------------------------------------

/**
 * Cuentas de autoservicio de clientes para acceder al portal
 */
export const cuentasPortal = pgTable('cuentas_portal', {
  clienteId: integer('cliente_id')
    .primaryKey()
    .references(() => clientes.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash'),
  estadoAcceso: varchar('estado_acceso', { length: 30 }).default('sin_acceso').notNull(), // sin_acceso, activo, suspendido
  requiereCambioPassword: boolean('requiere_cambio_password').default(true).notNull(),
  intentosFallidos: integer('intentos_fallidos').default(0).notNull(),
  bloqueadoHasta: timestamp('bloqueado_hasta', { withTimezone: true }),
  ultimoAccesoEn: timestamp('ultimo_acceso_en', { withTimezone: true }),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Catálogo de Recompensas (Productos físicos y Cupones de descuento)
 */
export const recompensas = pgTable('recompensas', {
  id: serial('id').primaryKey(),
  tipo: varchar('tipo', { length: 20 }).notNull(), // producto, descuento
  nombre: varchar('nombre', { length: 150 }).notNull(),
  descripcion: text('descripcion'),
  fotoUrl: text('foto_url'),
  puntosRequeridos: integer('puntos_requeridos').notNull(),
  stock: integer('stock'), // null si es ilimitado
  nivelMinimo: varchar('nivel_minimo', { length: 20 }).default('Bronce').notNull(),
  limitePorCliente: integer('limite_por_cliente'),
  activo: boolean('activo').default(true).notNull(),
  descuentoTipo: varchar('descuento_tipo', { length: 20 }), // porcentaje, monto_fijo
  descuentoValor: numeric('descuento_valor', { precision: 10, scale: 2 }),
  compraMinimaMxn: numeric('compra_minima_mxn', { precision: 10, scale: 2 }),
  vigenciaDias: integer('vigencia_dias'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Canjes realizados por los clientes
 */
export const canjes = pgTable(
  'canjes',
  {
    id: serial('id').primaryKey(),
    clienteId: integer('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'restrict' }),
    recompensaId: integer('recompensa_id')
      .notNull()
      .references(() => recompensas.id, { onDelete: 'restrict' }),
    puntosGastados: integer('puntos_gastados').notNull(),
    estatus: varchar('estatus', { length: 20 }).default('pendiente').notNull(), // pendiente, entregado, cancelado
    fechaCanje: timestamp('fecha_canje', { withTimezone: true }).defaultNow().notNull(),
    fechaEntrega: timestamp('fecha_entrega', { withTimezone: true }),
    motivoCancelacion: text('motivo_cancelacion'),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (tabla) => [
    index('idx_canjes_cliente').on(tabla.clienteId),
  ]
)

/**
 * Cupones de descuento generados al canjear
 */
export const cupones = pgTable(
  'cupones',
  {
    id: serial('id').primaryKey(),
    canjeId: integer('canje_id')
      .notNull()
      .unique()
      .references(() => canjes.id, { onDelete: 'cascade' }),
    clienteId: integer('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),
    codigo: varchar('codigo', { length: 30 }).notNull().unique(), // LEAL-XXXX-XXXX
    descuentoTipo: varchar('descuento_tipo', { length: 20 }).notNull(),
    descuentoValor: numeric('descuento_valor', { precision: 10, scale: 2 }).notNull(),
    compraMinimaMxn: numeric('compra_minima_mxn', { precision: 10, scale: 2 }),
    fechaVencimiento: timestamp('fecha_vencimiento', { withTimezone: true }).notNull(),
    estatus: varchar('estatus', { length: 20 }).default('vigente').notNull(), // vigente, usado, vencido, cancelado
    usadoEn: timestamp('usado_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (tabla) => [
    index('idx_cupones_cliente').on(tabla.clienteId),
    index('idx_cupones_codigo').on(tabla.codigo),
  ]
)

// ------------------------------------------------------------------------------
// 4. MÓDULO DE AUDITORÍA Y SINCRONIZACIÓN
// ------------------------------------------------------------------------------

/**
 * Registro de cada corrida de sincronización (automática cron o manual)
 */
export const corridasSincronizacion = pgTable('corridas_sincronizacion', {
  id: serial('id').primaryKey(),
  tipo: varchar('tipo', { length: 20 }).notNull(), // cron, manual
  iniciadoEn: timestamp('iniciado_en', { withTimezone: true }).defaultNow().notNull(),
  finalizadoEn: timestamp('finalizado_en', { withTimezone: true }),
  totalRequests: integer('total_requests').default(0).notNull(),
  estatus: varchar('estatus', { length: 20 }).default('en_progreso').notNull(), // en_progreso, completado, error
  mensajeError: text('mensaje_error'),
  resumen: jsonb('resumen'),
  ejecutadoPorUsuarioId: integer('ejecutado_por_usuario_id').references(() => usuarios.id, {
    onDelete: 'set null',
  }),
})

/**
 * Registro de inconsistencias encontradas en la API externa fakeapi.dev
 */
export const inconsistenciasFuente = pgTable('inconsistencias_fuente', {
  id: serial('id').primaryKey(),
  corridaId: integer('corrida_id').references(() => corridasSincronizacion.id, {
    onDelete: 'cascade',
  }),
  entidad: varchar('entidad', { length: 30 }).notNull(), // users, orders, payments
  entidadId: varchar('entidad_id', { length: 50 }).notNull(),
  tipoInconsistencia: varchar('tipo_inconsistencia', { length: 80 }).notNull(),
  descripcion: text('descripcion').notNull(),
  datosCrudos: jsonb('datos_crudos'),
  fechaDeteccion: timestamp('fecha_deteccion', { withTimezone: true }).defaultNow().notNull(),
})

// ------------------------------------------------------------------------------
// RELACIONES ENTRE MODELOS (Drizzle Relations para consultas anidadas)
// ------------------------------------------------------------------------------

export const rolesRelaciones = relations(roles, ({ many }) => ({
  usuarios: many(usuarios),
  permisos: many(rolesPermisos),
}))

export const usuariosRelaciones = relations(usuarios, ({ one, many }) => ({
  rol: one(roles, {
    fields: [usuarios.rolId],
    references: [roles.id],
  }),
  tokens: many(tokensApi),
}))

export const clientesRelaciones = relations(clientes, ({ one, many }) => ({
  cuentaPortal: one(cuentasPortal, {
    fields: [clientes.id],
    references: [cuentasPortal.clienteId],
  }),
  pedidos: many(pedidos),
  pagos: many(pagos),
  movimientos: many(movimientosPuntos),
  canjes: many(canjes),
  cupones: many(cupones),
}))

export const canjesRelaciones = relations(canjes, ({ one }) => ({
  cliente: one(clientes, {
    fields: [canjes.clienteId],
    references: [clientes.id],
  }),
  recompensa: one(recompensas, {
    fields: [canjes.recompensaId],
    references: [recompensas.id],
  }),
  cupon: one(cupones, {
    fields: [canjes.id],
    references: [cupones.canjeId],
  }),
}))
