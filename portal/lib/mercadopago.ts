import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

import { BackendError, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { deletePendingTopUp, getPendingTopUp, insertPendingTopUp } from '@/lib/payment-topups'

export const MINIMUM_PAYMENT_USD = 1
export const MAXIMUM_PAYMENT_USD = 10_000
export const ARS_PER_USD = 1600

type PortalUser = {
  id?: number
  email?: string
  username?: string
}

type MercadoPagoPayment = {
  id?: number | string
  status?: string
  currency_id?: string
  transaction_amount?: number
  external_reference?: string
}

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new BackendError(`Falta configurar ${name}.`, 503)
  return value
}

function publicOrigin() {
  const value = required('PUBLIC_PORTAL_URL').replace(/\/$/, '')
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new BackendError('PUBLIC_PORTAL_URL no es válida.', 503)
  }
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new BackendError('PUBLIC_PORTAL_URL debe usar HTTPS en producción.', 503)
  }
  return value
}

export function validatePaymentAmount(value: unknown) {
  const amount = Number(value)
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100
  if (!Number.isFinite(amount) || amount < MINIMUM_PAYMENT_USD || amount > MAXIMUM_PAYMENT_USD || rounded !== amount) {
    throw new BackendError(`El monto debe estar entre US$ ${MINIMUM_PAYMENT_USD} y US$ ${MAXIMUM_PAYMENT_USD.toLocaleString('es-AR')}, con hasta 2 decimales.`, 400)
  }
  return rounded
}

export function arsForUsd(amountUsd: number) {
  return Math.round(amountUsd * ARS_PER_USD)
}

export async function createMercadoPagoPreference(user: PortalUser, amountUsd: number) {
  const userId = Number(user.id)
  if (!Number.isInteger(userId) || userId <= 0) throw new BackendError('No se pudo identificar la cuenta.', 401)

  const accessToken = required('MERCADOPAGO_ACCESS_TOKEN')
  required('NEW_API_ADMIN_TOKEN')
  const origin = publicOrigin()
  const tradeNo = `orbiqen:${userId}:${randomUUID()}`
  const amountArs = arsForUsd(amountUsd)

  await insertPendingTopUp(userId, amountUsd, tradeNo, 'mercadopago', 'mercadopago')
  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': tradeNo,
      },
      body: JSON.stringify({
        items: [{
          id: tradeNo,
          title: `Crédito API Orbiqen - US$ ${amountUsd}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: amountArs,
        }],
        external_reference: tradeNo,
        notification_url: `${origin}/api/payments/mercadopago/webhook?source_news=webhooks`,
        back_urls: {
          success: `${origin}/?payment=success`,
          pending: `${origin}/?payment=pending`,
          failure: `${origin}/?payment=failure`,
        },
        auto_return: 'approved',
        payer: user.email?.includes('@') ? { email: user.email } : undefined,
        metadata: { user_id: userId, amount_usd: amountUsd, amount_ars: amountArs },
      }),
    })
    const body = await response.json().catch(() => null) as { init_point?: string; id?: string; message?: string } | null
    if (!response.ok || !body?.init_point) {
      throw new BackendError(body?.message || 'Mercado Pago no pudo crear el checkout.', 502)
    }
    return { initPoint: body.init_point, preferenceId: body.id || '', amountUsd, amountArs }
  } catch (error) {
    await deletePendingTopUp(tradeNo).catch(() => undefined)
    throw error
  }
}

function signatureIsValid(request: Request, paymentId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== 'production'
  const signature = request.headers.get('x-signature') || ''
  const requestId = request.headers.get('x-request-id') || ''
  const parts = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=')))
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  const actualBuffer = Buffer.from(v1, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

async function getMercadoPagoPayment(paymentId: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${required('MERCADOPAGO_ACCESS_TOKEN')}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null) as MercadoPagoPayment | null
  if (!response.ok || !body) throw new BackendError('No se pudo verificar el pago en Mercado Pago.', 502)
  return body
}

export async function processMercadoPagoWebhook(request: Request) {
  const payload = await request.json().catch(() => ({})) as { type?: string; action?: string; data?: { id?: string | number } }
  const paymentId = String(payload.data?.id || new URL(request.url).searchParams.get('id') || '')
  const type = payload.type || new URL(request.url).searchParams.get('type') || ''
  if (type && type !== 'payment') return { ignored: true }
  if (!paymentId || !signatureIsValid(request, paymentId)) throw new BackendError('Notificación de pago no válida.', 401)

  const payment = await getMercadoPagoPayment(paymentId)
  if (payment.status !== 'approved') return { ignored: true, status: payment.status || 'unknown' }
  const tradeNo = payment.external_reference || ''
  if (!tradeNo.startsWith('orbiqen:')) throw new BackendError('El pago no tiene una orden reconocida.', 400)
  const topUp = await getPendingTopUp(tradeNo)
  if (!topUp) throw new BackendError('La orden de recarga no existe.', 404)
  if (topUp.status === 'success') return { credited: false, duplicate: true }
  if (payment.currency_id !== 'ARS' || Number(payment.transaction_amount) !== arsForUsd(topUp.money)) {
    throw new BackendError('El importe del pago no coincide con la orden.', 400)
  }

  const adminToken = required('NEW_API_ADMIN_TOKEN')
  const body = await newApiFetch<NewApiEnvelope<unknown>>('/api/user/topup/complete', {
    method: 'POST',
    body: JSON.stringify({ trade_no: tradeNo }),
  }, adminToken)
  requireSuccess(body)
  return { credited: true, tradeNo }
}
