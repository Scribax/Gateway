import { BackendError, errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { MODEL_CATALOG, QUOTA_PER_USD } from '@/lib/catalog'
import { getModelAvailability } from '@/lib/model-availability'
import { getProviderGroups, getProviderProfiles } from '@/lib/provider-profiles'

type PageData<T> = { items: T[]; total: number; page: number; page_size: number }
type AdminUser = {
  id?: number
  username?: string
  display_name?: string
  role?: number
  status?: number
  quota?: number
  used_quota?: number
  request_count?: number
  group?: string
}
type CustomerStat = {
  username: string
  displayName: string
  group: string
  status: number
  balanceUsd: number
  requests: number
  tokens: number
  revenueUsd: number
  costUsd: number
  errors: number
}
type AdminLog = {
  id: number
  user_id?: number
  username?: string
  created_at: number
  type?: number
  model_name?: string
  token_name?: string
  quota?: number
  prompt_tokens?: number
  completion_tokens?: number
  other?: string | Record<string, unknown>
}

const ADMIN_ROLE = 10
const MAX_LOG_PAGES = 20

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function parseMeta(raw: AdminLog['other']) {
  if (!raw) return {} as Record<string, unknown>
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) as Record<string, unknown> } catch { return {} }
}

async function loadPages<T>(path: string) {
  const pageSize = 100
  const items: T[] = []
  let total = 0
  let truncated = false

  for (let page = 1; page <= MAX_LOG_PAGES; page += 1) {
    const separator = path.includes('?') ? '&' : '?'
    const body = await newApiFetch<NewApiEnvelope<PageData<T>>>(`${path}${separator}p=${page}&page_size=${pageSize}`)
    const data = requireSuccess(body)
    total = data.total || items.length
    items.push(...(data.items || []))
    if (!data.items || data.items.length < pageSize) break
    if (page === MAX_LOG_PAGES) truncated = true
  }

  return { items, total, truncated }
}

function billedUsd(log: AdminLog) {
  return (log.quota || 0) / QUOTA_PER_USD
}

function providerCostUsd(log: AdminLog, upstreamFactor: number) {
  const model = MODEL_CATALOG.find((item) => item.id === log.model_name)
  const billed = billedUsd(log)
  if (!model) return billed * upstreamFactor

  const meta = parseMeta(log.other)
  const cacheReadTokens = Number(meta.cache_read_tokens ?? meta.cache_tokens ?? 0)
  const cacheCreationTokens = Number(
    meta.cache_creation_tokens ?? meta.cache_creation_input_tokens ?? meta.cache_write_tokens ?? 0,
  )
  const promptTokens = Math.max(0, (log.prompt_tokens || 0) - cacheReadTokens - cacheCreationTokens)
  const tokenCost = (
    (promptTokens * model.input) +
    ((log.completion_tokens || 0) * model.output) +
    (cacheReadTokens * model.cacheRead) +
    (cacheCreationTokens * model.cacheWrite)
  ) / 1_000_000

  return (tokenCost > 0 ? tokenCost : billed) * upstreamFactor
}

function logUsername(log: AdminLog, usersById: Map<number, AdminUser>) {
  if (log.username) return log.username
  if (log.user_id) return usersById.get(log.user_id)?.username || `user-${log.user_id}`
  return 'Sin usuario'
}

export async function GET(request: Request) {
  try {
    const selfBody = await newApiFetch<NewApiEnvelope<AdminUser>>('/api/user/self')
    const self = requireSuccess(selfBody)
    if (Number(self.role || 0) < ADMIN_ROLE) {
      throw new BackendError('Esta sección requiere una cuenta administrativa.', 403)
    }

    const range = new URL(request.url).searchParams.get('range') || '30d'
    const rangeDays = range === '7d' ? 7 : range === '90d' ? 90 : range === 'all' ? 0 : 30
    const start = rangeDays ? Math.floor(Date.now() / 1000) - rangeDays * 24 * 60 * 60 : 0
    const rangeQuery = start ? `start_timestamp=${start}` : ''

    const [usersPage, usagePage, errorPage, creditPage, modelControls, providerProfiles, providerGroups] = await Promise.all([
      loadPages<AdminUser>('/api/user/'),
      loadPages<AdminLog>(`/api/log/?type=2${rangeQuery ? `&${rangeQuery}` : ''}`),
      loadPages<AdminLog>(`/api/log/?type=4${rangeQuery ? `&${rangeQuery}` : ''}`),
      loadPages<AdminLog>(`/api/log/?type=1${rangeQuery ? `&${rangeQuery}` : ''}`),
      getModelAvailability(),
      getProviderProfiles(),
      getProviderGroups(),
    ])

    const usersById = new Map((usersPage.items || []).filter((user) => user.id).map((user) => [user.id as number, user]))
    const upstreamFactor = Math.min(1, envNumber('UPSTREAM_COST_FACTOR', 0.1))
    const paymentFeeRate = Math.min(1, envNumber('PAYMENT_FEE_RATE', 0.035))
    const errorsByUser = new Map<string, number>()
    for (const log of errorPage.items) {
      const username = logUsername(log, usersById)
      errorsByUser.set(username, (errorsByUser.get(username) || 0) + 1)
    }

    const userStats = new Map<string, CustomerStat>()
    for (const user of usersPage.items) {
      const username = user.username || `user-${user.id || 'unknown'}`
      userStats.set(username, {
        username,
        displayName: user.display_name || username,
        group: user.group || 'default',
        status: user.status ?? 1,
        balanceUsd: (user.quota || 0) / QUOTA_PER_USD,
        requests: 0,
        tokens: 0,
        revenueUsd: 0,
        costUsd: 0,
        errors: errorsByUser.get(username) || 0,
      })
    }

    const modelStats = new Map<string, { model: string; requests: number; tokens: number; revenueUsd: number; costUsd: number }>()
    const keyStats = new Map<string, { key: string; username: string; requests: number; tokens: number; revenueUsd: number; costUsd: number }>()
    let totalTokens = 0
    let revenueUsd = 0
    let costUsd = 0

    for (const log of usagePage.items) {
      const username = logUsername(log, usersById)
      const user = userStats.get(username) || {
        username, displayName: username, group: 'default', status: 1, balanceUsd: 0,
        requests: 0, tokens: 0, revenueUsd: 0, costUsd: 0, errors: errorsByUser.get(username) || 0,
      }
      const tokens = (log.prompt_tokens || 0) + (log.completion_tokens || 0)
      const revenue = billedUsd(log)
      const cost = providerCostUsd(log, upstreamFactor)
      user.requests += 1
      user.tokens += tokens
      user.revenueUsd += revenue
      user.costUsd += cost
      userStats.set(username, user)
      totalTokens += tokens
      revenueUsd += revenue
      costUsd += cost

      const modelName = log.model_name || 'N/D'
      const model = modelStats.get(modelName) || { model: modelName, requests: 0, tokens: 0, revenueUsd: 0, costUsd: 0 }
      model.requests += 1; model.tokens += tokens; model.revenueUsd += revenue; model.costUsd += cost
      modelStats.set(modelName, model)

      const keyName = `${username}:${log.token_name || 'Sin nombre'}`
      const key = keyStats.get(keyName) || { key: log.token_name || 'Sin nombre', username, requests: 0, tokens: 0, revenueUsd: 0, costUsd: 0 }
      key.requests += 1; key.tokens += tokens; key.revenueUsd += revenue; key.costUsd += cost
      keyStats.set(keyName, key)
    }

    const paymentFeesUsd = revenueUsd * paymentFeeRate
    const netProfitUsd = revenueUsd - costUsd - paymentFeesUsd
    const customers = [...userStats.values()]
      .filter((user) => user.username !== self.username && Number(usersPage.items.find((item) => item.username === user.username)?.role || 1) < ADMIN_ROLE)
      .sort((a, b) => b.revenueUsd - a.revenueUsd)
    const suspicious = customers
      .filter((user) => user.errors >= 3 || user.requests >= 500)
      .map((user) => ({ ...user, reason: user.errors >= 3 ? `${user.errors} errores` : 'Volumen alto' }))

    return Response.json({
      success: true,
      data: {
        range,
        rangeDays,
        generatedAt: Date.now(),
        config: { upstreamFactor, paymentFeeRate, providerCostIsEstimate: true },
        totals: {
          customers: customers.length,
          activeCustomers: customers.filter((user) => user.status === 1).length,
          requests: usagePage.items.length,
          errors: errorPage.items.length,
          totalTokens,
          revenueUsd,
          costUsd,
          paymentFeesUsd,
          netProfitUsd,
          creditedUsd: creditPage.items.reduce((sum, log) => sum + Math.max(0, billedUsd(log)), 0),
        },
        customers,
        modelControls: modelControls.map((control) => ({
          ...control,
          label: MODEL_CATALOG.find((model) => model.id === control.modelId)?.label || control.modelId,
        })),
        providerProfiles,
        providerGroups,
        models: [...modelStats.values()].map((item) => ({ ...item, profitUsd: item.revenueUsd - item.costUsd })).sort((a, b) => b.revenueUsd - a.revenueUsd),
        keys: [...keyStats.values()].map((item) => ({ ...item, profitUsd: item.revenueUsd - item.costUsd })).sort((a, b) => b.revenueUsd - a.revenueUsd),
        suspicious,
        truncated: usersPage.truncated || usagePage.truncated || errorPage.truncated || creditPage.truncated,
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
