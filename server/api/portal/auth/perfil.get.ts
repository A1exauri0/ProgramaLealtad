// ==============================================================================
// Endpoint API · Consultar Perfil del Cliente Autenticado (GET /api/portal/auth/perfil)
// ==============================================================================

import { eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { clientes, cuentasPortal } from '~~/database/schema/index'
import { exigirSesionPortal } from '~~/server/utils/jwtPortal'

export default defineEventHandler(async (event) => {
  const sesion = await exigirSesionPortal(event)

  const [cliente] = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      correo: clientes.correo,
      telefono: clientes.telefono,
      nivel: clientes.nivel,
      puntosDisponibles: clientes.puntosDisponibles,
      puntosHistoricos: clientes.puntos,
      gasto12m: clientes.gasto12m,
      enRiesgo: clientes.enRiesgo,
      diasSinActividad: clientes.diasSinActividad,
      creadoEnFuente: clientes.creadoEnFuente,
    })
    .from(clientes)
    .where(eq(clientes.id, sesion.clienteId))
    .limit(1)

  if (!cliente) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Cliente no encontrado.',
    })
  }

  const [cuenta] = await db
    .select({
      requiereCambioPassword: cuentasPortal.requiereCambioPassword,
      ultimoAccesoEn: cuentasPortal.ultimoAccesoEn,
    })
    .from(cuentasPortal)
    .where(eq(cuentasPortal.clienteId, cliente.id))
    .limit(1)

  return {
    ok: true,
    cliente: {
      ...cliente,
      requiereCambioPassword: Boolean(cuenta?.requiereCambioPassword),
      ultimoAccesoEn: cuenta?.ultimoAccesoEn,
    },
  }
})
