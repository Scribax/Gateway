'use client'

import { useSearchParams } from 'next/navigation'
import { PortalApp } from '@/components/portal-app'

export default function LoginClient() {
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  return <PortalApp initialMode={initialMode} />
}
