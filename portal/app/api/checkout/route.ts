import { errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { createMercadoPagoPreference, validatePaymentAmount } from '@/lib/mercadopago'
import { createNowPaymentsInvoice, MINIMUM_CRYPTO_PAYMENT_USD } from '@/lib/nowpayments'
import { create2328Payment } from '@/lib/2328'

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { amount?: unknown; provider?: unknown }
    const user = requireSuccess(await newApiFetch<NewApiEnvelope<{ id?: number; email?: string; username?: string }>>('/api/user/self'))
    if (payload.provider === 'crypto2328') {
      const amountUsd = validatePaymentAmount(payload.amount)
      const invoice = await create2328Payment(user, amountUsd)
      return Response.json({ success: true, data: { ...invoice, provider: 'crypto2328' } })
    }
    if (payload.provider === 'crypto') {
      const amountUsd = validatePaymentAmount(payload.amount)
      if (amountUsd < MINIMUM_CRYPTO_PAYMENT_USD) {
        return Response.json({ success: false, message: `Las recargas con crypto tienen un mínimo de US$ ${MINIMUM_CRYPTO_PAYMENT_USD}.` }, { status: 400 })
      }
      const invoice = await createNowPaymentsInvoice(user, amountUsd)
      return Response.json({ success: true, data: { ...invoice, provider: 'crypto' } })
    }
    const amountUsd = validatePaymentAmount(payload.amount)
    const preference = await createMercadoPagoPreference(user, amountUsd)
    return Response.json({ success: true, data: preference })
  } catch (error) {
    return errorResponse(error)
  }
}
