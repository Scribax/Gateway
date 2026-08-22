import type { Metadata } from 'next'
import PublicHome from '@/components/public-home'

export const metadata: Metadata = {
  title: 'Orbiqen | Ahorrá hasta un 90% en Modelos de IA',
  description: 'Accedé a los modelos líderes de OpenAI, Anthropic y DeepSeek con descuentos masivos a través de una única API compatible.',
  alternates: { canonical: '/es', languages: { es: '/es', en: '/' } },
}

export default function SpanishPage() {
  return <PublicHome locale="es" />
}
