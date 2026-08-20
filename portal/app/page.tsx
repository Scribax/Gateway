import type { Metadata } from 'next'
import PublicHome from '@/components/public-home'

export const metadata: Metadata = {
  title: 'Gateway de IA para vender GPT y Claude',
  description: 'Una API compatible con OpenAI para vender acceso a GPT y Claude con saldo prepago, control de uso y panel por cliente.',
  alternates: { canonical: '/' },
}

export default function Home() {
  return <PublicHome />
}
