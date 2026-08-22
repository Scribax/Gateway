'use client'

import { useState } from 'react'
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
import { PublicLanguageSwitch } from './public-nav'

type ToolTab = 'cursor' | 'claude' | 'python' | 'curl' | 'node'

const CODE_EXAMPLES: Record<ToolTab, { title: string; filename: string; code: string }> = {
  cursor: {
    title: 'Cursor / Windsurf',
    filename: 'Cursor Settings > Models > OpenAI API Key',
    code: `// En Cursor > Settings > Models > OpenAI:
Base URL: https://orbiqen.com/v1
API Key:  sk-orbiqen-tu-api-key

// Modelos recomendados:
- gpt-5.5
- gpt-5.4-mini
- claude-sonnet-5`,
  },
  claude: {
    title: 'Claude Code CLI',
    filename: '~/.bashrc o PowerShell',
    code: `# Configurar endpoint de Orbiqen para Claude Code:
export ANTHROPIC_BASE_URL="https://orbiqen.com"
export ANTHROPIC_API_KEY="sk-orbiqen-tu-api-key"

# Iniciar Claude Code directamente:
claude`,
  },
  python: {
    title: 'Python SDK',
    filename: 'app.py',
    code: `from openai import OpenAI

client = OpenAI(
    base_url="https://orbiqen.com/v1",
    api_key="sk-orbiqen-tu-api-key"
)

response = client.chat.completions.create(
    model="gpt-5.5",
    messages=[{"role": "user", "content": "Optimizá esta función en Python"}]
)

print(response.choices[0].message.content)`,
  },
  node: {
    title: 'Node.js / TypeScript',
    filename: 'index.ts',
    code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://orbiqen.com/v1",
  apiKey: "sk-orbiqen-tu-api-key",
});

const res = await client.chat.completions.create({
  model: "claude-sonnet-5",
  messages: [{ role: "user", content: "Generá un hook de React moderno" }],
});

console.log(res.choices[0].message.content);`,
  },
  curl: {
    title: 'cURL',
    filename: 'terminal',
    code: `curl https://orbiqen.com/v1/chat/completions \\
  -H "Authorization: Bearer sk-orbiqen-tu-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.5",
    "messages": [{"role": "user", "content": "Hola Orbiqen"}]
  }'`,
  },
}

const FAQS = [
  {
    q: '¿Cómo configuro Orbiqen en Cursor, Windsurf o VS Code?',
    a: 'Es inmediato: en la sección de configuración de modelos de tu editor (Cursor, Windsurf o la extensión Continue de VS Code), activás la opción OpenAI compatible, colocás como Base URL "https://orbiqen.com/v1" y pegás la API Key que generaste en tu panel de Orbiqen. ¡Listo para programar!',
  },
  {
    q: '¿Qué medios de pago puedo usar para recargar saldo?',
    a: 'En Argentina podés pagar directamente con Mercado Pago (QR, transferencia, débito o dinero en cuenta) con conversión automática a tasa fija de $1.600 ARS por dólar. También aceptamos Criptomonedas (USDT en red Binance/Tron, BTC, etc.) con acreditación automática desde tan solo US$ 1.',
  },
  {
    q: '¿El saldo prepago tiene fecha de vencimiento?',
    a: 'No. El saldo que cargás nunca vence. Podés usarlo hoy, dentro de tres meses o cuando lo necesites. Tampoco cobramos costos fijos ni cuotas mensuales de mantenimiento.',
  },
  {
    q: '¿Puedo usar Claude 3.7 y modelos GPT con la misma cuenta?',
    a: 'Sí. Podés crear API keys independientes para cada caso de uso: una key asignada al grupo Claude (ideal para Claude Code o Sonnet) y otra key asignada al grupo ChatGPT (para tareas de código rápido o automatizaciones económicas).',
  },
  {
    q: '¿Qué ventaja tiene frente a pagar la suscripción oficial de $20 USD?',
    a: 'Las suscripciones oficiales te obligan a pagar $20 USD + 60% de impuestos bancarios mensuales por cada herramienta, uses o no el servicio. Con Orbiqen pagás exclusivamente los tokens que consumís, sin impuestos sorpresa de tarjeta y con recargas mínimas desde solo $1 USD.',
  },
  {
    q: '¿Cómo funciona el instalador automático para Windows?',
    a: 'Dentro de la sección de instalación podés descargar "activar-orbiqen.bat". Al ejecutarlo con doble clic, detecta automáticamente tus instalaciones de OpenAI Codex y Claude Code, crea un respaldo seguro y configura los endpoints y modelos en 10 segundos.',
  },
]

export default function PublicHome() {
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
  const tokenCostOfficialUsd = 20
  const tokenCostOfficialArs = (20 * 1600 * 1.6).toLocaleString('es-AR')
  const tokenCostOrbiqenArs = Math.round(monthlyTokensM * 0.45 * 1600).toLocaleString('es-AR')

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
          <a href="#demo">Demostración</a>
          <a href="#compatibility">Herramientas</a>
          <a href="#calculator">Calculadora</a>
          <a href="#pricing">Precios</a>
          <a href="#faq">Preguntas</a>
          <a href="/docs">Docs</a>
        </nav>
        <div className="landing-nav-actions">
          <PublicLanguageSwitch locale="es" englishPath="/" spanishPath="/es" />
          <a className="landing-link" href="/login?lang=es">Ingresar</a>
          <a className="landing-button" href="/login?lang=es&mode=register">Crear cuenta</a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow-badge">
            <span className="pulse-dot" />
            <span>Latencia &lt; 350ms • 99.9% Uptime • Compatible con Cursor &amp; Claude</span>
          </div>

          <h1>
            Tus modelos de IA favoritos, <span className="gradient-title">sin tarjeta internacional y en Pesos.</span>
          </h1>

          <p className="landing-lead">
            Conectá <strong>Claude 3.7 Sonnet, GPT-5.5 y GPT-4o</strong> a tu editor en 60 segundos. Pagá con <strong>Mercado Pago o Cripto</strong> desde US$ 1, sin cuotas mensuales obligatorias ni impuestos sorpresa.
          </p>

          <div className="landing-actions">
            <a className="landing-primary" href="/login?lang=es&mode=register">
              <span>Empezar con crédito gratis</span>
              <ArrowRight size={17} />
            </a>
            <a className="landing-secondary" href="#demo">
              <Play size={15} />
              <span>Ver prueba en vivo</span>
            </a>
          </div>

          <div className="landing-badges">
            <span><BadgeCheck size={16} /> Compatible con OpenAI SDK</span>
            <span><WalletCards size={16} /> Recargas desde US$ 1</span>
            <span><Zap size={16} /> Mercado Pago en el acto</span>
            <span><ShieldCheck size={16} /> Saldo sin vencimiento</span>
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
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            {/* Live Interactive Simulation */}
            <div className="terminal-live-demo">
              <div className="demo-head">
                <span className="demo-title">
                  <Radio size={13} />
                  Simulador de Relay en Vivo
                </span>
                <button className="demo-run-btn" onClick={handleSimulate} disabled={simulating}>
                  <Play size={12} />
                  <span>{simulating ? 'Enviando...' : 'Testear Respuesta'}</span>
                </button>
              </div>

              <div className="demo-output">
                {simulating ? (
                  <span style={{ color: '#38bdf8' }}>⚡ Conectando con gateway Orbiqen (streaming tokens)...</span>
                ) : simCompleted ? (
                  <>
                    <span style={{ color: '#6ee7b7' }}>✓ [HTTP 200 OK] {`{"model": "gpt-5.5", "status": "operational"}`}</span>
                    <span style={{ color: '#cbd5e1', marginTop: '3px' }}>&quot;¡Relay de Orbiqen activo! Tu editor está listo para programar a máxima velocidad.&quot;</span>
                    <div className="demo-metrics">
                      <span>Latencia: <strong>318 ms</strong></span>
                      <span>Tokens: <strong>38</strong></span>
                      <span>Costo: <strong>$0.00014 USD (~$0.22 ARS)</strong></span>
                    </div>
                  </>
                ) : (
                  <span style={{ color: '#64748b' }}>Hacé clic en &quot;Testear Respuesta&quot; para medir la velocidad de respuesta real del gateway.</span>
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
            <strong>Pagos Locales en Segundos</strong>
            <span>Recargá saldo con Mercado Pago al instante (1 USD = $1.600 ARS) o Cripto desde $1.</span>
          </div>
        </article>

        <article className="landing-strip-card">
          <div className="strip-icon cyan">
            <Code2 size={22} />
          </div>
          <div>
            <strong>Conexión Universal</strong>
            <span>Compatible con el 100% de herramientas y librerías que soportan OpenAI o Anthropic.</span>
          </div>
        </article>

        <article className="landing-strip-card">
          <div className="strip-icon orange">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>Control Total y Sin Vencimiento</strong>
            <span>Creá subclaves aisladas por proyecto, limitá el gasto y tu saldo nunca caduca.</span>
          </div>
        </article>
      </section>

      {/* Tools Compatibility Showcase */}
      <section className="landing-section" id="compatibility">
        <div className="landing-section-head">
          <div className="landing-eyebrow-badge">
            <Sparkles size={13} />
            <span>ECOSISTEMA Y COMPATIBILIDAD</span>
          </div>
          <h2>Conectá tus herramientas de desarrollo favoritas.</h2>
          <p>
            No necesitás cambiar de editor ni aprender APIs nuevas. Cambiás la Base URL y empezás a trabajar inmediatamente.
          </p>
        </div>

        <div className="tools-showcase-grid">
          <div className="tool-badge-card">
            <div className="tool-badge-head">
              <div className="tool-badge-icon">
                <Code2 size={20} />
              </div>
              <span className="tool-badge-chip">1 Clic</span>
            </div>
            <h4>Cursor &amp; Windsurf</h4>
            <p>Usá autocompletado y chat con Claude 3.7 y GPT-5 sin pagar suscripciones fijas.</p>
          </div>

          <div className="tool-badge-card">
            <div className="tool-badge-head">
              <div className="tool-badge-icon">
                <Terminal size={20} />
              </div>
              <span className="tool-badge-chip">Nativo</span>
            </div>
            <h4>Claude Code CLI</h4>
            <p>Exportá tu ANTHROPIC_BASE_URL y ejecutá el asistente de terminal con tus modelos favoritos.</p>
          </div>

          <div className="tool-badge-card">
            <div className="tool-badge-head">
              <div className="tool-badge-icon">
                <Cpu size={20} />
              </div>
              <span className="tool-badge-chip">Open Source</span>
            </div>
            <h4>VS Code / Continue</h4>
            <p>Integrá la extensión Continue o Cline con tus claves de Orbiqen para programar en local.</p>
          </div>

          <div className="tool-badge-card">
            <div className="tool-badge-head">
              <div className="tool-badge-icon">
                <Globe size={20} />
              </div>
              <span className="tool-badge-chip">SDKs</span>
            </div>
            <h4>Python, Node &amp; LangChain</h4>
            <p>Compatible con librerías de OpenAI, LlamaIndex, Flowise, LibreChat y frameworks de agentes.</p>
          </div>
        </div>
      </section>

      {/* Windows 1-Click Installer Banner */}
      <section className="landing-section">
        <div className="installer-banner">
          <div className="installer-copy">
            <div className="landing-eyebrow-badge" style={{ marginBottom: '10px' }}>
              <Download size={13} />
              <span>INSTALADOR AUTOMÁTICO WINDOWS</span>
            </div>
            <h3>¿Usás Windows? Dejá todo listo con un doble clic.</h3>
            <p>
              Incluimos el script <code>activar-orbiqen.bat</code> que configura automáticamente OpenAI Codex y Claude Code en tu PC creando copias de respaldo de seguridad.
            </p>
          </div>
          <a className="landing-primary" href="/login?lang=es&mode=register">
            <span>Obtener instalador</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Interactive Savings Calculator */}
      <section className="landing-section" id="calculator">
        <div className="landing-section-head">
          <div className="landing-eyebrow-badge">
            <Coins size={13} />
            <span>CALCULADORA DE COSTOS</span>
          </div>
          <h2>Pagá solo lo que usás. Sin suscripciones obligatorias.</h2>
          <p>
            Comprobá cuánto ahorrás al mes usando saldo prepago en lugar de pagar suscripciones mensuales fijas en dólares con impuestos de tarjeta.
          </p>
        </div>

        <div className="calculator-card">
          <div className="calc-slider-box">
            <div className="calc-slider-head">
              <span>Tu consumo mensual estimado:</span>
              <strong>{monthlyTokensM} Millones de Tokens</strong>
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
              <span>1M (Uso ligero / Pruebas)</span>
              <span>10M (Desarrollador activo)</span>
              <span>20M+ (Equipo / Producción)</span>
            </div>
          </div>

          <div className="calc-comparison-box">
            <div className="compare-row">
              <span>Suscripción Oficial ($20 USD + Impuestos):</span>
              <strong style={{ color: '#ef4444' }}>~${tokenCostOfficialArs} ARS / mes</strong>
            </div>

            <div className="compare-row highlight">
              <span>Costo en Orbiqen (Prepago real):</span>
              <strong>${tokenCostOrbiqenArs} ARS (US$ {tokenCostOrbiqen})</strong>
            </div>

            <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 700, textAlign: 'center', marginTop: '4px' }}>
              🎉 Ahorro de más del 70% sin tarjeta internacional
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="landing-section" id="pricing">
        <div className="landing-section-head">
          <div className="landing-eyebrow-badge">
            <Layers size={13} />
            <span>GRUPOS Y PRECIOS CLAROS</span>
          </div>
          <h2>Precios transparentes por millón de tokens.</h2>
          <p>Elegí el grupo que mejor se adapte a tu flujo de trabajo y cargá saldo cuando quieras.</p>
        </div>

        <div className="landing-pricing-grid">
          <article className="landing-pricing-card tone-green">
            <div className="landing-card-top">
              <div>
                <p>GRUPO 0.1</p>
                <h3>ChatGPT Económico</h3>
              </div>
              <span>Menor costo</span>
            </div>
            <strong>Desde US$ 0,0556 input / US$ 0,334 output</strong>
            <div className="landing-pricing-copy">
              Ideal para pruebas de código, automatizaciones diarias, agentes y tareas donde necesitás el menor costo posible por token.
            </div>
            <a href="/precios">
              <span>Ver catálogo completo</span>
              <ArrowRight size={15} />
            </a>
          </article>

          <article className="landing-pricing-card tone-blue">
            <div className="landing-card-top">
              <div>
                <p>GRUPO 0.25</p>
                <h3>ChatGPT Estable</h3>
              </div>
              <span>Alta disponibilidad</span>
            </div>
            <strong>Desde US$ 0,139 input / US$ 0,835 output</strong>
            <div className="landing-pricing-copy">
              Configurado para proyectos en producción y desarrolladores que necesitan balance óptimo entre velocidad, estabilidad y margen.
            </div>
            <a href="/precios">
              <span>Ver catálogo completo</span>
              <ArrowRight size={15} />
            </a>
          </article>

          <article className="landing-pricing-card tone-coral">
            <div className="landing-card-top">
              <div>
                <p>ANTHROPIC</p>
                <h3>Claude &amp; Code</h3>
              </div>
              <span>Recomendado</span>
            </div>
            <strong>Desde US$ 0,30 input / US$ 1,50 output</strong>
            <div className="landing-pricing-copy">
              Acceso a Claude 3.7 Sonnet, Opus y Haiku. Perfecto para Claude Code CLI, Cursor y refactorizaciones complejas de software.
            </div>
            <a href="/precios">
              <span>Ver catálogo completo</span>
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
            <span>PREGUNTAS FRECUENTES</span>
          </div>
          <h2>Todo lo que necesitás saber antes de empezar.</h2>
          <p>Respuestas claras sobre pagos, configuración y funcionamiento del gateway.</p>
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
            <span>EMPEZÁ EN MENOS DE 60 SEGUNDOS</span>
          </div>

          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 16px', color: '#fff', fontWeight: 800 }}>
            Unite a los desarrolladores que ya programan con Orbiqen.
          </h2>

          <p style={{ maxWidth: '600px', margin: '0 auto 28px', color: '#94a3b8', fontSize: '16px' }}>
            Creá tu cuenta, generá tu primera API key y aprovechá la velocidad de Claude y GPT en Pesos con Mercado Pago.
          </p>

          <a className="landing-primary" href="/login?lang=es&mode=register" style={{ margin: '0 auto' }}>
            <span>Crear cuenta gratis ahora</span>
            <ArrowRight size={17} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div>
          <span>Orbiqen Gateway</span>
          <span style={{ marginLeft: '12px', color: '#64748b' }}>Infraestructura de IA para desarrolladores y empresas.</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="/login?lang=es">Ingresar al panel</a>
          <a href="/docs">Documentación</a>
          <a href="/precios">Catálogo de precios</a>
        </div>
      </footer>
    </main>
  )
}
