import { BackendError, errorResponse, newApiFetch, type NewApiEnvelope } from '@/lib/new-api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { email?: string }
    const email = payload.email?.trim().toLowerCase() || ''
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      throw new BackendError('Ingresá un correo electrónico válido.', 400)
    }

    let body: NewApiEnvelope<unknown>
    try {
      body = await newApiFetch<NewApiEnvelope<unknown>>(
        `/api/verification?email=${encodeURIComponent(email)}`,
        {},
        null,
      )
    } catch {
      throw new BackendError('No pudimos enviar el código. Intentá nuevamente en unos minutos.', 502)
    }
    if (!body.success) {
      throw new BackendError('No pudimos enviar el código. Revisá el correo o intentá nuevamente.', 400)
    }
    return Response.json({ success: true, message: 'Te enviamos un código de 6 dígitos.' })
  } catch (error) {
    return errorResponse(error)
  }
}
