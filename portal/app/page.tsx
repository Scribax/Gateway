import type { Metadata } from 'next'
import PublicHome from '@/components/public-home'

export const metadata: Metadata = {
  title: 'Orbiqen | Save up to 90% on AI Models',
  description: 'Access leading discounted AI models from OpenAI, Anthropic, and DeepSeek through one unified API without changing your request format.',
  alternates: { canonical: '/', languages: { es: '/es', en: '/' } },
}

export default function RootPage() {
  return <PublicHome locale="en" />
}
