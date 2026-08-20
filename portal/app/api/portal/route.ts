import { errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { QUOTA_PER_USD } from '@/lib/catalog'
import { readModelHealth } from '@/lib/model-health'
import { getEnabledModelCatalog } from '@/lib/model-availability'

type PageData<T> = { items: T[]; total: number; page: number; page_size: number }
type LogItem = {
  id: number
  created_at: number
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  token_name: string
}

type ChannelStatus = {
  id: string
  label: string
  accent: 'green' | 'coral' | 'blue'
  provider: 'OpenAI'
  modelId: string
  group: string
  status: 'Operational' | 'Degraded' | 'Inactive'
  endpointPingMs: number
  dialogLatencyMs: number
  windows: Record<'7' | '15' | '30', {
    days: number
    availability: number
    requests: number
    tokens: number
    costUsd: number
    lastSeen: number
    history: number[]
  }>
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function pickStatus(availability: number, requests: number) {
  if (requests === 0) return 'Inactive' as const
  if (availability >= 70) return 'Operational' as const
  if (availability >= 30) return 'Degraded' as const
  return 'Degraded' as const
}

function buildHistory(logs: LogItem[], windowDays: number, modelId: string) {
  const dayBuckets = Array.from({ length: windowDays }, () => 0)
  const now = Date.now()
  const start = now - windowDays * 24 * 60 * 60 * 1000
  logs.forEach((log) => {
    if (log.model_name !== modelId) return
    const ts = log.created_at * 1000
    if (ts < start || ts > now) return
    const index = clamp(Math.floor((ts - start) / (24 * 60 * 60 * 1000)), 0, windowDays - 1)
    dayBuckets[index] += 1
  })
  return dayBuckets
}

function buildWindow(logs: LogItem[], modelId: string, windowDays: number) {
  const now = Date.now()
  const windowStart = now - windowDays * 24 * 60 * 60 * 1000
  const windowLogs = logs.filter((log) => log.model_name === modelId && log.created_at * 1000 >= windowStart)
  const lastSeen = windowLogs.reduce((max, log) => Math.max(max, log.created_at || 0), 0)
  const requests = windowLogs.length
  const tokens = windowLogs.reduce((sum, log) => sum + (log.prompt_tokens || 0) + (log.completion_tokens || 0), 0)
  const costUsd = windowLogs.reduce((sum, log) => sum + ((log.quota || 0) / QUOTA_PER_USD), 0)
  const activeDays = new Set(windowLogs.map((log) => new Date(log.created_at * 1000).toISOString().slice(0, 10))).size
  const availability = requests === 0 ? 0 : Math.round((activeDays / windowDays) * 100)
  const history = buildHistory(logs, windowDays, modelId)
  const peak = history.reduce((max, value) => Math.max(max, value), 0) || 1
  return {
    days: windowDays,
    availability,
    requests,
    tokens,
    costUsd,
    lastSeen,
    history: history.map((value) => Math.max(12, Math.round((value / peak) * 100))),
  }
}

function isBillableLog(log: LogItem) {
  const tokens = (log.prompt_tokens || 0) + (log.completion_tokens || 0)
  return Boolean(log.model_name) && Boolean(log.token_name) && (tokens > 0 || (log.quota || 0) > 0)
}

export async function GET() {
  try {
    const [selfBody, keysBody, logsBody, groupsBody, modelHealth, enabledCatalog] = await Promise.all([
      newApiFetch<NewApiEnvelope<Record<string, unknown>>>('/api/user/self'),
      newApiFetch<NewApiEnvelope<PageData<Record<string, unknown>>>>('/api/token/?p=1&size=100'),
      newApiFetch<NewApiEnvelope<PageData<Record<string, unknown>>>>('/api/log/self?p=1&size=12'),
      newApiFetch<NewApiEnvelope<Record<string, { desc: string; ratio: number | string }>>>('/api/user/self/groups'),
      readModelHealth(),
      getEnabledModelCatalog(),
    ])

    const user = requireSuccess(selfBody)
    const keys = requireSuccess(keysBody)
    const logs = requireSuccess(logsBody) as PageData<LogItem>
    const groups = requireSuccess(groupsBody)
    const hasHealthState = Object.keys(modelHealth).length > 0
    const statusLastCheckedAt = Object.values(modelHealth).reduce((max, value) => Math.max(max, value.checkedAt || 0), 0)
    const visibleModels = enabledCatalog
    const keyModels = enabledCatalog
    const statusModels = enabledCatalog
    const requestLogs = (logs.items || []).filter(isBillableLog)
    const statusWindows = [7, 15, 30]
    const channels = statusModels.map((model) => {
      const health = modelHealth[model.id]
      const windows = {
        '7': buildWindow(requestLogs, model.id, 7),
        '15': buildWindow(requestLogs, model.id, 15),
        '30': buildWindow(requestLogs, model.id, 30),
      } as const
      const requests = windows['7'].requests
      const tokens = windows['7'].tokens
      const availability = windows['7'].availability
      const endpointPingMs = clamp(Math.round(28 + (requests * 3.4) + (model.input * 25)), 18, 180)
      const dialogLatencyMs = clamp(Math.round(900 + (tokens / 3) + (model.output * 45)), 420, 18000)

      return {
        id: model.id,
        label: model.label,
        accent: model.accent,
        provider: 'OpenAI' as const,
        modelId: model.id,
        group: 'clientes',
        status: health ? health.ok ? 'Operational' : 'Degraded' : pickStatus(availability, requests),
        endpointPingMs,
        dialogLatencyMs,
        windows,
      } satisfies ChannelStatus
    })

    return Response.json({
      success: true,
      data: {
        user,
        keys: keys.items || [],
        logs: requestLogs.slice(0, 12),
        logTotal: requestLogs.length,
        models: visibleModels,
        keyModels,
        groups,
        channels,
        statusWindows,
        statusLastCheckedAt,
        quotaPerUsd: QUOTA_PER_USD,
        gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://127.0.0.1:3000/v1',
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
