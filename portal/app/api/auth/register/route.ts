import { BackendError, errorResponse, newApiFetch, type NewApiEnvelope } from '@/lib/new-api'

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { username?: string; password?: string }
    const username = payload.username?.trim() || ''
    if (username.length < 3 || username.length > 20) throw new BackendError('El usuario debe tener entre 3 y 20 caracteres.', 400)
    if (!payload.password || payload.password.length < 8 || payload.password.length > 20) {
      throw new BackendError('La contraseña debe tener entre 8 y 20 caracteres.', 400)
    }
    const body = await newApiFetch<NewApiEnvelope<unknown>>('/api/user/register', {
      method: 'POST',
      body: JSON.stringify({ username, password: payload.password }),
    }, null)
    if (!body.success) throw new BackendError(body.message || 'No se pudo crear la cuenta.', 400)
    return Response.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
