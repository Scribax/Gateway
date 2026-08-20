import { createRedeemCodes, listRedeemCodes } from '@/lib/redeem-codes'
import { BackendError, errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'

type AdminUser = { id?: number; role?: number }

const ADMIN_ROLE = 10

async function requireAdmin() {
  const self = requireSuccess(await newApiFetch<NewApiEnvelope<AdminUser>>('/api/user/self'))
  if (Number(self.role || 0) < ADMIN_ROLE) throw new BackendError('Esta sección requiere una cuenta administrativa.', 403)
  const id = Number(self.id)
  if (!Number.isInteger(id) || id <= 0) throw new BackendError('No se pudo identificar la cuenta admin.', 401)
  return { ...self, id }
}

export async function GET() {
  try {
    await requireAdmin()
    const codes = await listRedeemCodes(80)
    return Response.json({ success: true, data: { codes } })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const payload = await request.json().catch(() => ({})) as { amountUsd?: unknown; count?: unknown; note?: unknown }
    const codes = await createRedeemCodes(admin.id, payload)
    return Response.json({ success: true, data: { codes } })
  } catch (error) {
    return errorResponse(error)
  }
}
