import type { ReactNode } from 'react'
import { ArrowRight, BadgeCheck, ChevronRight, Coins, LayoutDashboard, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import { PublicLanguageSwitch } from './public-nav'

const openAiExample = `curl https://orbiqen.com/v1/chat/completions \\
  -H "Authorization: Bearer TU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-5.5","messages":[{"role":"user","content":"Hola"}]}'`

function BrandMark() {
  return <span className="landing-brand-mark"><img src="/orbiqen-logo.png" alt="Orbiqen" /></span>
}

function PricingCard({ title, subtitle, price, note, accent, children, href }: { title: string; subtitle: string; price: string; note: string; accent: string; children: ReactNode; href: string }) {
  return (
    <article className={`landing-pricing-card ${accent}`}>
      <div className="landing-card-top">
        <div>
          <p>{subtitle}</p>
          <h3>{title}</h3>
        </div>
        <span>{note}</span>
      </div>
      <strong>{price}</strong>
      <div className="landing-pricing-copy">{children}</div>
      <a href={href}>Ver detalle <ChevronRight size={16} /></a>
    </article>
  )
}

export default function PublicHome() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="/"><BrandMark /></a>
        <nav>
          <a href="#how">Cómo funciona</a>
          <a href="#pricing">Precios</a>
          <a href="/docs">Docs</a>
        </nav>
        <div className="landing-nav-actions">
          <PublicLanguageSwitch locale="es" englishPath="/en" />
          <a className="landing-link" href="/login">Ingresar</a>
          <a className="landing-button" href="/login?mode=register">Crear cuenta</a>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">GATEWAY DE IA PARA VENDER Y ESCALAR</p>
          <h1>Una API para GPT, Claude y tus clientes en un mismo panel.</h1>
          <p className="landing-lead">Cobrá en saldo prepago, controlá el uso por key y ofrecé modelos listos para producción con una experiencia clara para tus clientes.</p>
          <div className="landing-actions">
            <a className="landing-primary" href="/login?mode=register">Empezar gratis</a>
            <a className="landing-secondary" href="#pricing">Ver precios</a>
          </div>
          <div className="landing-badges">
            <span><BadgeCheck size={16} />Compatible con OpenAI</span>
            <span><WalletCards size={16} />Saldo desde US$ 1</span>
            <span><ShieldCheck size={16} />Keys y consumo aislados</span>
          </div>
        </div>
        <aside className="landing-hero-panel">
          <div className="landing-panel-header">
            <div>
              <p>Base URL</p>
              <strong>https://orbiqen.com/v1</strong>
            </div>
            <span>Listo para usar</span>
          </div>
          <div className="landing-panel-grid">
            <div>
              <p>GPT</p>
              <strong>Grupo económico y estable</strong>
            </div>
            <div>
              <p>Claude</p>
              <strong>Modelos Anthropic y Claude Code</strong>
            </div>
            <div>
              <p>Usage</p>
              <strong>Saldo, tokens y costos por cliente</strong>
            </div>
          </div>
          <div className="landing-code">
            <div>
              <span>OpenAI compatible</span>
              <strong>Una sola integración</strong>
            </div>
            <pre><code>{openAiExample}</code></pre>
          </div>
        </aside>
      </section>

      <section className="landing-strip">
        <article><LayoutDashboard size={18} /><div><strong>Panel por cliente</strong><span>Claves, saldo y uso real en un solo lugar.</span></div></article>
        <article><Sparkles size={18} /><div><strong>Modelos seleccionables</strong><span>Mostrá solo lo que cada grupo puede usar.</span></div></article>
        <article><Coins size={18} /><div><strong>Recargas flexibles</strong><span>Mercado Pago y cripto para cargar saldo.</span></div></article>
      </section>

      <section className="landing-section" id="how">
        <div className="landing-section-head">
          <p className="landing-eyebrow">FLUJO SIMPLE</p>
          <h2>De una key a producción en tres pasos.</h2>
          <p>Diseñado para que cualquier cliente entienda qué hace, cuánto gasta y cómo volver a cargar saldo.</p>
        </div>
        <div className="landing-steps">
          <article><span>01</span><h3>Creá tu cuenta</h3><p>Registrate y generá keys separadas para GPT o Claude según tu caso de uso.</p></article>
          <article><span>02</span><h3>Elegí el grupo</h3><p>Asigná el grupo de modelos y activá solo los que quieras ofrecer.</p></article>
          <article><span>03</span><h3>Medí y cobrala</h3><p>Vas viendo uso, costos y saldo disponible para cada cliente.</p></article>
        </div>
      </section>

      <section className="landing-section" id="pricing">
        <div className="landing-section-head">
          <p className="landing-eyebrow">PRECIOS</p>
          <h2>Una lista clara para vender sin vueltas.</h2>
          <p>Separá el valor por grupo y dejá que el cliente entienda rápido qué recibe y cuánto le rinde cada recarga.</p>
        </div>
        <div className="landing-pricing-grid">
          <PricingCard title="ChatGPT Económico" subtitle="Grupo 0.1" price="Desde US$ 0,0556 input / US$ 0,334 output" note="Más accesible" accent="tone-green" href="/precios">
            Ideal para pruebas, automatizaciones y tareas cotidianas con el menor costo de entrada.
          </PricingCard>
          <PricingCard title="ChatGPT Estable" subtitle="Grupo 0.25" price="Desde US$ 0,139 input / US$ 0,835 output" note="Más disponibilidad" accent="tone-blue" href="/precios">
            Una opción equilibrada cuando querés priorizar continuidad de servicio y margen sano.
          </PricingCard>
          <PricingCard title="Claude" subtitle="Anthropic" price="Desde US$ 0,150 input / US$ 0,750 output" note="Recomendado" accent="tone-coral" href="/precios">
            Pensado para clientes que quieren Claude Code, Sonnet, Haiku y un flujo profesional de uso.
          </PricingCard>
        </div>
      </section>

      <section className="landing-section landing-split">
        <div className="landing-section-head">
          <p className="landing-eyebrow">DOCUMENTACIÓN</p>
          <h2>Integración compatible con OpenAI.</h2>
          <p>Tu aplicación apunta a la misma estructura de mensajes que ya conocés, pero con control de saldo, grupos y consumo.</p>
          <a className="landing-secondary" href="/docs">Ver documentación <ArrowRight size={16} /></a>
        </div>
        <div className="landing-doc-card">
          <div>
            <strong>Base URL</strong>
            <code>https://orbiqen.com/v1</code>
          </div>
          <div>
            <strong>Formato</strong>
            <code>Authorization: Bearer TU_API_KEY</code>
          </div>
          <div>
            <strong>Modelos</strong>
            <code>gpt-5.5, gpt-5.6, claude-opus-4-8, claude-haiku-4-5...</code>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>Orbiqen</span>
        <span>Gateway de IA para vender acceso, medir uso y cobrar por saldo.</span>
        <a href="/login">Ingresar al panel</a>
      </footer>
    </main>
  )
}
