// ==============================================================================
// Seeder Inicial (Equivalente a Laravel DatabaseSeeder)
// Siembra: Catálogo de 12 permisos, 3 roles oficiales y usuario Administrador
// ==============================================================================

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../conexion'
import { roles, rolesPermisos, usuarios } from '../schema'

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

// Matriz inicial de roles y permisos según Sección 3 de la prueba técnica
export const MATRIZ_ROLES_INICIALES = [
  {
    nombre: 'Administrador',
    descripcion: 'Control total de la plataforma y configuraciones de seguridad',
    esSistema: true,
    permisos: LISTA_PERMISOS.map((p) => p.clave), // 12 permisos
  },
  {
    nombre: 'Gerente',
    descripcion: 'Supervisión de clientes, reportes, canjes y catálogo de recompensas',
    esSistema: false,
    permisos: [
      'ver_resumen_panel',
      'buscar_cliente_detalle',
      'ver_montos_financieros',
      'ver_listas_riesgo_cumpleanos',
      'exportar_reportes_csv',
      'gestionar_catalogo_recompensas',
      'gestionar_canjes',
      'generar_acceso_portal_cliente',
    ], // 8 permisos
  },
  {
    nombre: 'Atención a clientes',
    descripcion: 'Consulta de clientes, soporte de canjes y restablecimiento de acceso',
    esSistema: false,
    permisos: [
      'ver_resumen_panel',
      'buscar_cliente_detalle',
      'ver_listas_riesgo_cumpleanos',
      'gestionar_canjes',
      'generar_acceso_portal_cliente',
    ], // 5 permisos (sin ver montos financieros)
  },
]

export async function sembrarDatosIniciales() {
  console.log('🌱 Ejecutando Seeder Inicial...')

  // 1. Sembrar Roles y sus Permisos
  for (const rolDefinicion of MATRIZ_ROLES_INICIALES) {
    let [rolExistente] = await db
      .select()
      .from(roles)
      .where(eq(roles.nombre, rolDefinicion.nombre))

    if (!rolExistente) {
      const [nuevoRol] = await db
        .insert(roles)
        .values({
          nombre: rolDefinicion.nombre,
          descripcion: rolDefinicion.descripcion,
          esSistema: rolDefinicion.esSistema,
        })
        .returning()
      rolExistente = nuevoRol
      console.log(`  ➕ Rol creado: ${rolDefinicion.nombre}`)
    } else {
      console.log(`  ℹ️ Rol ya existente: ${rolDefinicion.nombre}`)
    }

    const rolId = rolExistente?.id
    if (!rolId) continue

    // Limpiar permisos existentes del rol para asegurar correspondencia 1:1 exacta con la actividad
    await db.delete(rolesPermisos).where(eq(rolesPermisos.rolId, rolId))

    // Insertar permisos oficiales del rol
    for (const permisoClave of rolDefinicion.permisos) {
      await db
        .insert(rolesPermisos)
        .values({
          rolId,
          permisoClave,
        })
        .onConflictDoNothing()
    }
    console.log(`  🔑 Permisos asignados a ${rolDefinicion.nombre}: ${rolDefinicion.permisos.length}`)
  }

  // 2. Sembrar Usuario Administrador Inicial
  const correoAdmin = process.env.ADMIN_CORREO || 'adrianalejandrovazquez@gmail.com'
  const passwordAdmin = process.env.ADMIN_PASSWORD || 'ZGpAnpnZgOvZiAZY'

  const [rolAdmin] = await db
    .select()
    .from(roles)
    .where(eq(roles.nombre, 'Administrador'))

  if (!rolAdmin) {
    throw new Error('No se encontró el rol Administrador.')
  }

  const [adminExistente] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.correo, correoAdmin))

  const passwordHash = await bcrypt.hash(passwordAdmin, 10)

  if (!adminExistente) {
    await db.insert(usuarios).values({
      nombre: 'Administrador General',
      correo: correoAdmin,
      passwordHash,
      rolId: rolAdmin.id,
      activo: true,
    })
    console.log(`  👤 Usuario Administrador creado: ${correoAdmin}`)
  } else {
    // Actualizar hash por si cambió la contraseña en .env
    await db
      .update(usuarios)
      .set({ passwordHash, rolId: rolAdmin.id, activo: true })
      .where(eq(usuarios.id, adminExistente.id))
    console.log(`  ℹ️ Usuario Administrador actualizado: ${correoAdmin}`)
  }

  console.log('✅ Seeder completado exitosamente.')
}
