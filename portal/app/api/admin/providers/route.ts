import { BackendError, errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import {
  activateProviderProfile,
  createProviderProfile,
  getProviderProfiles,
  restoreProviderBaselines,
  validateProviderEndpoint,
  updateProviderProfile,
} from '@/lib/provider-profiles'

const ADMIN_ROLE = 10

async function requireAdmin() {
  const user = requireSuccess(await newApiFetch<NewApiEnvelope<{ role?: number }>>('/api/user/self'))
  if (Number(user.role || 0) < ADMIN_ROLE) throw new BackendError('Esta sección requiere una cuenta administrativa.', 403)
}

export async function GET() {
  try {
    await requireAdmin()
    return Response.json({ success: true, data: await getProviderProfiles() })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>
    const profile = await createProviderProfile({
      name: String(payload.name || ''),
      description: String(payload.description || ''),
      baseUrl: String(payload.baseUrl || ''),
      apiKey: String(payload.apiKey || ''),
      targetGroups: Array.isArray(payload.targetGroups) ? payload.targetGroups.map(String) : [],
      priceMultiplier: Number(payload.priceMultiplier || 1),
    })
    return Response.json({ success: true, data: profile }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>
    const id = payload.id === undefined ? null : Number(payload.id)
    let baseUrl = String(payload.baseUrl || '')
    let apiKey = String(payload.apiKey || '')
    if (id !== null && Number.isInteger(id) && id > 0 && (!baseUrl.trim() || !apiKey.trim())) {
      const profiles = await getProviderProfiles()
      const profile = profiles.find((item) => item.id === id)
      if (!profile) throw new BackendError('No se encontró el perfil.', 404)
      baseUrl = baseUrl.trim() || profile.base_url
      if (!apiKey.trim()) throw new BackendError('Para validar un perfil existente, ingresá nuevamente su API key madre.', 400)
    }
    return Response.json({ success: true, data: await validateProviderEndpoint(baseUrl, apiKey) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin()
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>
    const action = String(payload.action || '')
    if (action === 'restore') return Response.json({ success: true, data: await restoreProviderBaselines() })
    const id = Number(payload.id)
    if (!Number.isInteger(id) || id <= 0) throw new BackendError('Perfil inválido.', 400)
    if (action === 'activate') return Response.json({ success: true, data: await activateProviderProfile(id) })
    return Response.json({ success: true, data: await updateProviderProfile(id, {
      name: payload.name === undefined ? undefined : String(payload.name),
      description: payload.description === undefined ? undefined : String(payload.description),
      baseUrl: payload.baseUrl === undefined ? undefined : String(payload.baseUrl),
      apiKey: payload.apiKey === undefined ? undefined : String(payload.apiKey),
      targetGroups: payload.targetGroups === undefined ? undefined : (Array.isArray(payload.targetGroups) ? payload.targetGroups.map(String) : []),
      priceMultiplier: payload.priceMultiplier === undefined ? undefined : Number(payload.priceMultiplier),
      enabled: payload.enabled === undefined ? undefined : Boolean(payload.enabled),
    }) })
  } catch (error) {
    return errorResponse(error)
  }
}
