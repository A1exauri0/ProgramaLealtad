// ==============================================================================
// Seeder Inicial (Equivalente a Laravel DatabaseSeeder)
// Siembra: Catálogo de 12 permisos, 3 roles oficiales, 3 usuarios de prueba,
// 1 cuenta de portal activada y catálogo inicial de recompensas
// ==============================================================================

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../conexion'
import { roles, rolesPermisos, usuarios, cuentasPortal, recompensas, clientes } from '../schema'

// Catálogo oficial de los 12 permisos fijos requeridos por la prueba
export const LISTA_PERMISOS = [
  { clave: 'ver_resumen_panel', descripcion: 'Ver resumen del panel' },
  { clave: 'buscar_cliente_detalle', descripcion: 'Buscar cliente y ver puntos, nivel e historial' },
  { clave: 'ver_montos_financieros', descripcion: 'Ver montos (gasto en MXN, pedidos y pagos)' },
  { clave: 'ver_listas_riesgo_cumpleanos', descripcion: 'Ver listas de riesgo y cumpleaños' },
  { clave: 'exportar_reportes_csv', descripcion: 'Exportar reportes (CSV)' },
  { clave: 'gestionar_catalogo_recompensas', descripcion: 'Gestionar catálogo de recompensas' },
  { clave: 'gestionar_canjes', descripcion: 'Gestionar canjes (entregar, aplicar cupón, cancelar)' },
  { clave: 'generar_acceso_portal_cliente', descripcion: 'Generar o restablecer acceso al portal de un cliente' },
  { clave: 'ejecutar_sincronizacion', descripcion: 'Ejecutar sincronización' },
  { clave: 'gestionar_usuarios', descripcion: 'Gestionar usuarios' },
  { clave: 'gestionar_roles_permisos', descripcion: 'Gestionar roles y permisos' },
  { clave: 'gestionar_tokens_api', descripcion: 'Gestionar tokens de API' },
] as const

// Definición oficial de los 3 roles con su matriz de permisos
export const ROLES_DEFINICION = [
  {
    nombre: 'Administrador',
    descripcion: 'Control total de la plataforma, roles, sincronización y auditoría',
    permisos: [
      'ver_resumen_panel',
      'buscar_cliente_detalle',
      'ver_montos_financieros',
      'ver_listas_riesgo_cumpleanos',
      'exportar_reportes_csv',
      'gestionar_catalogo_recompensas',
      'gestionar_canjes',
      'generar_acceso_portal_cliente',
      'ejecutar_sincronizacion',
      'gestionar_usuarios',
      'gestionar_roles_permisos',
      'gestionar_tokens_api',
    ],
  },
  {
    nombre: 'Gerente',
    descripcion: 'Supervisión operativa, visualización financiera, reportes y catálogo',
    permisos: [
      'ver_resumen_panel',
      'buscar_cliente_detalle',
      'ver_montos_financieros',
      'ver_listas_riesgo_cumpleanos',
      'exportar_reportes_csv',
      'gestionar_catalogo_recompensas',
      'gestionar_canjes',
      'generar_acceso_portal_cliente',
    ],
  },
  {
    nombre: 'Atención a clientes',
    descripcion: 'Soporte básico a clientes, consulta de saldo y recompensas (Sin montos financieros)',
    permisos: [
      'ver_resumen_panel',
      'buscar_cliente_detalle',
      'ver_listas_riesgo_cumpleanos',
      'gestionar_canjes',
      'generar_acceso_portal_cliente',
    ],
  },
]

export async function sembrarDatosIniciales() {
  console.log('🌱 Iniciando sembrado de datos iniciales...')

  // 1. Sembrar Roles y sus Permisos
  const mapaRoles = new Map<string, number>()

  for (const rolDefinicion of ROLES_DEFINICION) {
    let [rolExistente] = await db
      .select()
      .from(roles)
      .where(eq(roles.nombre, rolDefinicion.nombre))

    if (!rolExistente) {
      ;[rolExistente] = await db
        .insert(roles)
        .values({
          nombre: rolDefinicion.nombre,
          descripcion: rolDefinicion.descripcion,
        })
        .returning()
      console.log(`  ➕ Rol creado: ${rolDefinicion.nombre}`)
    }

    const rolId = rolExistente?.id
    if (!rolId) continue

    mapaRoles.set(rolDefinicion.nombre, rolId)

    for (const permisoClave of rolDefinicion.permisos) {
      await db
        .insert(rolesPermisos)
        .values({
          rolId,
          permisoClave,
        })
        .onConflictDoNothing()
    }
  }

  // 2. Sembrar los 3 Usuarios de Prueba Oficiales
  const usuariosPrueba = [
    {
      nombre: 'Administrador General',
      correo: process.env.ADMIN_CORREO || 'adrianalejandrovazquez@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'Admin123456!',
      rol: 'Administrador',
    },
    {
      nombre: 'Gerente Operativo',
      correo: 'gerente@tienda.com',
      password: 'Gerente123456!',
      rol: 'Gerente',
    },
    {
      nombre: 'Ejecutivo Atención',
      correo: 'atencion@tienda.com',
      password: 'Atencion123456!',
      rol: 'Atención a clientes',
    },
  ]

  for (const u of usuariosPrueba) {
    const rolId = mapaRoles.get(u.rol)
    if (!rolId) continue

    const [usuarioExistente] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.correo, u.correo))

    const passwordHash = await bcrypt.hash(u.password, 10)

    if (!usuarioExistente) {
      await db.insert(usuarios).values({
        nombre: u.nombre,
        correo: u.correo,
        passwordHash,
        rolId,
        activo: true,
      })
      console.log(`  👤 Usuario ${u.rol} creado: ${u.correo} (${u.password})`)
    } else {
      await db
        .update(usuarios)
        .set({ passwordHash, rolId, activo: true })
        .where(eq(usuarios.id, usuarioExistente.id))
      console.log(`  ℹ️ Usuario ${u.rol} actualizado: ${u.correo}`)
    }
  }

  // 3. Activar Cuenta Portal para el Cliente #1 (Franz Dickinson)
  const passwordCliente = 'Cliente123456!'
  const passwordHashCliente = await bcrypt.hash(passwordCliente, 10)

  // Verificar que el cliente 1 exista
  const [clienteUno] = await db.select().from(clientes).where(eq(clientes.id, 1)).limit(1)
  if (clienteUno) {
    await db
      .insert(cuentasPortal)
      .values({
        clienteId: 1,
        passwordHash: passwordHashCliente,
        estadoAcceso: 'activo',
        requiereCambioPassword: false,
      })
      .onConflictDoUpdate({
        target: cuentasPortal.clienteId,
        set: {
          passwordHash: passwordHashCliente,
          estadoAcceso: 'activo',
          requiereCambioPassword: false,
          actualizadoEn: new Date(),
        },
      })
    console.log(`  📱 Cliente #1 activado en Portal: ${clienteUno.correo} (${passwordCliente})`)
  }

  // 4. Sembrar Catálogo Inicial de Recompensas
  const recompensasIniciales = [
    {
      nombre: 'Cupón de Descuento $200 MXN',
      tipo: 'descuento',
      descripcion: 'Válido en cualquier compra en la tienda oficial',
      puntosRequeridos: 2000,
      nivelMinimo: 'Bronce',
      descuentoTipo: 'monto_fijo',
      descuentoValor: '200.00',
      vigenciaDias: 30,
      stock: null,
      activo: true,
    },
    {
      nombre: 'Cupón 15% Descuento en Tienda',
      tipo: 'descuento',
      descripcion: 'Aplica sobre el subtotal de tu próxima orden',
      puntosRequeridos: 3500,
      nivelMinimo: 'Bronce',
      descuentoTipo: 'porcentaje',
      descuentoValor: '15.00',
      compraMinimaMxn: '500.00',
      vigenciaDias: 30,
      stock: null,
      activo: true,
    },
    {
      nombre: 'Termo Acero Inoxidable 750ml Edición Lealtad',
      tipo: 'producto',
      descripcion: 'Mantiene bebidas frías 24h y calientes 12h. Envío a domicilio',
      puntosRequeridos: 5000,
      nivelMinimo: 'Bronce',
      stock: 25,
      activo: true,
    },
    {
      nombre: 'Mochila Ejecutiva Impermeable Antirrobo',
      tipo: 'producto',
      descripcion: 'Con compartimento acolchado para laptop de hasta 16"',
      puntosRequeridos: 8000,
      nivelMinimo: 'Plata',
      stock: 10,
      activo: true,
    },
    {
      nombre: 'Smartwatch Deportivo Pulso Pro',
      tipo: 'producto',
      descripcion: 'Monitoreo de frecuencia cardíaca, GPS y sumergible 50m',
      puntosRequeridos: 15000,
      nivelMinimo: 'Oro',
      stock: 3,
      activo: true,
    },
  ]

  for (const r of recompensasIniciales) {
    const [recExistente] = await db
      .select({ id: recompensas.id })
      .from(recompensas)
      .where(eq(recompensas.nombre, r.nombre))

    if (!recExistente) {
      await db.insert(recompensas).values(r)
      console.log(`  🎁 Recompensa sembrada: ${r.nombre} (${r.puntosRequeridos} pts)`)
    }
  }

  console.log('✅ Seeder completado exitosamente.')
}
