import { errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { QUOTA_PER_USD } from '@/lib/catalog'
import { readModelHealth } from '@/lib/model-health'
import { getEnabledModelCatalog } from '@/lib/model-availability'
import { getSalesGroups } from '@/lib/sales-groups'

type PageData<T> = { items: T[]; total: number; page: number; page_size: number }
type LogItem = {
  id: number
  created_at: number
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  token_name: string
  use_time?: number
}

type ChannelStatus = {
  id: string
  label: string
  accent: 'green' | 'coral' | 'blue'
  provider: 'OpenAI' | 'Anthropic' | 'DeepSeek'
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
  const history = buildHistory(logs, windowDays, modelId)
  const peak = history.reduce((max, value) => Math.max(max, value), 0) || 1

  const availability = 99.9

  return {
    days: windowDays,
    availability,
    requests,
    tokens,
    costUsd,
    lastSeen,
    history: history.map((value) => (value > 0 ? Math.max(25, Math.round((value / peak) * 100)) : 15)),
  }
}

function isBillableLog(log: LogItem) {
  const tokens = (log.prompt_tokens || 0) + (log.completion_tokens || 0)
  return Boolean(log.model_name) && Boolean(log.token_name) && (tokens > 0 || (log.quota || 0) > 0)
}

function getProviderFromModel(modelId: string): 'OpenAI' | 'Anthropic' | 'DeepSeek' {
  if (modelId.toLowerCase().includes('claude')) return 'Anthropic'
  if (modelId.toLowerCase().includes('deepseek')) return 'DeepSeek'
  return 'OpenAI'
}

export async function GET() {
  try {
    const [selfBody, keysBody, logsBody, groupsBody, modelHealth, enabledCatalog, salesGroups] = await Promise.all([
      newApiFetch<NewApiEnvelope<Record<string, unknown>>>('/api/user/self'),
      newApiFetch<NewApiEnvelope<PageData<Record<string, unknown>>>>('/api/token/?p=1&size=100'),
      newApiFetch<NewApiEnvelope<PageData<Record<string, unknown>>>>('/api/log/self?p=1&size=50'),
      newApiFetch<NewApiEnvelope<Record<string, { desc: string; ratio: number | string }>>>('/api/user/self/groups'),
      readModelHealth(),
      getEnabledModelCatalog(),
      getSalesGroups({ publishedOnly: true }),
    ])

    const user = requireSuccess(selfBody)
    const keys = requireSuccess(keysBody)
    const logs = requireSuccess(logsBody) as PageData<LogItem>
    const groups = requireSuccess(groupsBody)
    const statusLastCheckedAt = Object.values(modelHealth).reduce((max, value) => Math.max(max, value.checkedAt || 0), Math.floor(Date.now() / 1000))
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

      const basePing = model.id.includes('claude') ? 42 : model.id.includes('gpt-5') ? 35 : 28
      const baseDialog = model.id.includes('opus') ? 950 : model.id.includes('sonnet') ? 680 : 540

      const endpointPingMs = health?.endpointPingMs || basePing
      const dialogLatencyMs = health?.dialogLatencyMs || baseDialog

      const isOperational = !health || health.ok || (health.statusCode && health.statusCode < 500)

      return {
        id: model.id,
        label: model.label,
        accent: model.accent,
        provider: getProviderFromModel(model.id),
        modelId: model.id,
        group: 'clientes',
        status: isOperational ? 'Operational' : 'Degraded',
        endpointPingMs,
        dialogLatencyMs,
        windows,
      } satisfies ChannelStatus
    })

    const gatewayUrl = (process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://orbiqen.com/v1').replace(/\/$/, '')

    return Response.json({
      success: true,
      data: {
        user,
        keys: keys.items || [],
        logs: requestLogs.slice(0, 12),
        logTotal: requestLogs.length,
        models: visibleModels,
        keyModels,
        statusModels,
        channels,
        groups,
        salesGroups,
        statusWindows,
        statusLastCheckedAt,
        quotaPerUsd: QUOTA_PER_USD,
        gatewayUrl,
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
