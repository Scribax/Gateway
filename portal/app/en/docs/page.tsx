import type { Metadata } from 'next'
import { PublicNav } from '@/components/public-nav'

export const metadata: Metadata = {
  title: 'API Documentation',
  description: 'Quickstart guide for connecting applications to the Orbiqen OpenAI-compatible API.',
  alternates: { canonical: '/en/docs', languages: { es: '/docs', en: '/en/docs' } },
}

const example = 'curl https://orbiqen.com/v1/chat/completions -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" -d \'{"model":"gpt-5.5","messages":[{"role":"user","content":"Hello"}]}\''

export default function EnglishDocsPage() {
  return <main className="public-page"><PublicNav locale="en" englishPath="/en/docs" /><section className="public-hero"><p className="public-eyebrow">ORBIQEN API</p><h1>Connect your applications to GPT and Claude.</h1><p>Use one OpenAI-compatible endpoint with customer API keys, prepaid balance and usage tracking.</p><div className="public-actions"><a className="public-primary" href="/login?mode=register">Create an account</a><a className="public-secondary" href="#quickstart">Quickstart</a></div></section><section className="public-content" id="quickstart"><div className="public-section-heading"><p className="public-eyebrow">QUICKSTART</p><h2>Start in a few minutes</h2><p>Create an API key, add balance and point your application to the Orbiqen Base URL.</p></div><div className="public-grid"><article className="public-card"><span>01</span><h3>Create a key</h3><p>Choose the GPT or Claude group and enable the models your application needs.</p></article><article className="public-card"><span>02</span><h3>Configure your client</h3><p>Use the Base URL and send your key as a Bearer token.</p></article><article className="public-card"><span>03</span><h3>Track usage</h3><p>Review requests, tokens, models and spending from your dashboard.</p></article></div><div className="public-code"><div><span>OpenAI-compatible API</span><strong>Base URL: https://orbiqen.com/v1</strong></div><pre><code>{example}</code></pre></div></section><section className="public-content public-faq"><div className="public-section-heading"><p className="public-eyebrow">FAQ</p><h2>Simple and transparent</h2></div><details><summary>Can I use GPT and Claude?</summary><p>Yes. Create a key for the GPT group or the Claude group, then enable the models you want.</p></details><details><summary>How does billing work?</summary><p>Your prepaid balance is reduced according to the model and tokens used.</p></details><details><summary>Is there a Windows installer?</summary><p>Yes. The Connect section includes the Orbiqen assistant for automatic Codex and Claude setup.</p></details></section><footer className="public-footer"><span>Orbiqen</span><span>AI API gateway for developers.</span></footer></main>
}
