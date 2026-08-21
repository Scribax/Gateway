import { BackendError, errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { getEnabledModelCatalog } from '@/lib/model-availability'
import { getSalesGroups } from '@/lib/sales-groups'

type KeyItem = {
  id: number
  name?: string
  status?: number
  expired_time?: number
  remain_quota?: number
  unlimited_quota?: boolean
  model_limits_enabled?: boolean
  model_limits?: string
  allow_ips?: string
  group?: string
  cross_group_retry?: boolean
}
type KeyPage = { items: KeyItem[]; total: number; page: number; page_size: number }

function parseId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new BackendError('Clave inválida.', 400)
  return id
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await context.params
    const id = parseId(rawId)
    const body = await newApiFetch<NewApiEnvelope<unknown>>(`/api/token/${id}/`, { method: 'DELETE' })
    if (!body.success) throw new BackendError(body.message || 'No se pudo eliminar la clave.', 400)
    return Response.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await context.params
    const id = parseId(rawId)
    const payload = await request.json().catch(() => ({})) as { group?: string }
    const group = payload.group?.trim() || ''
    if (!group) throw new BackendError('Seleccioná un grupo válido.', 400)

    const [keysBody, salesGroups, enabledCatalog] = await Promise.all([
      newApiFetch<NewApiEnvelope<KeyPage>>('/api/token/?p=1&size=100'),
      getSalesGroups({ publishedOnly: true }),
      getEnabledModelCatalog(),
    ])
    const key = (requireSuccess(keysBody).items || []).find((item) => item.id === id)
    if (!key) throw new BackendError('No se encontró la clave.', 404)
    const salesGroup = salesGroups.find((item) => item.code === group)
    if (!salesGroup) throw new BackendError('Ese grupo no está publicado.', 400)

    const allowedModels = enabledCatalog.filter((model) => {
      if (salesGroup.model_family === 'claude') return model.id.includes('claude')
      if (salesGroup.model_family === 'chatgpt') return !model.id.includes('claude')
      return true
    })
    if (allowedModels.length === 0) throw new BackendError('El grupo no tiene modelos publicados.', 400)

    const body = await newApiFetch<NewApiEnvelope<KeyItem>>('/api/token/', {
      method: 'PUT',
      body: JSON.stringify({
        id,
        name: key.name || 'api-key',
        status: key.status ?? 1,
        expired_time: key.expired_time ?? -1,
        remain_quota: key.remain_quota ?? 0,
        unlimited_quota: Boolean(key.unlimited_quota),
        model_limits_enabled: true,
        model_limits: allowedModels.map((model) => model.id).join(','),
        allow_ips: key.allow_ips || '',
        group,
        auto_groups: [],
        cross_group_retry: false,
      }),
    })
    const updated = requireSuccess(body)
    return Response.json({ success: true, data: updated })
  } catch (error) {
    return errorResponse(error)
  }
}
