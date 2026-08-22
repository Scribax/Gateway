'use client'

import { useState, useMemo } from 'react'
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
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  WalletCards,
  Zap,
} from 'lucide-react'
import { PublicLanguageSwitch } from './public-nav'

type Locale = 'es' | 'en'
type CategoryFilter = 'all' | 'text' | 'code' | 'image'
type ToolTab = 'cursor' | 'claude' | 'python' | 'node' | 'curl'

interface LiveModel {
  id: string
  name: string
  provider: string
  providerBadge: 'openai' | 'anthropic' | 'deepseek'
  category: 'text' | 'code' | 'image'
  inputPrice: number
  officialInputPrice: number
  cachedInputPrice: number
  officialCachedPrice: number
  outputPrice: number
  officialOutputPrice: number
  discountPercent: number
  tag?: string
}

const LIVE_MODELS: LiveModel[] = [
  {
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    provider: 'Anthropic',
    providerBadge: 'anthropic',
    category: 'text',
    inputPrice: 1.25,
    officialInputPrice: 15.00,
    cachedInputPrice: 0.125,
    officialCachedPrice: 1.50,
    outputPrice: 6.25,
    officialOutputPrice: 75.00,
    discountPercent: 91,
    tag: 'Máxima Capacidad',
  },
  {
    id: 'claude-opus-4-8',
    name: 'Claude Opus 4.8',
    provider: 'Anthropic',
    providerBadge: 'anthropic',
    category: 'text',
    inputPrice: 1.25,
    officialInputPrice: 15.00,
    cachedInputPrice: 0.125,
    officialCachedPrice: 1.50,
    outputPrice: 6.25,
    officialOutputPrice: 75.00,
    discountPercent: 91,
    tag: 'Recomendado',
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    provider: 'Anthropic',
    providerBadge: 'anthropic',
    category: 'code',
    inputPrice: 0.60,
    officialInputPrice: 3.00,
    cachedInputPrice: 0.06,
    officialCachedPrice: 0.30,
    outputPrice: 3.00,
    officialOutputPrice: 15.00,
    discountPercent: 80,
    tag: 'Favorito Cursor',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    providerBadge: 'anthropic',
    category: 'code',
    inputPrice: 0.60,
    officialInputPrice: 3.00,
    cachedInputPrice: 0.06,
    officialCachedPrice: 0.30,
    outputPrice: 3.00,
    officialOutputPrice: 15.00,
    discountPercent: 80,
  },
  {
    id: 'gpt-5.5',
    name: 'GPT 5.5',
    provider: 'OpenAI',
    providerBadge: 'openai',
    category: 'text',
    inputPrice: 0.37,
    officialInputPrice: 2.50,
    cachedInputPrice: 0.037,
    officialCachedPrice: 1.25,
    outputPrice: 2.22,
    officialOutputPrice: 10.00,
    discountPercent: 85,
    tag: 'Flagship GPT',
  },
  {
    id: 'gpt-5.6-sol',
    name: 'GPT 5.6 Sol',
    provider: 'OpenAI',
    providerBadge: 'openai',
    category: 'text',
    inputPrice: 0.37,
    officialInputPrice: 5.00,
    cachedInputPrice: 0.037,
    officialCachedPrice: 2.50,
    outputPrice: 2.22,
    officialOutputPrice: 15.00,
    discountPercent: 92,
    tag: 'Ultra Descuento',
  },
  {
    id: 'gpt-5.6-terra',
    name: 'GPT 5.6 Terra',
    provider: 'OpenAI',
    providerBadge: 'openai',
    category: 'code',
    inputPrice: 0.15,
    officialInputPrice: 2.00,
    cachedInputPrice: 0.015,
    officialCachedPrice: 1.00,
    outputPrice: 0.89,
    officialOutputPrice: 8.00,
    discountPercent: 88,
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT 5.4 Mini',
    provider: 'OpenAI',
    providerBadge: 'openai',
    category: 'text',
    inputPrice: 0.055,
    officialInputPrice: 0.15,
    cachedInputPrice: 0.0055,
    officialCachedPrice: 0.075,
    outputPrice: 0.33,
    officialOutputPrice: 0.60,
    discountPercent: 63,
    tag: 'Ultra Económico',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    providerBadge: 'anthropic',
    category: 'text',
    inputPrice: 0.30,
    officialInputPrice: 1.00,
    cachedInputPrice: 0.03,
    officialCachedPrice: 0.10,
    outputPrice: 1.50,
    officialOutputPrice: 5.00,
    discountPercent: 70,
  },
  {
    id: 'claude-fable-5',
    name: 'Claude Fable 5',
    provider: 'Anthropic',
    providerBadge: 'anthropic',
    category: 'text',
    inputPrice: 1.25,
    officialInputPrice: 8.00,
    cachedInputPrice: 0.125,
    officialCachedPrice: 0.80,
    outputPrice: 6.25,
    officialOutputPrice: 32.00,
    discountPercent: 84,
  },
  {
    id: 'gpt-image-1.5',
    name: 'GPT Image 1.5',
    provider: 'OpenAI',
    providerBadge: 'openai',
    category: 'image',
    inputPrice: 0.50,
    officialInputPrice: 2.00,
    cachedInputPrice: 0.05,
    officialCachedPrice: 1.00,
    outputPrice: 3.00,
    officialOutputPrice: 10.00,
    discountPercent: 75,
  },
]

const CODE_EXAMPLES: Record<ToolTab, { title: string; filename: string; code: string }> = {
  cursor: {
    title: 'Cursor / Windsurf',
    filename: 'Cursor Settings > Models > OpenAI API Key',
    code: '// En Cursor > Settings > Models > OpenAI:\nBase URL: https://orbiqen.com/v1\nAPI Key:  sk-orbiqen-tu-api-key\n\n// Modelos recomendados:\n- gpt-5.5\n- claude-sonnet-5\n- claude-opus-4-8\n- gpt-5.4-mini',
  },
  claude: {
    title: 'Claude Code CLI',
    filename: '~/.bashrc o PowerShell',
    code: '# Configurar endpoint de Orbiqen para Claude Code:\nexport ANTHROPIC_BASE_URL="https://orbiqen.com"\nexport ANTHROPIC_AUTH_TOKEN="sk-orbiqen-tu-api-key"\n\n# Iniciar Claude Code directamente:\nclaude',
  },
  python: {
    title: 'Python SDK',
    filename: 'app.py',
    code: 'from openai import OpenAI\n\nclient = OpenAI(\n    base_url="https://orbiqen.com/v1",\n    api_key="sk-orbiqen-tu-api-key"\n)\n\nresponse = client.chat.completions.create(\n    model="gpt-5.5",\n    messages=[{"role": "user", "content": "Optimizá esta función en Python"}]\n)\n\nprint(response.choices[0].message.content)',
  },
  node: {
    title: 'Node.js / TypeScript',
    filename: 'index.ts',
    code: 'import OpenAI from "openai";\n\nconst client = new OpenAI({\n  baseURL: "https://orbiqen.com/v1",\n  apiKey: "sk-orbiqen-tu-api-key",\n});\n\nconst res = await client.chat.completions.create({\n  model: "claude-sonnet-5",\n  messages: [{ role: "user", content: "Generá un hook de React moderno" }],\n});\n\nconsole.log(res.choices[0].message.content);',
  },
  curl: {
    title: 'cURL',
    filename: 'terminal',
    code: 'curl https://orbiqen.com/v1/chat/completions \\\n  -H "Authorization: Bearer sk-orbiqen-tu-api-key" \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "model": "gpt-5.5",\n    "messages": [{"role": "user", "content": "Hola Orbiqen"}]\n  }\'',
  },
}

const FAQS = [
  {
    q: '¿Cómo funciona el descuento de hasta 90% en comparación con los proveedores oficiales?',
    a: 'Agregamos capacidad de cómputo mayorista e infraestructura optimizada con balanceo inteligente. Pagás únicamente por los tokens exactos que consumís, sin suscripciones mensuales fijas de $20 o $200 USD.',
  },
  {
    q: '¿Tengo que cambiar el código de mis aplicaciones o proyectos?',
    a: 'No. Orbiqen es 100% compatible con la API estándar de OpenAI y Anthropic. Solo cambiás la Base URL a https://orbiqen.com/v1 y tu API Key. El resto de tus llamadas, herramientas (function calling) y streaming funcionan igual.',
  },
  {
    q: '¿Qué medios de pago aceptan?',
    a: 'Aceptamos Mercado Pago en Pesos Argentinos (ARS) sin impuestos país ni recargos sorpresa, y Criptomonedas (USDT, USDC, BTC, SOL) a través de pasarelas descentralizadas.',
  },
  {
    q: '¿Cómo funciona el instalador automático para Windows?',
    a: 'Incluimos el asistente activar-orbiqen.bat. Al ejecutarlo, valida tus modelos en vivo, crea un respaldo seguro de tus configuraciones y deja listos Cursor, Codex CLI y Claude en 10 segundos.',
  },
  {
    q: '¿Qué es el Prompt Caching y cuánto ahorro?',
    a: 'Prompt Caching almacena en memoria los prefijos de contexto y código repetidos. Con Orbiqen, las lecturas en caché tienen un descuento adicional de hasta el 90%, costando centavos por millón de tokens.',
  },
]

export default function PublicHome({ locale = 'es' }: { locale?: Locale }) {
  const isEn = locale === 'en'
  const [activeTool, setActiveTool] = useState<ToolTab>('cursor')
  const [copied, setCopied] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Savings Calculator State
  const [monthlyTokens, setMonthlyTokens] = useState<number>(50)

  const filteredModels = useMemo(() => {
    return LIVE_MODELS.filter((model) => {
      const matchesCategory = categoryFilter === 'all' || model.category === categoryFilter
      const matchesSearch =
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [categoryFilter, searchTerm])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Calculator math
  const officialCost = Math.round(monthlyTokens * 4.5)
  const orbiqenCost = Math.round(monthlyTokens * 0.65)
  const monthlySavings = officialCost - orbiqenCost
  const savingsPercent = Math.round((monthlySavings / (officialCost || 1)) * 100)

  return (
    <div className="ci-page-wrapper">
      {/* Top Floating Nav */}
      <header className="ci-top-nav">
        <div className="ci-nav-container">
          <a href={isEn ? '/en' : '/'} className="ci-brand">
            <div className="ci-brand-logo">
              <Sparkles size={18} className="ci-brand-icon" />
            </div>
            <span className="ci-brand-name">Orbiqen</span>
          </a>

          <nav className="ci-nav-links">
            <a href="#catalog" className="ci-nav-link">{isEn ? 'Models' : 'Modelos'}</a>
            <a href="#how-it-works" className="ci-nav-link">{isEn ? 'How to switch' : 'Cómo migrar'}</a>
            <a href="#calculator" className="ci-nav-link">{isEn ? 'Calculator' : 'Calculadora'}</a>
            <a href={isEn ? '/en/pricing' : '/precios'} className="ci-nav-link">{isEn ? 'Pricing' : 'Precios'}</a>
            <a href={isEn ? '/en/docs' : '/docs'} className="ci-nav-link">{isEn ? 'Docs' : 'Documentación'}</a>
          </nav>

          <div className="ci-nav-actions">
            <PublicLanguageSwitch locale={locale} englishPath="/en" spanishPath="/" />
            <a href={isEn ? '/login?lang=en' : '/login?lang=es'} className="ci-btn-login">
              {isEn ? 'Log in' : 'Ingresar'}
            </a>
            <a href={isEn ? '/login?lang=en&mode=register' : '/login?lang=es&mode=register'} className="ci-btn-cta">
              {isEn ? 'START SAVING' : 'EMPEZAR A AHORRAR'}
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="ci-hero-section">
        <div className="ci-hero-container">
          <div className="ci-pill-badge">
            <span className="ci-pulse-dot" />
            <span>{isEn ? 'ZERO DATA RETENTION & HIGH AVAILABILITY' : 'ZERO DATA RETENTION Y ALTA DISPONIBILIDAD'}</span>
          </div>

          <h1 className="ci-hero-title">
            {isEn ? (
              <>
                Save up to <mark className="ci-highlight">90%</mark><br />
                on AI models
              </>
            ) : (
              <>
                Ahorrá hasta un <mark className="ci-highlight">90%</mark><br />
                en modelos de IA
              </>
            )}
          </h1>

          <p className="ci-hero-subtitle">
            {isEn
              ? 'Access leading discounted AI models from OpenAI, Anthropic, and DeepSeek through one unified API - without changing your request format.'
              : 'Accedé a los modelos líderes de OpenAI, Anthropic y DeepSeek con descuentos masivos a través de una única API compatible - sin cambiar el formato de tus peticiones.'}
          </p>

          <div className="ci-hero-cta-group">
            <a href={isEn ? '/login?lang=en&mode=register' : '/login?lang=es&mode=register'} className="ci-btn-hero-primary">
              <span>{isEn ? 'START SAVING' : 'EMPEZAR A AHORRAR'}</span>
              <ArrowRight size={16} />
            </a>
            <a href={isEn ? '/en/docs' : '/docs'} className="ci-hero-secondary-link">
              {isEn ? '$500+/MONTH? TALK TO SALES →' : '¿USO EMPRESARIAL O REVENDEDOR? CONTACTAR →'}
            </a>
          </div>

          {/* Quick Stat Badges */}
          <div className="ci-hero-stats">
            <div className="ci-stat-item">
              <span className="ci-stat-val">&lt; 35ms</span>
              <span className="ci-stat-lbl">{isEn ? 'Gateway Latency' : 'Latencia de Gateway'}</span>
            </div>
            <div className="ci-stat-divider" />
            <div className="ci-stat-item">
              <span className="ci-stat-val">99.98%</span>
              <span className="ci-stat-lbl">{isEn ? 'Uptime SLA' : 'Disponibilidad'}</span>
            </div>
            <div className="ci-stat-divider" />
            <div className="ci-stat-item">
              <span className="ci-stat-val">100%</span>
              <span className="ci-stat-lbl">{isEn ? 'OpenAI / Anthropic Compatible' : 'Compatible con SDKs'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Catalog Rates Section */}
      <section id="catalog" className="ci-catalog-section">
        <div className="ci-catalog-container">
          <div className="ci-catalog-header-wrap">
            <h2 className="ci-section-title">
              {isEn ? 'See current catalog rates' : 'Tarifas del catálogo en vivo'}
            </h2>
            
            <div className="ci-catalog-controls">
              <div className="ci-search-bar">
                <Search size={16} className="ci-search-icon" />
                <input
                  type="text"
                  placeholder={isEn ? 'Search models or providers...' : 'Buscar modelos o proveedores...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="ci-filter-pills">
                <button
                  className={`ci-pill-btn ${categoryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('all')}
                >
                  {isEn ? 'All models' : 'Todos'}
                </button>
                <button
                  className={`ci-pill-btn ${categoryFilter === 'text' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('text')}
                >
                  {isEn ? 'Text models' : 'Modelos de Texto'}
                </button>
                <button
                  className={`ci-pill-btn ${categoryFilter === 'code' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('code')}
                >
                  {isEn ? 'Code & Reasoning' : 'Código & Razonamiento'}
                </button>
                <button
                  className={`ci-pill-btn ${categoryFilter === 'image' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('image')}
                >
                  {isEn ? 'Image models' : 'Imágenes'}
                </button>
              </div>
            </div>
          </div>

          {/* Sleek Dark Live Catalog Card */}
          <div className="ci-dark-catalog-card">
            <div className="ci-catalog-top-bar">
              <div className="ci-live-tag">
                <span className="ci-pulse-dot-green" />
                <span>LIVE CATALOG</span>
              </div>
              <div className="ci-catalog-meta-info">
                <span>CHECKED EN VIVO</span>
                <span>•</span>
                <span>HASTA 92% OFF LIST PRICE</span>
                <span>•</span>
                <span>TARIFAS EN USD Y ARS</span>
              </div>
            </div>

            <div className="ci-table-responsive">
              <table className="ci-catalog-table">
                <thead>
                  <tr>
                    <th>MODEL</th>
                    <th>INPUT / 1M</th>
                    <th>CACHED INPUT / 1M</th>
                    <th>OUTPUT / 1M</th>
                    <th>DISCOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.map((m) => (
                    <tr key={m.id} className="ci-table-row">
                      <td className="ci-col-model">
                        <div className="ci-model-cell">
                          <div className={`ci-provider-avatar ${m.providerBadge}`}>
                            {m.providerBadge === 'anthropic' ? 'AI' : m.providerBadge === 'openai' ? 'OA' : 'DS'}
                          </div>
                          <div>
                            <div className="ci-model-name">
                              {m.name}
                              {m.tag && <span className="ci-badge-micro">{m.tag}</span>}
                            </div>
                            <div className="ci-provider-sub">{m.provider}</div>
                          </div>
                        </div>
                      </td>
                      <td className="ci-col-price">
                        <div className="ci-price-wrap">
                          <span className="ci-price-active">${m.inputPrice.toFixed(2)}</span>
                          <span className="ci-price-strikethrough">${m.officialInputPrice.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="ci-col-price">
                        <div className="ci-price-wrap">
                          <span className="ci-price-active">${m.cachedInputPrice.toFixed(3)}</span>
                          <span className="ci-price-strikethrough">${m.officialCachedPrice.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="ci-col-price">
                        <div className="ci-price-wrap">
                          <span className="ci-price-active">${m.outputPrice.toFixed(2)}</span>
                          <span className="ci-price-strikethrough">${m.officialOutputPrice.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="ci-col-discount">
                        <span className="ci-discount-tag">{m.discountPercent}% off</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ci-catalog-footer">
              <span>{isEn ? 'Showing verified models with instant API availability.' : 'Mostrando modelos verificados con disponibilidad inmediata vía API.'}</span>
              <a href={isEn ? '/login?lang=en&mode=register' : '/login?lang=es&mode=register'} className="ci-catalog-footer-link">
                {isEn ? 'Get API Key to start →' : 'Obtener API Key para comenzar →'}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How to Switch Section */}
      <section id="how-it-works" className="ci-switch-section">
        <div className="ci-switch-container">
          <div className="ci-switch-grid">
            <div className="ci-switch-copy">
              <span className="ci-micro-eyebrow">{isEn ? 'HOW TO SWITCH' : 'CÓMO MIGRAR'}</span>
              <h2 className="ci-section-title">
                {isEn ? (
                  <>
                    Change two values.<br />
                    Keep your request format.
                  </>
                ) : (
                  <>
                    Cambiá dos valores.<br />
                    Mantené tu código intacto.
                  </>
                )}
              </h2>
              <p className="ci-section-desc">
                {isEn
                  ? 'Replace your provider base URL and API key. Keep your model, messages, tools, streaming setting, and response handling.'
                  : 'Reemplazá tu Base URL y tu API key. Mantené intactos tus modelos, mensajes, herramientas (function calling), streaming y código existente.'}
              </p>

              <div className="ci-check-list">
                <div className="ci-check-item">
                  <Check size={16} className="ci-check-icon" />
                  <span>{isEn ? '100% OpenAI SDK & Anthropic SDK Compatible' : '100% Compatible con SDKs de OpenAI y Anthropic'}</span>
                </div>
                <div className="ci-check-item">
                  <Check size={16} className="ci-check-icon" />
                  <span>{isEn ? 'Model selected dynamically per request' : 'Selección dinámica de modelos por petición'}</span>
                </div>
                <div className="ci-check-item">
                  <Check size={16} className="ci-check-icon" />
                  <span>{isEn ? 'Real-time usage logs & token metrics' : 'Métricas y consumo en tiempo real por API Key'}</span>
                </div>
                <div className="ci-check-item">
                  <Check size={16} className="ci-check-icon" />
                  <span>{isEn ? 'Prepaid balance in ARS or Crypto (No commitments)' : 'Saldo prepago en ARS (Mercado Pago) o Crypto sin suscripciones'}</span>
                </div>
              </div>
            </div>

            {/* Before / After Visual Terminal */}
            <div className="ci-switch-visual-card">
              <div className="ci-card-top-label">{isEn ? 'ENDPOINT CONFIGURATION' : 'CONFIGURACIÓN DE ENDPOINTS'}</div>
              
              <div className="ci-diff-block before">
                <div className="ci-diff-header">
                  <span className="ci-diff-badge before">BEFORE</span>
                  <span className="ci-diff-title">PROVIDER BASE URL</span>
                </div>
                <div className="ci-diff-code">
                  <code>https://api.openai.com/v1</code>
                </div>
              </div>

              <div className="ci-diff-block after">
                <div className="ci-diff-header">
                  <span className="ci-diff-badge after">AFTER</span>
                  <span className="ci-diff-title">ORBIQEN BASE URL</span>
                </div>
                <div className="ci-diff-code">
                  <code>https://orbiqen.com/v1</code>
                </div>
              </div>

              <div className="ci-visual-footer-bar">
                <span>● OPENAI SDK COMPATIBLE</span>
                <span>● ANTHROPIC COMPATIBLE</span>
                <span>● ZERO LATENCY OVERHEAD</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Snippets Section */}
      <section className="ci-snippets-section">
        <div className="ci-snippets-container">
          <div className="ci-snippets-header">
            <span className="ci-micro-eyebrow">{isEn ? 'QUICK INTEGRATION' : 'INTEGRACIÓN RÁPIDA'}</span>
            <h2 className="ci-section-title">{isEn ? 'Ready in 30 seconds with your favorite tools' : 'Listo en 30 segundos en tu entorno favorito'}</h2>
          </div>

          <div className="ci-snippet-box">
            <div className="ci-snippet-tabs">
              {(Object.keys(CODE_EXAMPLES) as ToolTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`ci-tab-btn ${activeTool === tab ? 'active' : ''}`}
                  onClick={() => setActiveTool(tab)}
                >
                  {CODE_EXAMPLES[tab].title}
                </button>
              ))}
            </div>

            <div className="ci-snippet-terminal">
              <div className="ci-terminal-bar">
                <div className="ci-window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <span className="ci-terminal-filename">{CODE_EXAMPLES[activeTool].filename}</span>
                <button className="ci-copy-btn" onClick={() => copyCode(CODE_EXAMPLES[activeTool].code)}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? (isEn ? 'Copied' : 'Copiado') : (isEn ? 'Copy' : 'Copiar')}</span>
                </button>
              </div>

              <pre className="ci-code-pre">
                <code>{CODE_EXAMPLES[activeTool].code}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Savings Calculator */}
      <section id="calculator" className="ci-calc-section">
        <div className="ci-calc-container">
          <div className="ci-calc-grid">
            <div className="ci-calc-left">
              <span className="ci-micro-eyebrow">{isEn ? 'SAVINGS CALCULATOR' : 'CALCULADORA DE AHORRO'}</span>
              <h2 className="ci-section-title">{isEn ? 'Estimate your monthly savings' : 'Calculá tu ahorro mensual'}</h2>
              <p className="ci-section-desc">
                {isEn
                  ? 'Slide to estimate your volume and compare official list price versus Orbiqen unified rate.'
                  : 'Deslizá para estimar tu volumen mensual de tokens y compará el costo oficial versus la tarifa optimizada de Orbiqen.'}
              </p>

              <div className="ci-slider-wrap">
                <div className="ci-slider-header">
                  <span>{isEn ? 'Monthly Token Volume:' : 'Volumen Mensual de Tokens:'}</span>
                  <strong>{monthlyTokens}M Tokens</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  value={monthlyTokens}
                  onChange={(e) => setMonthlyTokens(Number(e.target.value))}
                  className="ci-range-slider"
                />
                <div className="ci-slider-ticks">
                  <span>5M</span>
                  <span>100M</span>
                  <span>250M</span>
                  <span>500M</span>
                </div>
              </div>
            </div>

            <div className="ci-calc-right">
              <div className="ci-calc-result-card">
                <div className="ci-result-row">
                  <span>{isEn ? 'Official List Price:' : 'Costo Oficial (OpenAI/Anthropic):'}</span>
                  <span className="ci-val-muted">${officialCost} USD/mes</span>
                </div>
                <div className="ci-result-row highlight">
                  <span>{isEn ? 'With Orbiqen Gateway:' : 'Con Orbiqen Gateway:'}</span>
                  <span className="ci-val-green">${orbiqenCost} USD/mes</span>
                </div>

                <div className="ci-result-divider" />

                <div className="ci-savings-highlight">
                  <div className="ci-savings-tag">{savingsPercent}% DE AHORRO</div>
                  <div className="ci-savings-amount">
                    <span>Ahorrás</span>
                    <strong>${monthlySavings} USD</strong>
                    <small>/ mes</small>
                  </div>
                </div>

                <a href={isEn ? '/login?lang=en&mode=register' : '/login?lang=es&mode=register'} className="ci-btn-calc-cta">
                  {isEn ? 'START SAVING NOW' : 'EMPEZAR A AHORRAR AHORA'}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Windows 1-Click Auto Assistant Section */}
      <section className="ci-windows-section">
        <div className="ci-windows-container">
          <div className="ci-windows-card">
            <div className="ci-windows-content">
              <div className="ci-windows-tag">ASISTENTE WINDOWS EN 1-CLIC</div>
              <h3 className="ci-windows-title">{isEn ? 'Configure Codex & Claude on Windows in 10s' : 'Configurá Codex y Claude en Windows en 10s'}</h3>
              <p className="ci-windows-desc">
                {isEn
                  ? 'Download our automated script. It checks your authorized models in real time, creates secure configuration backups, and hooks Cursor, Codex, and Claude instantly.'
                  : 'Descargá nuestro script automatizado activar-orbiqen.bat. Valida tus modelos en vivo, crea un respaldo seguro de tus configuraciones y deja listos Codex y Claude sin tocar código.'}
              </p>
              <a href="/downloads/orbiqen-windows/Orbiqen-Windows.zip" download className="ci-btn-windows-download">
                <Download size={16} />
                <span>Descargar Asistente Windows (.zip)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="ci-faq-section">
        <div className="ci-faq-container">
          <h2 className="ci-section-title text-center">{isEn ? 'Frequently asked questions' : 'Preguntas frecuentes'}</h2>

          <div className="ci-faq-list">
            {FAQS.map((faq, index) => (
              <div key={index} className={`ci-faq-item ${openFaq === index ? 'open' : ''}`}>
                <button className="ci-faq-question" onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                  <span>{faq.q}</span>
                  <ChevronDown size={18} className="ci-faq-chevron" />
                </button>
                {openFaq === index && (
                  <div className="ci-faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Big Bottom CTA */}
      <section className="ci-bottom-cta-section">
        <div className="ci-bottom-cta-container">
          <span className="ci-micro-eyebrow">{isEn ? 'READY TO SWITCH?' : '¿LISTO PARA EMPEZAR?'}</span>
          <h2 className="ci-bottom-title">{isEn ? 'Cut your AI inference costs today' : 'Reducí tus costos de IA hoy mismo'}</h2>
          <p className="ci-bottom-subtitle">
            {isEn
              ? 'No subscription required. Top up balance with Mercado Pago or Crypto and start building in minutes.'
              : 'Sin suscripciones obligatorias. Cargá saldo con Mercado Pago o Crypto y empezá a programar en minutos.'}
          </p>
          <a href={isEn ? '/login?lang=en&mode=register' : '/login?lang=es&mode=register'} className="ci-btn-bottom-cta">
            <span>{isEn ? 'GET YOUR API KEY' : 'CREAR CUENTA Y OBTENER API KEY'}</span>
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="ci-footer">
        <div className="ci-footer-container">
          <div className="ci-footer-brand">
            <div className="ci-brand-logo small">
              <Sparkles size={14} className="ci-brand-icon" />
            </div>
            <strong>Orbiqen</strong>
            <span>— Gateway de IA de Alta Eficiencia y Bajo Costo</span>
          </div>

          <div className="ci-footer-links">
            <a href={isEn ? '/en/pricing' : '/precios'}>{isEn ? 'Pricing' : 'Precios'}</a>
            <a href={isEn ? '/en/docs' : '/docs'}>{isEn ? 'Docs' : 'Documentación'}</a>
            <a href={isEn ? '/login?lang=en' : '/login?lang=es'}>{isEn ? 'Sign in' : 'Ingresar'}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
