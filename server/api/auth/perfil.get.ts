// ==============================================================================
// Endpoint API · Perfil de Usuario Actual (GET /api/auth/perfil)
// Devuelve el usuario conectado, su rol y la lista de permisos activos
// ==============================================================================

import { exigirUsuarioAutenticado } from '../../utils/permisos'

export default defineEventHandler(async (event) => {
  const usuario = await exigirUsuarioAutenticado(event)

  return {
    exito: true,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rolId: usuario.rolId,
      rol: usuario.rolNombre,
      permisos: usuario.permisos,
    },
  }
})
