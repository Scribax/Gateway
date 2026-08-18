import { errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { QUOTA_PER_USD } from '@/lib/catalog'

type PageData<T> = { items: T[]; total: number; page: number; page_size: number }

type UsageLog = {
  id: number
  created_at: number
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  token_name: string
  use_time: number
}

async function loadAllLogs() {
  const pageSize = 100
  const maxPages = 10
  const logs: UsageLog[] = []

  for (let page = 1; page <= maxPages; page += 1) {
    const body = await newApiFetch<NewApiEnvelope<PageData<UsageLog>>>(`/api/log/self?p=${page}&size=${pageSize}`)
    const data = requireSuccess(body)
    logs.push(...(data.items || []))
    if (!data.items || data.items.length < pageSize) break
  }

  return logs.sort((a, b) => b.created_at - a.created_at)
}

export async function GET() {
  try {
    const [selfBody, logs] = await Promise.all([
      newApiFetch<NewApiEnvelope<Record<string, unknown>>>('/api/user/self'),
      loadAllLogs(),
    ])

    const user = requireSuccess(selfBody)
    return Response.json({
      success: true,
      data: {
        user,
        logs,
        quotaPerUsd: QUOTA_PER_USD,
        gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://127.0.0.1:3000/v1',
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
