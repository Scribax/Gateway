import { BackendError, errorResponse, newApiFetch, type NewApiEnvelope } from '@/lib/new-api'

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { username?: string; password?: string; email?: string; verificationCode?: string }
    const username = payload.username?.trim() || ''
    const email = payload.email?.trim().toLowerCase() || ''
    const verificationCode = payload.verificationCode?.trim() || ''
    if (username.length < 3 || username.length > 20) throw new BackendError('El usuario debe tener entre 3 y 20 caracteres.', 400)
    if (!payload.password || payload.password.length < 8 || payload.password.length > 20) {
      throw new BackendError('La contraseña debe tener entre 8 y 20 caracteres.', 400)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new BackendError('Ingresá un correo electrónico válido.', 400)
    }
    if (!/^\d{6}$/.test(verificationCode)) throw new BackendError('Ingresá el código de 6 dígitos que recibiste.', 400)
    let body: NewApiEnvelope<unknown>
    try {
      body = await newApiFetch<NewApiEnvelope<unknown>>('/api/user/register', {
        method: 'POST',
        body: JSON.stringify({ username, password: payload.password, email, verification_code: verificationCode }),
      }, null)
    } catch {
      throw new BackendError('No se pudo crear la cuenta en este momento. Intentá nuevamente.', 502)
    }
    if (!body.success) throw new BackendError('No se pudo crear la cuenta. Revisá el código o usá otro usuario y correo.', 400)
    return Response.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
