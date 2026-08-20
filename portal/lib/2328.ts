import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

import { BackendError, newApiFetch, type NewApiEnvelope } from '@/lib/new-api'
import { getPendingTopUp, insertPendingTopUp } from '@/lib/payment-topups'
import { validatePaymentAmount } from '@/lib/mercadopago'
import { getPortalPool } from '@/lib/portal-db'

export const MINIMUM_2328_PAYMENT_USD = 1
const API_URL = 'https://api.2328.io/api/v1'

type PortalUser = { id?: number; email?: string; username?: string }
type PaymentResult = {
  uuid?: string
  order_id?: string
  url?: string
  payment_status?: string
  amount_usd?: string
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
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new BackendError('PUBLIC_PORTAL_URL debe usar HTTPS en producción.', 503)
  }
  return value
}

function signBody(body: string) {
  const base64 = Buffer.from(body, 'utf8').toString('base64')
  return createHmac('sha256', required('2328_API_KEY')).update(base64).digest('hex')
}

async function apiFetch<T>(path: string, body: Record<string, unknown>) {
  const serialized = JSON.stringify(body)
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Orbiqen/1.0 (+https://orbiqen.com)',
      project: required('2328_PROJECT_ID'),
      sign: signBody(serialized),
    },
    body: serialized,
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null) as T | { message?: string; errors?: unknown } | null
  if (!response.ok || !payload) {
    throw new BackendError(
      typeof payload === 'object' && payload && 'message' in payload
        ? String(payload.message || '2328.io rechazó la operación.')
        : '2328.io no pudo procesar la operación.',
      502,
    )
  }
  return payload as T
}

export async function create2328Payment(user: PortalUser, amountUsd: number) {
  const userId = Number(user.id)
  if (!Number.isInteger(userId) || userId <= 0) throw new BackendError('No se pudo identificar la cuenta.', 401)
  const amount = validatePaymentAmount(amountUsd)
  if (amount < MINIMUM_2328_PAYMENT_USD) throw new BackendError('La recarga crypto mínima es de US$ 1.', 400)

  const tradeNo = `orbiqen:2328:${userId}:${randomUUID()}`
  await insertPendingTopUp(userId, amount, tradeNo, 'crypto', '2328')
  try {
    const body = await apiFetch<{ state?: number; result?: PaymentResult }>('/payment', {
      amount: amount.toFixed(2),
      currency: 'USD',
      order_id: tradeNo,
      url_callback: `${publicOrigin()}/api/payments/2328/webhook`,
      url_success: `${publicOrigin()}/?payment=success&provider=2328`,
      url_return: `${publicOrigin()}/?payment=pending&provider=2328`,
      description: `Crédito API Orbiqen - US$ ${amount.toFixed(2)}`,
      ttl_seconds: 3600,
    })
    if (!body.result?.url) throw new BackendError('2328.io no devolvió el enlace de pago.', 502)
    return { invoiceUrl: body.result.url, invoiceId: body.result.uuid || '', amountUsd: amount }
  } catch (error) {
    await getPortalPool().query(`DELETE FROM top_ups WHERE trade_no = $1 AND status = 'pending'`, [tradeNo]).catch(() => undefined)
    throw error
  }
}

function signatureIsValid(payload: Record<string, unknown>) {
  const received = String(payload.sign || '')
  if (!received) return false
  const unsigned = { ...payload }
  delete unsigned.sign
  const serialized = JSON.stringify(unsigned)
  const expected = signBodyWithKey(serialized, required('2328_API_KEY'))
  const actual = Buffer.from(received, 'utf8')
  const wanted = Buffer.from(expected, 'utf8')
  return actual.length === wanted.length && timingSafeEqual(actual, wanted)
}

function signBodyWithKey(body: string, key: string) {
  return createHmac('sha256', key).update(Buffer.from(body, 'utf8').toString('base64')).digest('hex')
}

export async function process2328Webhook(request: Request) {
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!payload || !signatureIsValid(payload)) throw new BackendError('Notificación crypto no válida.', 401)
  const status = String(payload.payment_status || '')
  const orderId = String(payload.order_id || '')
  if (!orderId.startsWith('orbiqen:2328:')) throw new BackendError('La orden crypto no es reconocida.', 400)
  if (status !== 'paid' && status !== 'overpaid') return { ignored: true, status }

  const topUp = await getPendingTopUp(orderId)
  if (!topUp) throw new BackendError('La orden de recarga no existe.', 404)
  if (topUp.status === 'success') return { credited: false, duplicate: true }

  const body = await newApiFetch<NewApiEnvelope<unknown>>('/api/user/topup/complete', {
    method: 'POST',
    body: JSON.stringify({ trade_no: orderId }),
  }, required('NEW_API_ADMIN_TOKEN'))
  if (body.success === false) throw new BackendError(body.message || 'No se pudo acreditar el saldo.', 502)
  return { credited: true, tradeNo: orderId, status }
}
