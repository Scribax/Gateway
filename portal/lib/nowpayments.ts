import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

import { BackendError, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { deletePendingTopUp, getPendingTopUp, insertPendingTopUp } from '@/lib/payment-topups'
import { arsForUsd, validatePaymentAmount } from '@/lib/mercadopago'

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1'
export const MINIMUM_CRYPTO_PAYMENT_USD = 10

type PortalUser = { id?: number; email?: string; username?: string }
type NowPayment = {
  payment_id?: string | number
  payment_status?: string
  price_amount?: number | string
  price_currency?: string
  order_id?: string
}

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new BackendError(`Falta configurar ${name}.`, 503)
  return value
}

function publicOrigin() {
  const value = required('PUBLIC_PORTAL_URL').replace(/\/$/, '')
  let url: URL
  try { url = new URL(value) } catch { throw new BackendError('PUBLIC_PORTAL_URL no es válida.', 503) }
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new BackendError('PUBLIC_PORTAL_URL debe usar HTTPS en producción.', 503)
  return value
}

function apiUrl(path: string) {
  return `${process.env.NOWPAYMENTS_API_URL?.trim() || NOWPAYMENTS_API_URL}${path}`
}

async function nowpaymentsFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: { 'x-api-key': required('NOWPAYMENTS_API_KEY'), 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null) as T | { message?: string } | null
  if (!response.ok || !body) throw new BackendError((body as { message?: string } | null)?.message || 'NOWPayments no pudo procesar la solicitud.', 502)
  return body as T
}

export async function createNowPaymentsInvoice(user: PortalUser, amountUsd: number) {
  const userId = Number(user.id)
  if (!Number.isInteger(userId) || userId <= 0) throw new BackendError('No se pudo identificar la cuenta.', 401)
  validatePaymentAmount(amountUsd)
  if (amountUsd < MINIMUM_CRYPTO_PAYMENT_USD) {
    throw new BackendError(`Las recargas con crypto tienen un mínimo de US$ ${MINIMUM_CRYPTO_PAYMENT_USD} por los límites de red y conversión de NOWPayments.`, 400)
  }
  const origin = publicOrigin()
  const tradeNo = `orbiqen:crypto:${userId}:${randomUUID()}`
  await insertPendingTopUp(userId, amountUsd, tradeNo, 'crypto', 'nowpayments')
  try {
    const body = await nowpaymentsFetch<{ id?: string | number; invoice_url?: string }>('/invoice', {
      method: 'POST',
      body: JSON.stringify({
        price_amount: amountUsd,
        price_currency: 'usd',
        order_id: tradeNo,
        order_description: `Crédito API Orbiqen - US$ ${amountUsd}`,
        ipn_callback_url: `${origin}/api/payments/nowpayments/webhook`,
        success_url: `${origin}/?payment=pending&provider=crypto`,
        cancel_url: `${origin}/?payment=failure&provider=crypto`,
        is_fee_paid_by_user: true,
      }),
    })
    if (!body.invoice_url) throw new BackendError('NOWPayments no devolvió el enlace de pago.', 502)
    return { invoiceUrl: body.invoice_url, invoiceId: String(body.id || ''), amountUsd, amountArs: arsForUsd(amountUsd) }
  } catch (error) {
    await deletePendingTopUp(tradeNo).catch(() => undefined)
    throw error
  }
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject)
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortObject((value as Record<string, unknown>)[key])
      return result
    }, {})
  }
  return value
}

function signatureIsValid(payload: unknown, signature: string) {
  const expected = createHmac('sha512', required('NOWPAYMENTS_IPN_SECRET')).update(JSON.stringify(sortObject(payload))).digest('hex')
  const actualBuffer = Buffer.from(signature, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

async function getNowPayment(paymentId: string) {
  return nowpaymentsFetch<NowPayment>(`/payment/${encodeURIComponent(paymentId)}`)
}

export async function processNowPaymentsWebhook(request: Request) {
  const payload = await request.json().catch(() => null) as NowPayment | null
  const signature = request.headers.get('x-nowpayments-sig') || ''
  if (!payload || !signatureIsValid(payload, signature)) throw new BackendError('Notificación crypto no válida.', 401)
  const orderId = payload.order_id || ''
  if (!orderId.startsWith('orbiqen:crypto:')) throw new BackendError('La orden crypto no es reconocida.', 400)
  const topUp = await getPendingTopUp(orderId)
  if (!topUp) throw new BackendError('La orden crypto no existe.', 404)
  if (topUp.status === 'success') return { credited: false, duplicate: true }
  const paymentId = String(payload.payment_id || '')
  const payment = paymentId ? await getNowPayment(paymentId) : payload
  if (payment.payment_status !== 'finished') return { ignored: true, status: payment.payment_status || 'unknown' }
  if (String(payment.order_id || orderId) !== orderId || String(payment.price_currency || '').toLowerCase() !== 'usd' || Number(payment.price_amount) !== Number(topUp.money)) {
    throw new BackendError('El importe de la factura crypto no coincide con la orden.', 400)
  }
  const body = await newApiFetch<NewApiEnvelope<unknown>>('/api/user/topup/complete', {
    method: 'POST',
    body: JSON.stringify({ trade_no: orderId }),
  }, required('NEW_API_ADMIN_TOKEN'))
  requireSuccess(body)
  return { credited: true, tradeNo: orderId }
}
