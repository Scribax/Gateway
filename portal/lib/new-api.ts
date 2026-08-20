import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'gateway_portal_session'
export const REFRESH_COOKIE = 'gateway_portal_refresh'

const INTERNAL_URL = (process.env.NEW_API_INTERNAL_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')

export type NewApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
  code?: string
}

export class BackendError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value || null
}

export async function newApiFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const authToken = token === undefined ? await getSessionToken() : token
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)

  const response = await fetch(`${INTERNAL_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new BackendError('El servicio de IA devolvió una respuesta inválida.', 502)
  }

  if (!response.ok) {
    const message = typeof body === 'object' && body && 'message' in body
      ? String((body as { message?: unknown }).message || 'No se pudo completar la operación.')
      : 'No se pudo completar la operación.'
    throw new BackendError(message, response.status)
  }

  return body as T
}

export function errorResponse(error: unknown): Response {
  const status = error instanceof BackendError ? error.status : 500
  const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
  return Response.json({ success: false, message }, { status })
}

export function requireSuccess<T>(body: NewApiEnvelope<T>): T {
  if (!body.success || body.data === undefined) {
    throw new BackendError(body.message || 'New API rechazó la operación.', 400)
  }
  return body.data
}
