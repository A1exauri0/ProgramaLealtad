// ==============================================================================
// Endpoint API: GET /api/admin/tokens
// Lista los tokens de API registrados (sin exponer nunca el token plano, solo hash parcial)
// Protegido por permiso 'gestionar_tokens_api'
// ==============================================================================

import { desc, eq } from 'drizzle-orm'
import { db } from '~~/database/conexion'
import { tokensApi, usuarios } from '~~/database/schema/index'
import { exigirPermisoBackend } from '~~/server/utils/permisos'

export default defineEventHandler(async (event) => {
  await exigirPermisoBackend(event, 'gestionar_tokens_api')

  const lista = await db
    .select({
      id: tokensApi.id,
      nombre: tokensApi.nombre,
      tokenHash: tokensApi.tokenHash,
      revocado: tokensApi.revocado,
      ultimoUsoEn: tokensApi.ultimoUsoEn,
      creadoEn: tokensApi.creadoEn,
      creadoPorNombre: usuarios.nombre,
    })
    .from(tokensApi)
    .leftJoin(usuarios, eq(tokensApi.creadoPorUsuarioId, usuarios.id))
    .orderBy(desc(tokensApi.id))

  return {
    exito: true,
    tokens: lista.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      hashResumen: `${t.tokenHash.substring(0, 10)}...${t.tokenHash.substring(t.tokenHash.length - 6)}`,
      revocado: t.revocado,
      ultimoUsoEn: t.ultimoUsoEn,
      creadoEn: t.creadoEn,
      creadoPorNombre: t.creadoPorNombre || 'Sistema / Consola',
    })),
  }
})
