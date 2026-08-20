import { cookies } from 'next/headers'
import { REFRESH_COOKIE, SESSION_COOKIE } from '@/lib/new-api'

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value
  if (refreshToken) {
    const internalUrl = (process.env.NEW_API_INTERNAL_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
    await fetch(`${internalUrl}/api/user/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `new_api_refresh=${refreshToken}` },
      cache: 'no-store',
    }).catch(() => undefined)
  }
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(REFRESH_COOKIE)
  return Response.json({ success: true })
}
