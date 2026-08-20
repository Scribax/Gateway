import { redeemCodeForUser } from '@/lib/redeem-codes'
import { errorResponse, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'

type PortalUser = { id?: number }

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({})) as { code?: unknown }
    const user = requireSuccess(await newApiFetch<NewApiEnvelope<PortalUser>>('/api/user/self'))
    const userId = Number(user.id)
    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ success: false, message: 'No se pudo identificar tu cuenta.' }, { status: 401 })
    }
    const result = await redeemCodeForUser(userId, payload.code)
    return Response.json({ success: true, data: result })
  } catch (error) {
    return errorResponse(error)
  }
}
