import { BackendError, errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await context.params
    const id = Number(rawId)
    if (!Number.isInteger(id) || id <= 0) throw new BackendError('Clave inválida.', 400)
    const body = await newApiFetch<NewApiEnvelope<{ key: string }>>(`/api/token/${id}/key`, { method: 'POST' })
    const rawKey = requireSuccess(body).key
    return Response.json({ success: true, data: { key: rawKey.startsWith('sk-') ? rawKey : `sk-${rawKey}` } })
  } catch (error) {
    return errorResponse(error)
  }
}
