import { BackendError, errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { getModelAvailability, setModelAvailability } from '@/lib/model-availability'

const ADMIN_ROLE = 10

async function requireAdmin() {
  const body = await newApiFetch<NewApiEnvelope<{ role?: number }>>('/api/user/self')
  const user = requireSuccess(body)
  if (Number(user.role || 0) < ADMIN_ROLE) throw new BackendError('Esta sección requiere una cuenta administrativa.', 403)
}

export async function GET() {
  try {
    await requireAdmin()
    return Response.json({ success: true, data: await getModelAvailability() })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin()
    const payload = await request.json().catch(() => ({})) as { models?: Array<{ modelId?: unknown; enabled?: unknown }> }
    const updates = Array.isArray(payload.models)
      ? payload.models
        .filter((item) => typeof item.modelId === 'string' && typeof item.enabled === 'boolean')
        .map((item) => ({ modelId: item.modelId as string, enabled: item.enabled as boolean }))
      : []
    if (updates.length === 0) throw new BackendError('No se recibieron cambios de modelos.', 400)
    return Response.json({ success: true, data: await setModelAvailability(updates) })
  } catch (error) {
    return errorResponse(error)
  }
}
