import { errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { createMercadoPagoPreference, validatePaymentAmount } from '@/lib/mercadopago'

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { amount?: unknown }
    const amountUsd = validatePaymentAmount(payload.amount)
    const user = requireSuccess(await newApiFetch<NewApiEnvelope<{ id?: number; email?: string; username?: string }>>('/api/user/self'))
    const preference = await createMercadoPagoPreference(user, amountUsd)
    return Response.json({ success: true, data: preference })
  } catch (error) {
    return errorResponse(error)
  }
}
