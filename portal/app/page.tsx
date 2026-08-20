import type { Metadata } from 'next'
import { EnglishHome } from './en/page'

export const metadata: Metadata = {
  title: 'AI API Gateway for GPT and Claude',
  description: 'Connect GPT and Claude through one OpenAI-compatible API with prepaid balance, usage tracking and customer API keys.',
  alternates: { canonical: '/', languages: { es: '/es', en: '/' } },
}

export default function Home() {
  return <EnglishHome />
}
