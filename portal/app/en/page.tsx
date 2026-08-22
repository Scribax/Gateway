'use client'

import { useState } from 'react'
import type { Metadata } from 'next'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Code2,
  Coins,
  Copy,
  Cpu,
  Download,
  Flame,
  Globe,
  Layers,
  Play,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  WalletCards,
  Zap,
} from 'lucide-react'
import { PublicLanguageSwitch } from '@/components/public-nav'

type ToolTab = 'cursor' | 'claude' | 'python' | 'curl' | 'node'

const CODE_EXAMPLES: Record<ToolTab, { title: string; filename: string; code: string }> = {
  cursor: {
    title: 'Cursor / Windsurf',
    filename: 'Cursor Settings > Models > OpenAI API Key',
    code: `// In Cursor > Settings > Models > OpenAI:
Base URL: https://orbiqen.com/v1
API Key:  sk-orbiqen-your-api-key

// Recommended models:
- gpt-5.5
- gpt-5.4-mini
- claude-sonnet-5`,
  },
  claude: {
    title: 'Claude Code CLI',
    filename: '~/.bashrc or PowerShell',
    code: `# Configure Orbiqen endpoint for Claude Code:
export ANTHROPIC_BASE_URL="https://orbiqen.com"
export ANTHROPIC_API_KEY="sk-orbiqen-your-api-key"

# Launch Claude Code directly:
claude`,
  },
  python: {
    title: 'Python SDK',
    filename: 'app.py',
    code: `from openai import OpenAI

client = OpenAI(
    base_url="https://orbiqen.com/v1",
    api_key="sk-orbiqen-your-api-key"
)

response = client.chat.completions.create(
    model="gpt-5.5",
    messages=[{"role": "user", "content": "Optimize this function in Python"}]
)

print(response.choices[0].message.content)`,
  },
  node: {
    title: 'Node.js / TypeScript',
    filename: 'index.ts',
    code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://orbiqen.com/v1",
  apiKey: "sk-orbiqen-your-api-key",
});

const res = await client.chat.completions.create({
  model: "claude-sonnet-5",
  messages: [{ role: "user", content: "Generate a modern React hook" }],
});

console.log(res.choices[0].message.content);`,
  },
  curl: {
    title: 'cURL',
    filename: 'terminal',
    code: `curl https://orbiqen.com/v1/chat/completions \\
  -H "Authorization: Bearer sk-orbiqen-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.5",
    "messages": [{"role": "user", "content": "Hello Orbiqen"}]
  }'`,
  },
}

const FAQS = [
  {
    q: 'How do I configure Orbiqen in Cursor, Windsurf, or VS Code?',
    a: 'It takes 10 seconds: In your editor settings (Cursor, Windsurf, or VS Code Continue extension), enable OpenAI compatible mode, set the Base URL to "https://orbiqen.com/v1", and paste your Orbiqen API Key. You are ready to build!',
  },
  {
    q: 'What payment methods can I use to top up my balance?',
    a: 'We accept local payments in Latin America (Mercado Pago, instant bank transfers) and global Cryptocurrencies (USDT on Tron/Binance Smart Chain, BTC, etc.) with instant automatic top-ups starting from just $1 USD.',
  },
  {
    q: 'Does prepaid balance expire?',
    a: 'No. Your balance never expires. You can use it today, next month, or whenever you need it. There are zero maintenance fees or forced recurring commitments.',
  },
  {
    q: 'Can I use Claude 3.7 and GPT models with the same account?',
    a: 'Yes. You can generate isolated API keys for each use case: one key assigned to the Claude group (ideal for Claude Code or Sonnet) and another assigned to ChatGPT models (for budget automation or quick tasks).',
  },
  {
    q: 'How does this compare to official $20/month subscriptions?',
    a: 'Official subscriptions charge a flat $20 USD/month per tool regardless of usage. With Orbiqen, you only pay for the exact tokens you consume, with minimum top-ups from $1 USD and no unexpected card fee surprises.',
  },
]

export function EnglishHome() {
  const [activeTab, setActiveTab] = useState<ToolTab>('cursor')
  const [copied, setCopied] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [simCompleted, setSimCompleted] = useState(false)
  const [monthlyTokensM, setMonthlyTokensM] = useState<number>(3)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(CODE_EXAMPLES[activeTab].code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSimulate = () => {
    if (simulating) return
    setSimulating(true)
    setSimCompleted(false)
    setTimeout(() => {
      setSimulating(false)
      setSimCompleted(true)
    }, 420)
  }

  const tokenCostOrbiqen = (monthlyTokensM * 0.45).toFixed(2)

  return (
    <main className="landing-page">
      {/* Navigation */}
      <header className="landing-nav">
        <a className="landing-brand" href="/">
          <span className="landing-brand-mark">
            <img src="/orbiqen-logo.png" alt="Orbiqen" />
          </span>
        </a>
        <nav>
          <a href="#demo">Live Demo</a>
          <a href="#compatibility">Tools</a>
          <a href="#calculator">Calculator</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <a href="/en/docs">Docs</a>
        </nav>
        <div className="landing-nav-actions">
          <PublicLanguageSwitch locale="en" englishPath="/" spanishPath="/es" />
          <a className="landing-link" href="/login?lang=en">Sign in</a>
          <a className="landing-button" href="/login?lang=en&mode=register">Create account</a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow-badge">
            <span className="pulse-dot" />
            <span>Latency &lt; 350ms • 99.9% Uptime • Compatible with Cursor &amp; Claude</span>
          </div>

          <h1>
            Your favorite AI models, <span className="gradient-title">without card hassle &amp; with prepaid balance.</span>
          </h1>

          <p className="landing-lead">
            Connect <strong>Claude 3.7 Sonnet, GPT-5.5, and GPT-4o</strong> to your developer workflow in 60 seconds. Pay-as-you-go starting from US$ 1, without mandatory recurring commitments.
          </p>

          <div className="landing-actions">
            <a className="landing-primary" href="/login?lang=en&mode=register">
              <span>Get started with free trial</span>
              <ArrowRight size={17} />
            </a>
            <a className="landing-secondary" href="#demo">
              <Play size={15} />
              <span>View live demo</span>
            </a>
          </div>

          <div className="landing-badges">
            <span><BadgeCheck size={16} /> OpenAI SDK Compatible</span>
            <span><WalletCards size={16} /> Top-ups from US$ 1</span>
            <span><Zap size={16} /> Instant Activation</span>
            <span><ShieldCheck size={16} /> Balance never expires</span>
          </div>
        </div>

        {/* Hero Interactive Terminal */}
        <aside className="landing-hero-terminal" id="demo">
          <div className="terminal-header">
            <div className="window-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="terminal-tabs">
              {(['cursor', 'claude', 'python', 'curl', 'node'] as ToolTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`terminal-tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'cursor' ? 'Cursor' : tab === 'claude' ? 'Claude' : tab === 'python' ? 'Python' : tab === 'node' ? 'Node' : 'cURL'}
                </button>
              ))}
            </div>
          </div>

          <div className="terminal-body">
            <div className="terminal-meta-row">
              <span>{CODE_EXAMPLES[activeTab].filename}</span>
              <strong>OpenAI Compatible</strong>
            </div>

            <div className="terminal-code-box">
              <pre><code>{CODE_EXAMPLES[activeTab].code}</code></pre>
              <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Live Interactive Simulation */}
            <div className="terminal-live-demo">
              <div className="demo-head">
                <span className="demo-title">
                  <Radio size={13} />
                  Live Relay Simulator
                </span>
                <button className="demo-run-btn" onClick={handleSimulate} disabled={simulating}>
                  <Play size={12} />
                  <span>{simulating ? 'Sending...' : 'Test Response'}</span>
                </button>
              </div>

              <div className="demo-output">
                {simulating ? (
                  <span style={{ color: '#38bdf8' }}>⚡ Connecting to Orbiqen gateway (streaming tokens)...</span>
                ) : simCompleted ? (
                  <>
                    <span style={{ color: '#6ee7b7' }}>✓ [HTTP 200 OK] {`{"model": "gpt-5.5", "status": "operational"}`}</span>
                    <span style={{ color: '#cbd5e1', marginTop: '3px' }}>&quot;Orbiqen relay active! Your editor is ready to code at lightning speed.&quot;</span>
                    <div className="demo-metrics">
                      <span>Latency: <strong>318 ms</strong></span>
                      <span>Tokens: <strong>38</strong></span>
                      <span>Cost: <strong>$0.00014 USD</strong></span>
                    </div>
                  </>
                ) : (
                  <span style={{ color: '#64748b' }}>Click &quot;Test Response&quot; to benchmark live gateway speed.</span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* Feature Strip */}
      <section className="landing-strip">
        <article className="landing-strip-card">
          <div className="strip-icon emerald">
            <Zap size={22} />
          </div>
          <div>
            <strong>Instant Top-ups</strong>
            <span>Add funds seamlessly with Mercado Pago or Crypto (USDT, BTC) from US$ 1.</span>
          </div>
        </article>

        <article className="landing-strip-card">
          <div className="strip-icon cyan">
            <Code2 size={22} />
          </div>
          <div>
            <strong>Universal Compatibility</strong>
            <span>Drop-in replacement for any SDK, CLI, or agent framework built for OpenAI or Claude.</span>
          </div>
        </article>

        <article className="landing-strip-card">
          <div className="strip-icon orange">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>Isolated Keys &amp; No Expiry</strong>
            <span>Create project keys with custom quotas. Your prepaid balance never expires.</span>
          </div>
        </article>
      </section>

      {/* Tools Compatibility Showcase */}
      <section className="landing-section" id="compatibility">
        <div className="landing-section-head">
          <div className="landing-eyebrow-badge">
            <Sparkles size={13} />
            <span>ECOSYSTEM &amp; COMPATIBILITY</span>
          </div>
          <h2>Connect your favorite developer tools.</h2>
          <p>
            Zero friction. Point your Base URL to Orbiqen and start coding with GPT and Claude in seconds.
          </p>
        </div>

        <div className="tools-showcase-grid">
          <div className="tool-badge-card">
            <div className="tool-badge-head">
              <div className="tool-badge-icon">
                <Code2 size={20} />
              </div>
              <span className="tool-badge-chip">1-Click</span>
            </div>
            <h4>Cursor &amp; Windsurf</h4>
            <p>Use code completion and chat with Claude 3.7 &amp; GPT-5 without flat subscriptions.</p>
          </div>

          <div className="tool-badge-card">
            <div className="tool-badge-head">
              <div className="tool-badge-icon">
                <Terminal size={20} />
              </div>
              <span className="tool-badge-chip">Native</span>
            </div>
            <h4>Claude Code CLI</h4>
            <p>Set your ANTHROPIC_BASE_URL and run terminal coding assistants with top models.</p>
          </div>

          <div className="tool-badge-card">
            <div className="tool-badge-head">
              <div className="tool-badge-icon">
                <Cpu size={20} />
              </div>
              <span className="tool-badge-chip">Open Source</span>
            </div>
            <h4>VS Code / Continue</h4>
            <p>Integrate Continue or Cline with Orbiqen keys for seamless local IDE pair programming.</p>
          </div>

          <div className="tool-badge-card">
            <div className="tool-badge-head">
              <div className="tool-badge-icon">
                <Globe size={20} />
              </div>
              <span className="tool-badge-chip">SDKs</span>
            </div>
            <h4>Python, Node &amp; LangChain</h4>
            <p>Direct compatibility with OpenAI SDK, LlamaIndex, Flowise, LibreChat, and agent frameworks.</p>
          </div>
        </div>
      </section>

      {/* Savings Calculator */}
      <section className="landing-section" id="calculator">
        <div className="landing-section-head">
          <div className="landing-eyebrow-badge">
            <Coins size={13} />
            <span>COST CALCULATOR</span>
          </div>
          <h2>Pay only for what you build. No flat monthly traps.</h2>
          <p>
            Estimate your monthly token usage and see how much you save with pure pay-as-you-go pricing.
          </p>
        </div>

        <div className="calculator-card">
          <div className="calc-slider-box">
            <div className="calc-slider-head">
              <span>Your estimated monthly usage:</span>
              <strong>{monthlyTokensM} Million Tokens</strong>
            </div>

            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={monthlyTokensM}
              onChange={(e) => setMonthlyTokensM(Number(e.target.value))}
              className="calc-slider"
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px' }}>
              <span>1M (Light coding / Testing)</span>
              <span>10M (Active developer)</span>
              <span>20M+ (Team / Production)</span>
            </div>
          </div>

          <div className="calc-comparison-box">
            <div className="compare-row">
              <span>Official Subscription ($20 USD/mo flat):</span>
              <strong style={{ color: '#ef4444' }}>$20.00 USD / month</strong>
            </div>

            <div className="compare-row highlight">
              <span>Orbiqen Pay-as-you-go:</span>
              <strong>US$ {tokenCostOrbiqen}</strong>
            </div>

            <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 700, textAlign: 'center', marginTop: '4px' }}>
              🎉 Over 70% monthly savings with micro-metered balance
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="landing-section" id="pricing">
        <div className="landing-section-head">
          <div className="landing-eyebrow-badge">
            <Layers size={13} />
            <span>TRANSPARENT PRICING</span>
          </div>
          <h2>Clear rates per million tokens.</h2>
          <p>Choose the model group that matches your workload and add balance when you need it.</p>
        </div>

        <div className="landing-pricing-grid">
          <article className="landing-pricing-card tone-green">
            <div className="landing-card-top">
              <div>
                <p>GROUP 0.1</p>
                <h3>Budget GPT</h3>
              </div>
              <span>Lowest cost</span>
            </div>
            <strong>From US$ 0.0556 input / US$ 0.334 output</strong>
            <div className="landing-pricing-copy">
              For everyday code edits, background automations, test suites, and high-volume tasks.
            </div>
            <a href="/en/pricing">
              <span>View full catalog</span>
              <ArrowRight size={15} />
            </a>
          </article>

          <article className="landing-pricing-card tone-blue">
            <div className="landing-card-top">
              <div>
                <p>GROUP 0.25</p>
                <h3>Stable GPT</h3>
              </div>
              <span>High availability</span>
            </div>
            <strong>From US$ 0.139 input / US$ 0.835 output</strong>
            <div className="landing-pricing-copy">
              Optimized for production applications requiring consistent response rates and solid throughput.
            </div>
            <a href="/en/pricing">
              <span>View full catalog</span>
              <ArrowRight size={15} />
            </a>
          </article>

          <article className="landing-pricing-card tone-coral">
            <div className="landing-card-top">
              <div>
                <p>ANTHROPIC</p>
                <h3>Claude &amp; Code</h3>
              </div>
              <span>Recommended</span>
            </div>
            <strong>From US$ 0.30 input / US$ 1.50 output</strong>
            <div className="landing-pricing-copy">
              Claude 3.7 Sonnet, Opus, and Haiku. Ideal for Claude Code CLI, Cursor, and deep code refactoring.
            </div>
            <a href="/en/pricing">
              <span>View full catalog</span>
              <ArrowRight size={15} />
            </a>
          </article>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="landing-section" id="faq">
        <div className="landing-section-head">
          <div className="landing-eyebrow-badge">
            <ShieldCheck size={13} />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2>Everything you need to know before getting started.</h2>
          <p>Quick answers on setup, top-ups, and gateway reliability.</p>
        </div>

        <div className="faq-grid">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="faq-item">
              <div
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={18}
                  style={{
                    transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s ease',
                    color: openFaq === idx ? '#10b981' : '#94a3b8',
                  }}
                />
              </div>
              {openFaq === idx && (
                <div className="faq-answer">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Hero */}
      <section className="landing-section" style={{ paddingBottom: '60px' }}>
        <div
          style={{
            textAlign: 'center',
            padding: 'clamp(36px, 6vw, 64px) 24px',
            borderRadius: '20px',
            background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.18), rgba(11, 17, 26, 0.95))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="landing-eyebrow-badge" style={{ margin: '0 auto 16px' }}>
            <Flame size={13} />
            <span>READY IN UNDER 60 SECONDS</span>
          </div>

          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 16px', color: '#fff', fontWeight: 800 }}>
            Join developers building with Orbiqen today.
          </h2>

          <p style={{ maxWidth: '600px', margin: '0 auto 28px', color: '#94a3b8', fontSize: '16px' }}>
            Create an account, generate an API key, and harness top-tier GPT &amp; Claude models with pure pay-as-you-go.
          </p>

          <a className="landing-primary" href="/login?lang=en&mode=register" style={{ margin: '0 auto' }}>
            <span>Create free account now</span>
            <ArrowRight size={17} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div>
          <span>Orbiqen Gateway</span>
          <span style={{ marginLeft: '12px', color: '#64748b' }}>AI infrastructure for builders and high-velocity teams.</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="/login?lang=en">Open Dashboard</a>
          <a href="/en/docs">Documentation</a>
          <a href="/en/pricing">Pricing Catalog</a>
        </div>
      </footer>
    </main>
  )
}

export default EnglishHome
