import { cookies } from 'next/headers'
import { BackendError, errorResponse, newApiFetch, SESSION_COOKIE, type NewApiEnvelope } from '@/lib/new-api'

type LoginData = {
  access_token: string
  access_expires_at?: number
  user: Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { username?: string; password?: string }
    if (!payload.username?.trim() || !payload.password) {
      throw new BackendError('Ingresá tu usuario y contraseña.', 400)
    }
    const body = await newApiFetch<NewApiEnvelope<LoginData>>('/api/user/login', {
      method: 'POST',
      body: JSON.stringify({ username: payload.username.trim(), password: payload.password }),
    }, null)
    if (!body.success || !body.data?.access_token) {
      throw new BackendError(body.message || 'Usuario o contraseña incorrectos.', 401)
    }
    const maxAge = body.data.access_expires_at
      ? Math.max(60, body.data.access_expires_at - Math.floor(Date.now() / 1000))
      : 3600
    ;(await cookies()).set(SESSION_COOKIE, body.data.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.PORTAL_COOKIE_SECURE === 'true',
      path: '/',
      maxAge,
    })
    return Response.json({ success: true, user: body.data.user })
  } catch (error) {
    return errorResponse(error)
  }
}
