import type { Metadata } from 'next'
import { PublicNav } from '@/components/public-nav'

export const metadata: Metadata = {
  title: 'Documentación de API',
  description: 'Guía rápida para conectar aplicaciones con la API compatible de Orbiqen y usar modelos GPT o Claude.',
  alternates: { canonical: '/docs' },
}

const openAiExample = `curl https://orbiqen.com/v1/chat/completions \\
  -H "Authorization: Bearer TU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-5.5","messages":[{"role":"user","content":"Hola"}]}'`

export default function DocsPage() {
  return (
    <main className="public-page">
      <PublicNav locale="es" englishPath="/en/docs" />
      <section className="public-hero">
        <p className="public-eyebrow">ORBIQEN API</p>
        <h1>Conectá tus aplicaciones con modelos GPT y Claude.</h1>
        <p>Una API compatible para tus herramientas de desarrollo, con keys por cliente, saldo prepago y seguimiento del consumo.</p>
        <div className="public-actions"><a className="public-primary" href="/login?mode=register">Crear una cuenta</a><a className="public-secondary" href="#quickstart">Ver quickstart</a></div>
      </section>
      <section className="public-content" id="quickstart">
        <div className="public-section-heading"><p className="public-eyebrow">QUICKSTART</p><h2>Empezá en pocos minutos</h2><p>Creá una API key desde tu panel y usá la Base URL de Orbiqen en tu aplicación.</p></div>
        <div className="public-grid">
          <article className="public-card"><span>01</span><h3>Creá tu cuenta</h3><p>Registrate, cargá saldo y generá una key para el grupo de modelos que quieras utilizar.</p></article>
          <article className="public-card"><span>02</span><h3>Configurá tu cliente</h3><p>Usá la Base URL compatible y enviá tu API key como Bearer token.</p></article>
          <article className="public-card"><span>03</span><h3>Medí tu consumo</h3><p>Consultá solicitudes, tokens, modelos utilizados y costos desde Usage.</p></article>
        </div>
        <div className="public-code"><div><span>OpenAI-compatible API</span><strong>Base URL: https://orbiqen.com/v1</strong></div><pre><code>{openAiExample}</code></pre></div>
      </section>
      <section className="public-content public-faq">
        <div className="public-section-heading"><p className="public-eyebrow">PREGUNTAS FRECUENTES</p><h2>Una conexión simple y transparente</h2></div>
        <details><summary>¿Puedo usar GPT y Claude?</summary><p>Sí. Las keys se crean por grupo: una key para ChatGPT/GPT y otra key para Claude.</p></details>
        <details><summary>¿Cómo se cobra?</summary><p>El saldo se descuenta según el consumo registrado por modelo. Podés recargar mediante los medios habilitados en tu cuenta.</p></details>
        <details><summary>¿Hay un instalador?</summary><p>Sí. Desde la sección Conectar podés descargar el asistente de Windows para configurar Codex y Claude automáticamente.</p></details>
      </section>
      <footer className="public-footer"><span>Orbiqen</span><span>API de inteligencia artificial para desarrolladores.</span></footer>
    </main>
  )
}
