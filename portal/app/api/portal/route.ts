import { errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { MODEL_CATALOG, QUOTA_PER_USD } from '@/lib/catalog'

type PageData<T> = { items: T[]; total: number; page: number; page_size: number }

export async function GET() {
  try {
    const [selfBody, keysBody, logsBody, modelsBody, groupsBody] = await Promise.all([
      newApiFetch<NewApiEnvelope<Record<string, unknown>>>('/api/user/self'),
      newApiFetch<NewApiEnvelope<PageData<Record<string, unknown>>>>('/api/token/?p=1&size=100'),
      newApiFetch<NewApiEnvelope<PageData<Record<string, unknown>>>>('/api/log/self?p=1&size=12'),
      newApiFetch<NewApiEnvelope<string[]>>('/api/user/models'),
      newApiFetch<NewApiEnvelope<Record<string, { desc: string; ratio: number | string }>>>('/api/user/self/groups'),
    ])

    const user = requireSuccess(selfBody)
    const keys = requireSuccess(keysBody)
    const logs = requireSuccess(logsBody)
    const enabledModels = requireSuccess(modelsBody)
    const groups = requireSuccess(groupsBody)
    const visibleModels = MODEL_CATALOG.filter((model) => enabledModels.includes(model.id))

    return Response.json({
      success: true,
      data: {
        user,
        keys: keys.items || [],
        logs: logs.items || [],
        logTotal: logs.total || 0,
        models: visibleModels,
        groups,
        quotaPerUsd: QUOTA_PER_USD,
        gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://127.0.0.1:3000/v1',
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
