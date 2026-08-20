import { cookies } from 'next/headers'
import { BackendError, errorResponse, REFRESH_COOKIE, SESSION_COOKIE, type NewApiEnvelope } from '@/lib/new-api'

type LoginData = {
  access_token: string
  access_expires_at?: number
  user: Record<string, unknown>
}

const INTERNAL_URL = (process.env.NEW_API_INTERNAL_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30

function extractRefreshToken(setCookie: string | null) {
  return setCookie?.match(/(?:^|;\s*)new_api_refresh=([^;]+)/)?.[1] || null
}

async function requestAuth(path: string, init: RequestInit = {}, refreshToken?: string | null) {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (refreshToken) headers.set('Cookie', `new_api_refresh=${refreshToken}`)
  const response = await fetch(`${INTERNAL_URL}${path}`, { ...init, headers, cache: 'no-store' })
  let body: NewApiEnvelope<LoginData>
  try {
    body = await response.json() as NewApiEnvelope<LoginData>
  } catch {
    throw new BackendError('El servicio de autenticación devolvió una respuesta inválida.', 502)
  }
  return { response, body, refreshToken: extractRefreshToken(response.headers.get('set-cookie')) }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { username?: string; password?: string }
    if (!payload.username?.trim() || !payload.password) {
      throw new BackendError('Ingresá tu usuario y contraseña.', 400)
    }
    const cookieStore = await cookies()
    const oldRefresh = cookieStore.get(REFRESH_COOKIE)?.value || null
    let auth = oldRefresh
      ? await requestAuth('/api/user/auth/refresh', { method: 'POST' }, oldRefresh)
      : null
    const refreshedUser = auth?.body.data?.user
    const refreshedUsername = refreshedUser && typeof refreshedUser.username === 'string' ? refreshedUser.username : ''
    if (!auth?.body.success || !auth.body.data?.access_token || refreshedUsername.toLowerCase() !== payload.username.trim().toLowerCase()) {
      auth = await requestAuth('/api/user/login', {
        method: 'POST',
        body: JSON.stringify({ username: payload.username.trim(), password: payload.password }),
      })
    }
    const body = auth.body
    if (!auth.response.ok || !body.success || !body.data?.access_token) {
      throw new BackendError(body.message || 'Usuario o contraseña incorrectos.', auth.response.status === 409 ? 409 : 401)
    }
    const maxAge = body.data.access_expires_at
      ? Math.max(60, body.data.access_expires_at - Math.floor(Date.now() / 1000))
      : 3600
    cookieStore.set(SESSION_COOKIE, body.data.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.PORTAL_COOKIE_SECURE === 'true',
      path: '/',
      maxAge,
    })
    if (auth.refreshToken) {
      cookieStore.set(REFRESH_COOKIE, auth.refreshToken, {
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
