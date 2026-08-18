import { BackendError, errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'

const INTERNAL_URL = (process.env.NEW_API_INTERNAL_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const MOTHER_PROBE_KEY = process.env.STATUS_PROBE_API_KEY?.trim() || ''
const MOTHER_PROBE_BASE_URL = (process.env.STATUS_PROBE_BASE_URL || '').replace(/\/$/, '')

type KeyItem = {
  id: number
  status: number
  remain_quota: number
  unlimited_quota?: boolean
  model_limits_enabled?: boolean
  model_limits?: string
}
type KeyPage = { items: KeyItem[]; total: number; page: number; page_size: number }
type ProbeResult = {
  model: string
  ok: boolean
  status: 'Operational' | 'Degraded'
  statusCode: number
  endpointPingMs: number
  dialogLatencyMs: number
  message: string
  checkedAt: number
}

function canUseModel(key: KeyItem, model: string) {
  if (key.status !== 1) return false
  if (!key.unlimited_quota && key.remain_quota <= 0) return false
  if (!key.model_limits_enabled) return true
  return (key.model_limits || '').split(',').map((item) => item.trim()).includes(model)
}

async function revealKey(id: number) {
  const body = await newApiFetch<NewApiEnvelope<{ key: string }>>(`/api/token/${id}/key`, { method: 'POST' })
  const rawKey = requireSuccess(body).key
  return rawKey.startsWith('sk-') ? rawKey : `sk-${rawKey}`
}

async function probeModel(model: string, apiKey: string, baseUrl: string): Promise<ProbeResult> {
  const checkedAt = Math.floor(Date.now() / 1000)
  const endpointStarted = performance.now()

  try {
    const modelsResponse = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const endpointPingMs = Math.round(performance.now() - endpointStarted)
    const started = performance.now()
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Responde solo OK' }],
        max_tokens: 8,
        stream: false,
      }),
      signal: AbortSignal.timeout(18000),
      cache: 'no-store',
    })
    const dialogLatencyMs = Math.round(performance.now() - started)
    const text = await response.text()
    const ok = modelsResponse.ok && response.ok
    return {
      model,
      ok,
      status: ok ? 'Operational' : 'Degraded',
      statusCode: response.status,
      endpointPingMs,
      dialogLatencyMs,
      message: ok ? 'Models y completion OK' : text.slice(0, 180) || response.statusText,
      checkedAt,
    }
  } catch (error) {
    const dialogLatencyMs = Math.round(performance.now() - endpointStarted)
    const message = error instanceof Error ? error.message : 'No se pudo probar el modelo.'
    return {
      model,
      ok: false,
      status: 'Degraded',
      statusCode: 0,
      endpointPingMs: 0,
      dialogLatencyMs,
      message,
      checkedAt,
    }
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({})) as { models?: string[] }
    const requestedModels = Array.isArray(payload.models) ? payload.models.filter((model) => typeof model === 'string') : []
    if (requestedModels.length === 0 || requestedModels.length > 25) {
      throw new BackendError('Seleccioná entre 1 y 25 modelos para probar.', 400)
    }

    const modelsBody = await newApiFetch<NewApiEnvelope<string[]>>('/api/user/models')
    const allowedModels = new Set(requireSuccess(modelsBody))
    const models = requestedModels.filter((model) => allowedModels.has(model))
    if (models.length === 0) throw new BackendError('No hay modelos permitidos para probar.', 400)

    const directMotherMode = Boolean(MOTHER_PROBE_KEY && MOTHER_PROBE_BASE_URL)
    const keysBody = directMotherMode
      ? null
      : await newApiFetch<NewApiEnvelope<KeyPage>>('/api/token/?p=1&size=100')
    const keys = keysBody ? requireSuccess(keysBody).items || [] : []
    const keyCache = new Map<number, string>()
    const results: ProbeResult[] = []

    for (const model of models) {
      const token = directMotherMode ? null : keys.find((key) => canUseModel(key, model))
      if (!directMotherMode && !token) {
        results.push({
          model,
          ok: false,
          status: 'Degraded',
          statusCode: 403,
          endpointPingMs: 0,
          dialogLatencyMs: 0,
          message: 'No hay una API Key activa con saldo para este modelo.',
          checkedAt: Math.floor(Date.now() / 1000),
        })
        continue
      }
      const apiKey = directMotherMode
        ? MOTHER_PROBE_KEY
        : (token && (keyCache.has(token.id)
          ? keyCache.get(token.id)
          : await revealKey(token.id))) || ''
      const baseUrl = directMotherMode ? MOTHER_PROBE_BASE_URL : `${INTERNAL_URL}/v1`
      results.push(await probeModel(model, apiKey, baseUrl))
    }

    return Response.json({ success: true, data: { results } })
  } catch (error) {
    return errorResponse(error)
  }
}
