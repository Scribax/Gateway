import { cookies } from 'next/headers'
import { BackendError, errorResponse, REFRESH_COOKIE, SESSION_COOKIE, type NewApiEnvelope } from '@/lib/new-api'

type RefreshData = {
  access_token: string
  access_expires_at?: number
  user?: Record<string, unknown>
}

const INTERNAL_URL = (process.env.NEW_API_INTERNAL_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30

function extractRefreshToken(setCookie: string | null) {
  return setCookie?.match(/(?:^|;\s*)new_api_refresh=([^;]+)/)?.[1] || null
}

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value
    if (!refreshToken) throw new BackendError('La sesión expiró. Volvé a ingresar.', 401)
    const response = await fetch(`${INTERNAL_URL}/api/user/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json', Cookie: `new_api_refresh=${refreshToken}` },
      cache: 'no-store',
    })
    const body = await response.json() as NewApiEnvelope<RefreshData>
    if (!response.ok || !body.success || !body.data?.access_token) {
      throw new BackendError(body.message || 'La sesión expiró. Volvé a ingresar.', response.status || 401)
    }
    const maxAge = body.data.access_expires_at
      ? Math.max(60, body.data.access_expires_at - Math.floor(Date.now() / 1000))
      : 900
    cookieStore.set(SESSION_COOKIE, body.data.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.PORTAL_COOKIE_SECURE === 'true',
      path: '/',
      maxAge,
    })
    const nextRefresh = extractRefreshToken(response.headers.get('set-cookie'))
    if (nextRefresh) {
      cookieStore.set(REFRESH_COOKIE, nextRefresh, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production' && process.env.PORTAL_COOKIE_SECURE === 'true',
        path: '/',
        maxAge: REFRESH_MAX_AGE,
      })
    }
    return Response.json({ success: true, user: body.data.user })
  } catch (error) {
    return errorResponse(error)
  }
}
