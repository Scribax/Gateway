import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/new-api'

export async function POST() {
  ;(await cookies()).delete(SESSION_COOKIE)
  return Response.json({ success: true })
}
