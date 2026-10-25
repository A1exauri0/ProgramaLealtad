// ==============================================================================
// Servicio de Sincronización · fakeapi.dev a Supabase PostgreSQL (sync.service.ts)
// Procesa usuarios, pedidos, pagos, calcula puntos, niveles, riesgo e idempotencia
// Optimizado para inserción en lotes (batching) y cálculo de alto rendimiento
// ==============================================================================

// Dependencias de base de datos y utilidades Drizzle
import { eq, sql } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import {
  clientes,
  pedidos,
  pagos,
  movimientosPuntos,
  cuentasPortal,
  canjes,
  corridasSincronizacion,
  inconsistenciasFuente,
} from '~~/database/schema/index'

// Servicios externos y reglas de negocio
import {
  consultarClientesExternos,
  consultarPedidosExternos,
  consultarPagosExternos,
} from './fakeapi.service'
import {
  FECHA_CORTE_STR,
  FECHA_INICIO_12M_STR,
  convertirUtcAUgc6Fecha,
  esFechaAntesOEnCorte,
  convertirAMxn,
  calcularPuntosPorPago,
  determinarNivelCliente,
  evaluarClienteEnRiesgo,
  calcularProximoCumpleanos,
} from '../utils/fidelizacion'

export interface OpcionesSincronizacion {
  tipo: 'manual' | 'cron'
  ejecutadoPorUsuarioId?: number
}

// Estructura interna para acumular estadísticas por cliente en memoria
interface AcumuladoCliente {
  id: number
  puntosGanados: number
  gasto12mMxn: number
  gastoTotalMxn: number
  tienePagoSucceeded: boolean
  ultimaActividad: string | null
}

/**
 * Ejecuta el proceso completo de sincronización de datos desde fakeapi.dev
 */
export async function ejecutarSincronizacionCompleta(opciones: OpcionesSincronizacion) {
  const inicioCorrida = new Date()
  let totalPeticionesHttp = 0

  // 1. Iniciar registro de la corrida en la base de datos
  const [corridaCreada] = await db
    .insert(corridasSincronizacion)
    .values({
      tipo: opciones.tipo,
      iniciadoEn: inicioCorrida,
      estatus: 'en_progreso',
      totalRequests: 0,
      ejecutadoPorUsuarioId: opciones.ejecutadoPorUsuarioId || null,
    })
    .returning()

  if (!corridaCreada) {
    throw new Error('No se pudo inicializar el registro de la corrida de sincronización.')
  }
  const corrida = corridaCreada

  try {
    console.log(`🚀 [Sync #${corrida.id}] Iniciando sincronización (${opciones.tipo})...`)

    // Mapa en memoria para acumular datos de cada cliente de forma instantánea
    const mapaAcumulados = new Map<number, AcumuladoCliente>()

    // ==========================================================================
    // PASO A: DESCARGAR Y GUARDAR CLIENTES (/users) EN LOTES
    // ==========================================================================
    console.log(`📥 [Sync #${corrida.id}] Descargando usuarios desde fakeapi.dev...`)
    let paginaUsuarios = 1
    let hayMasUsuarios = true
    let totalUsuariosGuardados = 0

    while (hayMasUsuarios) {
      const respuesta = await consultarClientesExternos(paginaUsuarios, 100)
      totalPeticionesHttp++

      const listaClientes = []
      const listaCuentasPortal = []

      for (const u of respuesta.data) {
        // Inicializar acumulador en memoria para este cliente
        mapaAcumulados.set(u.id, {
          id: u.id,
          puntosGanados: 0,
          gasto12mMxn: 0,
          gastoTotalMxn: 0,
          tienePagoSucceeded: false,
          ultimaActividad: null,
        })

        const fechaCumpleanos = calcularProximoCumpleanos(u.dob)
        const fechaNacimiento = u.dob ? u.dob.substring(0, 10) : null
        const creadoEnUtc = u.created_at ? new Date(u.created_at) : null
        const nombreCompleto =
          u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Sin Nombre'

        listaClientes.push({
          id: u.id,
          nombre: nombreCompleto,
          correo: u.email || null,
          telefono: u.phone || null,
          dob: u.dob || null,
          fechaNacimiento,
          creadoEnFuente: creadoEnUtc,
          fechaCumpleanos,
        })

        listaCuentasPortal.push({
          clienteId: u.id,
          estadoAcceso: 'sin_acceso' as const,
          requiereCambioPassword: true,
        })
      }

      // Guardar lote de clientes en Supabase de forma idempotente
      if (listaClientes.length > 0) {
        await db
          .insert(clientes)
          .values(listaClientes)
          .onConflictDoUpdate({
            target: clientes.id,
            set: {
              nombre: sql`excluded.nombre`,
              correo: sql`excluded.correo`,
              telefono: sql`excluded.telefono`,
              dob: sql`excluded.dob`,
              fechaNacimiento: sql`excluded.fecha_nacimiento`,
              fechaCumpleanos: sql`excluded.fecha_cumpleanos`,
              actualizadoEn: new Date(),
            },
          })

        await db
          .insert(cuentasPortal)
          .values(listaCuentasPortal)
          .onConflictDoNothing()

        totalUsuariosGuardados += listaClientes.length
      }

      hayMasUsuarios = respuesta.meta.has_more
      paginaUsuarios++
    }

    console.log(`✅ [Sync #${corrida.id}] ${totalUsuariosGuardados} clientes sincronizados en lotes.`)

    // ==========================================================================
    // PASO B: DESCARGAR Y GUARDAR PEDIDOS (/orders) EN LOTES
    // ==========================================================================
    console.log(`📥 [Sync #${corrida.id}] Descargando pedidos desde fakeapi.dev...`)
    let paginaPedidos = 1
    let hayMasPedidos = true
    let totalPedidosGuardados = 0

    while (hayMasPedidos) {
      const respuesta = await consultarPedidosExternos(paginaPedidos, 100)
      totalPeticionesHttp++

      const listaPedidos = []
      const listaBonos = []

      for (const ord of respuesta.data) {
        const clienteId = ord.user?.id

        // REGLA: Ignorar pedidos de clientes que no existan en /users
        if (!clienteId || !mapaAcumulados.has(clienteId)) {
          continue
        }

        // Conversión a fecha local UTC-6
        const fechaLocal = convertirUtcAUgc6Fecha(ord.created_at)
        if (!fechaLocal) continue

        // REGLA: Ignorar pedidos con fecha local posterior al corte (2026-04-30)
        if (!esFechaAntesOEnCorte(fechaLocal)) {
          continue
        }

        const acumulado = mapaAcumulados.get(clienteId)!

        // Registrar actividad si el pedido NO está cancelled
        if (ord.status !== 'cancelled') {
          if (!acumulado.ultimaActividad || fechaLocal > acumulado.ultimaActividad) {
            acumulado.ultimaActividad = fechaLocal
          }
        }

        listaPedidos.push({
          id: ord.id,
          numeroOrden: ord.order_number || `ORD-${ord.id}`,
          clienteId,
          estatus: ord.status,
          estatusPago: ord.payment_status,
          total: ord.total ? String(ord.total) : null,
          fechaCreacionUtc: new Date(ord.created_at),
          fechaLocal,
          datosCrudos: ord,
        })

        // REGLA: Bono de +250 puntos si status = "delivered" Y payment_status = "paid"
        if (ord.status === 'delivered' && ord.payment_status === 'paid') {
          listaBonos.push({
            clienteId,
            fecha: fechaLocal,
            tipo: 'bono_orden_entregada',
            referencia: `orden:${ord.id}`,
            puntos: 250,
            origen: 'sync',
          })
          acumulado.puntosGanados += 250
        }
      }

      // Guardar pedidos en lote
      if (listaPedidos.length > 0) {
        await db
          .insert(pedidos)
          .values(listaPedidos)
          .onConflictDoUpdate({
            target: pedidos.id,
            set: {
              estatus: sql`excluded.estatus`,
              estatusPago: sql`excluded.estatus_pago`,
              total: sql`excluded.total`,
              fechaLocal: sql`excluded.fecha_local`,
            },
          })
        totalPedidosGuardados += listaPedidos.length
      }

      // Guardar bonos de puntos en lote
      if (listaBonos.length > 0) {
        await db
          .insert(movimientosPuntos)
          .values(listaBonos)
          .onConflictDoNothing()
      }

      hayMasPedidos = respuesta.meta.has_more
      paginaPedidos++
    }

    console.log(`✅ [Sync #${corrida.id}] ${totalPedidosGuardados} pedidos sincronizados en lotes.`)

    // ==========================================================================
    // PASO C: DESCARGAR Y GUARDAR PAGOS (/payments) EN LOTES
    // ==========================================================================
    console.log(`📥 [Sync #${corrida.id}] Descargando pagos desde fakeapi.dev...`)
    let paginaPagos = 1
    let hayMasPagos = true
    let totalPagosGuardados = 0

    while (hayMasPagos) {
      const respuesta = await consultarPagosExternos(paginaPagos, 100)
      totalPeticionesHttp++

      const listaPagos = []
      const listaMovimientos = []
      const listaInconsistencias = []

      for (const p of respuesta.data) {
        const clienteId = p.user?.id

        // REGLA: Ignorar pagos de clientes que no existan en /users
        if (!clienteId || !mapaAcumulados.has(clienteId)) {
          continue
        }

        // Fecha del pago: paid_at, o created_at si paid_at es null
        const fechaUtcString = p.paid_at || p.created_at
        const fechaLocal = convertirUtcAUgc6Fecha(fechaUtcString)
        if (!fechaLocal) continue

        // REGLA: Ignorar pagos con fecha local posterior al corte (2026-04-30)
        if (!esFechaAntesOEnCorte(fechaLocal)) {
          continue
        }

        // Conversión a MXN
        const montoMxn = convertirAMxn(Number(p.amount), p.currency)
        if (montoMxn === null) {
          // Moneda no soportada -> registrar inconsistencia
          listaInconsistencias.push({
            corridaId: corrida.id,
            entidad: 'payments',
            entidadId: String(p.id),
            tipoInconsistencia: 'moneda_no_soportada',
            descripcion: `Pago ${p.id} con moneda no soportada: ${p.currency}`,
            datosCrudos: p,
          })
          continue
        }

        const acumulado = mapaAcumulados.get(clienteId)!

        // Registrar actividad si el pago es succeeded
        if (p.status === 'succeeded') {
          acumulado.tienePagoSucceeded = true
          if (!acumulado.ultimaActividad || fechaLocal > acumulado.ultimaActividad) {
            acumulado.ultimaActividad = fechaLocal
          }

          acumulado.gastoTotalMxn += montoMxn

          // Acumular para Gasto 12 Meses si está dentro de la ventana
          if (fechaLocal >= FECHA_INICIO_12M_STR && fechaLocal <= FECHA_CORTE_STR) {
            acumulado.gasto12mMxn += montoMxn
          }
        }

        listaPagos.push({
          id: p.id,
          clienteId,
          pedidoId: p.metadata?.order_id || null,
          montoOriginal: String(p.amount),
          moneda: p.currency,
          montoMxn: String(montoMxn),
          estatus: p.status,
          fechaPagoUtc: new Date(fechaUtcString),
          fechaLocal,
          datosCrudos: p,
        })

        // REGLAS DE PUNTOS POR PAGO:
        // status = "succeeded": 1 punto por cada $10 MXN (floor)
        if (p.status === 'succeeded') {
          const puntosGanados = calcularPuntosPorPago(montoMxn, 'succeeded')
          if (puntosGanados > 0) {
            listaMovimientos.push({
              clienteId,
              fecha: fechaLocal,
              tipo: 'pago',
              referencia: `pago:${p.id}`,
              puntos: puntosGanados,
              origen: 'sync',
            })
            acumulado.puntosGanados += puntosGanados
          }
        } else if (p.status === 'refunded') {
          // status = "refunded": genera sus puntos iniciales y después un movimiento negativo igual
          const puntosBase = Math.floor(montoMxn / 10)
          if (puntosBase > 0) {
            listaMovimientos.push({
              clienteId,
              fecha: fechaLocal,
              tipo: 'pago',
              referencia: `pago:${p.id}`,
              puntos: puntosBase,
              origen: 'sync',
            })
            listaMovimientos.push({
              clienteId,
              fecha: fechaLocal,
              tipo: 'reembolso',
              referencia: `pago:${p.id}`,
              puntos: -puntosBase,
              origen: 'sync',
            })
            // En neto para refunded se suma y se resta, el efecto en puntosGanados es 0
          }
        }
      }

      // Guardar pagos en lote
      if (listaPagos.length > 0) {
        await db
          .insert(pagos)
          .values(listaPagos)
          .onConflictDoUpdate({
            target: pagos.id,
            set: {
              estatus: sql`excluded.estatus`,
              montoMxn: sql`excluded.monto_mxn`,
              fechaLocal: sql`excluded.fecha_local`,
            },
          })
        totalPagosGuardados += listaPagos.length
      }

      // Guardar movimientos de puntos en lote
      if (listaMovimientos.length > 0) {
        await db
          .insert(movimientosPuntos)
          .values(listaMovimientos)
          .onConflictDoNothing()
      }

      // Guardar inconsistencias si hubiere
      if (listaInconsistencias.length > 0) {
        await db
          .insert(inconsistenciasFuente)
          .values(listaInconsistencias)
          .onConflictDoNothing()
      }

      hayMasPagos = respuesta.meta.has_more
      paginaPagos++
    }

    console.log(`✅ [Sync #${corrida.id}] ${totalPagosGuardados} pagos sincronizados en lotes.`)

    // ==========================================================================
    // PASO D: RECALCULAR NIVELES, RIESGO Y PUNTOS DISPONIBLES
    // ==========================================================================
    console.log(`🔄 [Sync #${corrida.id}] Recalculando acumulados y niveles de clientes...`)

    // Consultar canjes existentes para descontar de puntosDisponibles
    const canjesPorCliente = await db
      .select({
        clienteId: canjes.clienteId,
        totalCanjeado: sql<number>`COALESCE(SUM(${canjes.puntosGastados}), 0)::int`,
      })
      .from(canjes)
      .where(sql`${canjes.estatus} != 'cancelado'`)
      .groupBy(canjes.clienteId)

    const mapaCanjes = new Map<number, number>()
    for (const c of canjesPorCliente) {
      mapaCanjes.set(c.clienteId, Number(c.totalCanjeado))
    }

    // Preparar actualizaciones de clientes procesando en chunks controlados de 50
    const listaActualizaciones = Array.from(mapaAcumulados.values()).map((ac) => {
      const gasto12mRedondeado = Math.round(ac.gasto12mMxn * 100) / 100
      const nivel = determinarNivelCliente(gasto12mRedondeado)
      const { enRiesgo, diasSinActividad } = evaluarClienteEnRiesgo(
        ac.tienePagoSucceeded,
        ac.ultimaActividad
      )
      const canjeado = mapaCanjes.get(ac.id) || 0
      const puntosDisponibles = Math.max(0, ac.puntosGanados - canjeado)

      return {
        id: ac.id,
        puntos: ac.puntosGanados,
        puntosDisponibles,
        nivel,
        gasto12m: String(gasto12mRedondeado),
        enRiesgo,
        diasSinActividad,
      }
    })

    // Actualizar clientes en la base de datos en lotes concurrentes de 50
    const tamanoLote = 50
    for (let i = 0; i < listaActualizaciones.length; i += tamanoLote) {
      const lote = listaActualizaciones.slice(i, i + tamanoLote)
      await Promise.all(
        lote.map((item) =>
          db
            .update(clientes)
            .set({
              puntos: item.puntos,
              puntosDisponibles: item.puntosDisponibles,
              nivel: item.nivel,
              gasto12m: item.gasto12m,
              enRiesgo: item.enRiesgo,
              diasSinActividad: item.diasSinActividad,
              actualizadoEn: new Date(),
            })
            .where(eq(clientes.id, item.id))
        )
      )
    }

    const finCorrida = new Date()
    const resumen = {
      totalClientes: mapaAcumulados.size,
      totalPedidos: totalPedidosGuardados,
      totalPagos: totalPagosGuardados,
      duracionSegundos: Math.round((finCorrida.getTime() - inicioCorrida.getTime()) / 1000),
    }

    // 6. Marcar corrida completada exitosamente
    await db
      .update(corridasSincronizacion)
      .set({
        estatus: 'completado',
        finalizadoEn: finCorrida,
        totalRequests: totalPeticionesHttp,
        resumen,
      })
      .where(eq(corridasSincronizacion.id, corrida.id))

    console.log(`🎉 [Sync #${corrida.id}] Sincronización completada con éxito:`, resumen)

    return {
      exito: true,
      corridaId: corrida.id,
      clientesSincronizados: mapaAcumulados.size,
      pedidosSincronizados: totalPedidosGuardados,
      pagosSincronizados: totalPagosGuardados,
      totalPeticionesHttp,
      duracionMs: finCorrida.getTime() - inicioCorrida.getTime(),
      resumen,
    }
  } catch (error: any) {
    const finError = new Date()
    console.error(`💥 [Sync #${corrida.id}] Error durante la sincronización:`, error)

    await db
      .update(corridasSincronizacion)
      .set({
        estatus: 'fallido',
        finalizadoEn: finError,
        totalRequests: totalPeticionesHttp,
        mensajeError: error.message || String(error),
      })
      .where(eq(corridasSincronizacion.id, corrida.id))

    throw error
  }
}
