import { BackendError, errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { deleteSalesGroup, getSalesGroups, upsertSalesGroup } from '@/lib/sales-groups'

const ADMIN_ROLE = 10

async function requireAdmin() {
  const user = requireSuccess(await newApiFetch<NewApiEnvelope<{ role?: number }>>('/api/user/self'))
  if (Number(user.role || 0) < ADMIN_ROLE) throw new BackendError('Esta sección requiere una cuenta administrativa.', 403)
}

export async function GET() {
  try {
    await requireAdmin()
    return Response.json({ success: true, data: await getSalesGroups() })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>
    return Response.json({ success: true, data: await upsertSalesGroup({
      code: String(payload.code || ''),
      label_es: String(payload.labelEs || payload.label_es || ''),
      label_en: String(payload.labelEn || payload.label_en || ''),
      description_es: String(payload.descriptionEs || payload.description_es || ''),
      description_en: String(payload.descriptionEn || payload.description_en || ''),
      note_es: String(payload.noteEs || payload.note_es || ''),
      note_en: String(payload.noteEn || payload.note_en || ''),
      model_family: String(payload.modelFamily || payload.model_family || 'all') as 'chatgpt' | 'claude' | 'all',
      price_multiplier: Number(payload.priceMultiplier || payload.price_multiplier || 1),
      published: payload.published !== false,
      sort_order: Number(payload.sortOrder || payload.sort_order || 100),
    }) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    const url = new URL(request.url)
    const code = url.searchParams.get('code') || ''
    if (!code) throw new BackendError('Grupo inválido.', 400)
    await deleteSalesGroup(code)
    return Response.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
