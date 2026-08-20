import type { Metadata } from 'next'
import { PublicNav } from '@/components/public-nav'

export const metadata: Metadata = {
  title: 'Precios de API',
  description: 'Consultá cómo funciona el saldo prepago y el consumo de modelos GPT y Claude en Orbiqen.',
  alternates: { canonical: '/precios' },
}

export default function PricingPage() {
  return (
    <main className="public-page">
      <PublicNav locale="es" englishPath="/en/pricing" />
      <section className="public-hero compact">
        <p className="public-eyebrow">PRECIOS CLAROS</p>
        <h1>Pagá solo por lo que usás.</h1>
        <p>Orbiqen funciona con saldo prepago. El costo se registra por solicitud, modelo y tokens consumidos.</p>
        <div className="public-actions"><a className="public-primary" href="/login?mode=register">Crear una cuenta</a><a className="public-secondary" href="/docs">Leer documentación</a></div>
      </section>
      <section className="public-content">
        <div className="public-grid">
          <article className="public-card public-card-accent"><span>GPT</span><h2>Modelos ChatGPT</h2><p>Accedé a los modelos GPT disponibles en los grupos económico y estable de tu cuenta.</p><a href="/docs">Ver cómo conectar →</a></article>
          <article className="public-card public-card-blue"><span>CLAUDE</span><h2>Modelos Claude</h2><p>Usá Claude Code y otros modelos Claude con una key del grupo Claude.</p><a href="/docs">Ver cómo conectar →</a></article>
          <article className="public-card public-card-dark"><span>USAGE</span><h2>Control de consumo</h2><p>Revisá tu saldo, solicitudes, tokens y actividad desde un panel centralizado.</p><a href="/">Ingresar al panel →</a></article>
        </div>
        <div className="public-note"><strong>¿Necesitás una cuenta?</strong><span>Registrate gratis y cargá desde US$ 1 mediante los medios disponibles en el portal.</span><a href="/login?mode=register">Empezar ahora →</a></div>
      </section>
      <footer className="public-footer"><span>Orbiqen</span><span>Gateway de APIs de inteligencia artificial.</span></footer>
    </main>
  )
}
