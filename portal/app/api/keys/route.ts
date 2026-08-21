import { BackendError, errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { QUOTA_PER_USD } from '@/lib/catalog'
import { getEnabledModelCatalog } from '@/lib/model-availability'
import { getSalesGroups } from '@/lib/sales-groups'

type KeyItem = { id: number; name: string; [key: string]: unknown }
type KeyPage = { items: KeyItem[]; total: number; page: number; page_size: number }

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {
      name?: string
      quotaUsd?: number
      group?: string
      models?: string[]
    }
    const name = payload.name?.trim() || ''
    if (!name || name.length > 50) throw new BackendError('El nombre de la clave es obligatorio.', 400)
    const quotaUsd = Number(payload.quotaUsd)
    if (!Number.isFinite(quotaUsd) || quotaUsd <= 0 || quotaUsd > 100000) {
      throw new BackendError('Ingresá un límite de saldo válido.', 400)
    }

    const [groupsBody, beforeBody, salesGroups] = await Promise.all([
      newApiFetch<NewApiEnvelope<Record<string, unknown>>>('/api/user/self/groups'),
      newApiFetch<NewApiEnvelope<KeyPage>>('/api/token/?p=1&size=100'),
      getSalesGroups({ publishedOnly: true }),
    ])
    const allowedModels = new Set((await getEnabledModelCatalog()).map((model) => model.id))
    const allowedGroups = requireSuccess(groupsBody)
    const selectedModels = (payload.models || []).filter((model) => allowedModels.has(model))
    if (selectedModels.length === 0) throw new BackendError('Seleccioná al menos un modelo.', 400)
    const group = payload.group?.trim() || 'clientes'
    const salesGroup = salesGroups.find((item) => item.code === group)
    if (!(group in allowedGroups) && !salesGroup) throw new BackendError('Seleccioná un grupo válido.', 400)
    const selectedClaudeModels = selectedModels.filter((model) => model.includes('claude'))
    if (salesGroup?.model_family === 'claude' && selectedClaudeModels.length !== selectedModels.length) {
      throw new BackendError('El grupo Claude solo puede usar modelos Claude.', 400)
    }
    if (salesGroup?.model_family === 'chatgpt' && selectedClaudeModels.length > 0) {
      throw new BackendError('El grupo ChatGPT solo puede usar modelos ChatGPT.', 400)
    }
    const beforeIds = new Set((requireSuccess(beforeBody).items || []).map((item) => item.id))

    const createBody = await newApiFetch<NewApiEnvelope<unknown>>('/api/token/', {
      method: 'POST',
      body: JSON.stringify({
        name,
        remain_quota: Math.round(quotaUsd * QUOTA_PER_USD),
        expired_time: -1,
        unlimited_quota: false,
        model_limits_enabled: true,
        model_limits: selectedModels.join(','),
        allow_ips: '',
        group,
        auto_groups: [],
        cross_group_retry: false,
      }),
    })
    if (!createBody.success) throw new BackendError(createBody.message || 'No se pudo crear la clave.', 400)

    const afterBody = await newApiFetch<NewApiEnvelope<KeyPage>>('/api/token/?p=1&size=100')
    const created = (requireSuccess(afterBody).items || [])
      .filter((item) => !beforeIds.has(item.id))
      .sort((a, b) => b.id - a.id)[0]
    if (!created) throw new BackendError('La clave fue creada, pero no pudo recuperarse.', 502)
    const keyBody = await newApiFetch<NewApiEnvelope<{ key: string }>>(`/api/token/${created.id}/key`, { method: 'POST' })
    const rawKey = requireSuccess(keyBody).key
    return Response.json({ success: true, data: { ...created, key: rawKey.startsWith('sk-') ? rawKey : `sk-${rawKey}` } })
  } catch (error) {
    return errorResponse(error)
  }
}
