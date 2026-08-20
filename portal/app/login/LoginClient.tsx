'use client'

import { useSearchParams } from 'next/navigation'
import { PortalApp } from '@/components/portal-app'

export default function LoginClient() {
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const referrerPath = typeof document === 'undefined' ? '' : (() => { try { return new URL(document.referrer).pathname } catch { return '' } })()
  const locale = searchParams.get('lang') === 'en' || (!searchParams.get('lang') && referrerPath.startsWith('/en')) ? 'en' : 'es'
  return <PortalApp initialMode={initialMode} locale={locale} />
}
