import { errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { createMercadoPagoPreference, validatePaymentAmount } from '@/lib/mercadopago'
import { createNowPaymentsInvoice } from '@/lib/nowpayments'

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { amount?: unknown; provider?: unknown }
    const amountUsd = validatePaymentAmount(payload.amount)
    const user = requireSuccess(await newApiFetch<NewApiEnvelope<{ id?: number; email?: string; username?: string }>>('/api/user/self'))
    if (payload.provider === 'crypto') {
      const invoice = await createNowPaymentsInvoice(user, amountUsd)
      return Response.json({ success: true, data: { ...invoice, provider: 'crypto' } })
    }
    const preference = await createMercadoPagoPreference(user, amountUsd)
    return Response.json({ success: true, data: preference })
  } catch (error) {
    return errorResponse(error)
  }
}
