import type { Metadata } from 'next'
import { PublicNav } from '@/components/public-nav'

export const metadata: Metadata = {
  title: 'API Pricing',
  description: 'Compare Orbiqen GPT and Claude API groups, prepaid balance and usage-based billing.',
  alternates: { canonical: '/en/pricing', languages: { es: '/precios', en: '/en/pricing' } },
}

export default function EnglishPricingPage() {
  const structuredData = { '@context': 'https://schema.org', '@type': 'Product', name: 'Orbiqen AI API', description: 'OpenAI-compatible access to GPT and Claude models.', brand: { '@type': 'Brand', name: 'Orbiqen' }, offers: { '@type': 'Offer', priceCurrency: 'USD', price: '1', availability: 'https://schema.org/InStock', url: 'https://orbiqen.com/en/pricing' } }
  return <main className="public-page"><PublicNav locale="en" englishPath="/en/pricing" /><section className="public-hero compact"><p className="public-eyebrow">CLEAR PRICING</p><h1>Pay only for what you use.</h1><p>Orbiqen uses prepaid balance. Your usage is tracked by request, model and tokens.</p><div className="public-actions"><a className="public-primary" href="/login?mode=register">Create an account</a><a className="public-secondary" href="/en/docs">Read the docs</a></div></section><section className="public-content"><div className="public-grid"><article className="public-card public-card-accent"><span>GPT</span><h2>Budget GPT</h2><p>Group 0.1. From US$ 0.0556 input and US$ 0.334 output per million tokens.</p><a href="/en/docs">Learn how to connect →</a></article><article className="public-card public-card-blue"><span>GPT</span><h2>Stable GPT</h2><p>Group 0.25. From US$ 0.139 input and US$ 0.835 output per million tokens.</p><a href="/en/docs">Learn how to connect →</a></article><article className="public-card public-card-dark"><span>CLAUDE</span><h2>Anthropic models</h2><p>From US$ 0.150 input and US$ 0.750 output per million tokens.</p><a href="/en/docs">Learn how to connect →</a></article></div><div className="public-note"><strong>Ready to try it?</strong><span>Create an account and add balance from US$ 1 using the available payment methods.</span><a href="/login?mode=register">Start now →</a></div></section><footer className="public-footer"><span>Orbiqen</span><span>AI API gateway with prepaid billing.</span></footer><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></main>
}
