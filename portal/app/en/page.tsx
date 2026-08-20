import type { Metadata } from 'next'
import { ArrowRight, BadgeCheck, Coins, Code2, ShieldCheck, WalletCards } from 'lucide-react'
import { PublicLanguageSwitch } from '@/components/public-nav'

export const metadata: Metadata = {
  title: 'AI API Gateway for GPT and Claude',
  description: 'Connect GPT and Claude through one OpenAI-compatible API with prepaid balance, usage tracking and customer API keys.',
  alternates: { canonical: '/en', languages: { es: '/', en: '/en' } },
  openGraph: { title: 'Orbiqen | AI API Gateway for GPT and Claude', description: 'One API for GPT, Claude and your customers.' },
}

const example = 'curl https://orbiqen.com/v1/chat/completions -H "Authorization: Bearer YOUR_API_KEY" -d \'{"model":"gpt-5.5","messages":[{"role":"user","content":"Hello"}]}\''

export function EnglishHome() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="/"><span className="landing-brand-mark"><img src="/orbiqen-logo.png" alt="Orbiqen" /></span></a>
        <nav><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="/en/docs">Docs</a></nav>
        <div className="landing-nav-actions"><PublicLanguageSwitch locale="en" englishPath="/" spanishPath="/es" /><a className="landing-link" href="/login?lang=en">Sign in</a><a className="landing-button" href="/login?lang=en&mode=register">Create account</a></div>
      </header>
      <section className="landing-hero">
        <div className="landing-hero-copy"><p className="landing-eyebrow">AI API GATEWAY FOR BUILDERS</p><h1>One API for GPT, Claude and your customers.</h1><p className="landing-lead">Sell prepaid access, manage keys and track real usage with a simple OpenAI-compatible integration.</p><div className="landing-actions"><a className="landing-primary" href="/login?lang=en&mode=register">Get started free</a><a className="landing-secondary" href="#pricing">View pricing</a></div><div className="landing-badges"><span><BadgeCheck size={16} />OpenAI compatible</span><span><WalletCards size={16} />Balance from US$ 1</span><span><ShieldCheck size={16} />Isolated customer keys</span></div></div>
        <aside className="landing-hero-panel"><div className="landing-panel-header"><div><p>Base URL</p><strong>https://orbiqen.com/v1</strong></div><span>Ready to use</span></div><div className="landing-panel-grid"><div><p>GPT</p><strong>Budget and stable groups</strong></div><div><p>Claude</p><strong>Anthropic and Claude Code</strong></div><div><p>Usage</p><strong>Balance, tokens and costs</strong></div></div><div className="landing-code"><div><span>OpenAI compatible</span><strong>One integration</strong></div><pre><code>{example}</code></pre></div></aside>
      </section>
      <section className="landing-strip"><article><Code2 size={18} /><div><strong>One endpoint</strong><span>Use the tools and SDKs you already know.</span></div></article><article><Coins size={18} /><div><strong>Flexible top-ups</strong><span>Support Mercado Pago and crypto payments.</span></div></article><article><ShieldCheck size={18} /><div><strong>Usage visibility</strong><span>Track requests, tokens and spending per key.</span></div></article></section>
      <section className="landing-section" id="how"><div className="landing-section-head"><p className="landing-eyebrow">SIMPLE WORKFLOW</p><h2>From API key to production in three steps.</h2><p>Give every customer a clear path to connect, choose models and control their balance.</p></div><div className="landing-steps"><article><span>01</span><h3>Create an account</h3><p>Register, add balance and generate a key for GPT or Claude.</p></article><article><span>02</span><h3>Choose a group</h3><p>Select the model group and only enable what your customer needs.</p></article><article><span>03</span><h3>Measure and scale</h3><p>Review usage, costs and remaining balance from one dashboard.</p></article></div></section>
      <section className="landing-section" id="pricing"><div className="landing-section-head"><p className="landing-eyebrow">PRICING</p><h2>Clear pricing without the guesswork.</h2><p>Choose the group that fits your workflow and pay only for what you use.</p></div><div className="landing-pricing-grid"><article className="landing-pricing-card tone-green"><div className="landing-card-top"><div><p>GROUP 0.1</p><h3>Budget GPT</h3></div><span>Lower cost</span></div><strong>From US$ 0.0556 input / US$ 0.334 output</strong><div className="landing-pricing-copy">For testing, automations and everyday tasks.</div><a href="/en/pricing">View details <ArrowRight size={16} /></a></article><article className="landing-pricing-card tone-blue"><div className="landing-card-top"><div><p>GROUP 0.25</p><h3>Stable GPT</h3></div><span>More availability</span></div><strong>From US$ 0.139 input / US$ 0.835 output</strong><div className="landing-pricing-copy">A balanced option for reliable customer workloads.</div><a href="/en/pricing">View details <ArrowRight size={16} /></a></article><article className="landing-pricing-card tone-coral"><div className="landing-card-top"><div><p>ANTHROPIC</p><h3>Claude</h3></div><span>Recommended</span></div><strong>From US$ 0.150 input / US$ 0.750 output</strong><div className="landing-pricing-copy">Claude Code, Sonnet, Haiku and professional workflows.</div><a href="/en/pricing">View details <ArrowRight size={16} /></a></article></div></section>
      <section className="landing-section landing-split"><div className="landing-section-head"><p className="landing-eyebrow">DOCUMENTATION</p><h2>Connect with an OpenAI-compatible API.</h2><p>Keep your current SDK and point it to Orbiqen with your customer API key.</p><a className="landing-secondary" href="/en/docs">Read the docs <ArrowRight size={16} /></a></div><div className="landing-doc-card"><div><strong>Base URL</strong><code>https://orbiqen.com/v1</code></div><div><strong>Authentication</strong><code>Authorization: Bearer YOUR_API_KEY</code></div><div><strong>Models</strong><code>gpt-5.5, gpt-5.6, claude-opus-4-8, claude-haiku-4-5...</code></div></div></section>
      <footer className="landing-footer"><span>Orbiqen</span><span>AI gateway for access, usage and prepaid billing.</span><a href="/login?lang=en">Open dashboard</a></footer>
    </main>
  )
}

export default EnglishHome
