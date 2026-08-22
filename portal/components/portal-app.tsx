'use client'

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bitcoin,
  BrainCircuit,
  BookOpen,
  Bot,
  CalendarRange,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clipboard,
  Code2,
  Copy,
  Cpu,
  CreditCard,
  Clock3,
  Download,
  Eye,
  EyeOff,
  Gauge,
  Image as ImageIcon,
  Filter,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Mic2,
  Pencil,
  Plus,
  RadioTower,
  ReceiptText,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  TrendingUp,
  Users,
  WalletCards,
  Zap,
  Play,
  X,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { PublicLanguageSwitch } from './public-nav'
import { MODEL_CATALOG } from '@/lib/catalog'

type View = 'overview' | 'usage' | 'status' | 'keys' | 'models' | 'wallet' | 'setup' | 'admin'
type PaymentReturn = 'success' | 'pending' | 'failure'
type PaymentMethod = 'mercadopago' | 'crypto2328'
const MINIMUM_CRYPTO_PAYMENT_USD = 1
type ChannelWindow = {
  days: number
  availability: number
  requests: number
  tokens: number
  costUsd: number
  lastSeen: number
  history: number[]
}
type ChannelStatus = {
  id: string
  label: string
  accent: 'green' | 'coral' | 'blue'
  provider: 'OpenAI'
  modelId: string
  group: string
  status: 'Operational' | 'Degraded' | 'Inactive'
  endpointPingMs: number
  dialogLatencyMs: number
  windows: Record<'7' | '15' | '30', ChannelWindow>
}
type LiveProbe = {
  model: string
  ok: boolean
  status: 'Operational' | 'Degraded'
  statusCode: number
  endpointPingMs: number
  dialogLatencyMs: number
  message: string
  checkedAt: number
}
type User = {
  id?: number
  username: string
  display_name?: string
  role?: number
  status?: number
  quota: number
  used_quota: number
  request_count: number
  group: string
}
type ApiKey = {
  id: number
  name: string
  key: string
  status: number
  remain_quota: number
  used_quota: number
  created_time: number
  accessed_time: number
  model_limits: string
  group: string
}
type UsageLog = {
  id: number
  created_at: number
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  token_name: string
  use_time?: number
  type?: number
  ip?: string
  channel_name?: string
  content?: string
  other?: string | Record<string, unknown>
}
type ModelPrice = {
  id: string
  label: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  accent: 'green' | 'coral' | 'blue'
}
type SalesGroup = {
  id: number
  code: string
  label_es: string
  label_en: string
  description_es: string
  description_en: string
  note_es: string
  note_en: string
  model_family: 'chatgpt' | 'claude' | 'all'
  price_multiplier: number
  published: boolean
  sort_order: number
}
type DashboardData = {
  user: User
  keys: ApiKey[]
  logs: UsageLog[]
  logTotal: number
  models: ModelPrice[]
  keyModels: ModelPrice[]
  salesGroups: SalesGroup[]
  channels: ChannelStatus[]
  statusWindows: number[]
  statusLastCheckedAt: number
  groups: Record<string, { desc: string; ratio: number | string }>
  quotaPerUsd: number
  gatewayUrl: string
}

type UsageResponse = {
  user: User
  logs: UsageLog[]
  quotaPerUsd: number
  gatewayUrl: string
}

type AdminMetricRow = {
  requests: number
  tokens: number
  revenueUsd: number
  costUsd: number
  profitUsd: number
}

type AdminCustomer = {
  username: string
  displayName: string
  group: string
  status: number
  balanceUsd: number
  requests: number
  tokens: number
  revenueUsd: number
  costUsd: number
  errors: number
}

type AdminResponse = {
  range: string
  rangeDays: number
  generatedAt: number
  config: { upstreamFactor: number; paymentFeeRate: number; providerCostIsEstimate: boolean }
  totals: {
    customers: number
    activeCustomers: number
    requests: number
    errors: number
    totalTokens: number
    revenueUsd: number
    costUsd: number
    paymentFeesUsd: number
    netProfitUsd: number
    creditedUsd: number
  }
  customers: AdminCustomer[]
  modelControls: Array<{ modelId: string; label: string; group: 'clientes' | 'claude'; enabled: boolean }>
  providerProfiles: ProviderProfile[]
  providerGroups: string[]
  salesGroups: SalesGroup[]
  models: Array<AdminMetricRow & { model: string }>
  keys: Array<AdminMetricRow & { key: string; username: string }>
  suspicious: Array<AdminCustomer & { reason: string }>
  truncated: boolean
}

type ProviderProfile = {
  id: number
  name: string
  description: string
  base_url: string
  target_groups: string[]
  price_multiplier: number
  enabled: boolean
  active: boolean
  created_at: number
  updated_at: number
  last_activated_at: number | null
  keyConfigured: boolean
  maskedKey: string
}

type ProviderModelValidation = {
  models: string[]
  knownModels: string[]
  unknownModels: string[]
}

type RedeemCodeRow = {
  id: number
  code: string
  amount_usd: string
  created_at: string
  redeemed_at: string | null
  status: 'active' | 'processing' | 'redeemed' | 'disabled'
  redeemed_by: number | null
  note: string | null
}

type UsageMeta = {
  reasoning_effort?: string
  request_path?: string
  billing_source?: string
  billing_mode?: string
  cache_ratio?: number
  cache_tokens?: number
  cache_creation_tokens?: number
  frt?: number
  stream_status?: { status?: string; end_reason?: string }
  model_ratio?: number
  group_ratio?: number
  user_group_ratio?: number
}

function BrandLogo({ light = false }: { light?: boolean }) {
  return <span className={`brand-logo${light ? ' brand-logo-light' : ''}`}><img src="/orbiqen-logo.png" alt="Orbiqen" /></span>
}

type PortalLocale = 'es' | 'en'

function tr(locale: PortalLocale, spanish: string, english: string) {
  return locale === 'en' ? english : spanish
}

function getNavItems(locale: PortalLocale): Array<{ id: View; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }> {
  return [
    { id: 'overview', label: tr(locale, 'Resumen', 'Overview'), icon: LayoutDashboard },
    { id: 'usage', label: 'Usage', icon: BarChart3 },
    { id: 'status', label: tr(locale, 'Estado', 'Status'), icon: Server },
    { id: 'keys', label: 'API Keys', icon: KeyRound },
    { id: 'models', label: tr(locale, 'Modelos', 'Models'), icon: Sparkles },
    { id: 'wallet', label: tr(locale, 'Saldo', 'Balance'), icon: WalletCards },
    { id: 'setup', label: tr(locale, 'Conectar', 'Connect'), icon: Code2 },
    { id: 'admin', label: tr(locale, 'Administración', 'Administration'), icon: Users, adminOnly: true },
  ]
}

function getViewTitles(locale: PortalLocale): Record<View, { title: string; subtitle: string }> {
  return {
    overview: { title: tr(locale, 'Resumen', 'Overview'), subtitle: tr(locale, 'Tu actividad y saldo en un solo lugar', 'Your activity and balance in one place') },
    usage: { title: 'Usage Records', subtitle: tr(locale, 'Uso real por cliente y por modelo', 'Real usage by customer and model') },
    status: { title: 'Channel Status', subtitle: tr(locale, 'Estado y actividad de tus canales comerciales', 'Status and activity across your commercial channels') },
    keys: { title: 'API Keys', subtitle: tr(locale, 'Credenciales para tus aplicaciones', 'Credentials for your applications') },
    models: { title: tr(locale, 'Modelos', 'Models'), subtitle: tr(locale, 'Precios finales por millón de tokens', 'Final prices per million tokens') },
    wallet: { title: tr(locale, 'Saldo', 'Balance'), subtitle: tr(locale, 'Crédito disponible para tus consumos', 'Credit available for your usage') },
    setup: { title: tr(locale, 'Conectar', 'Connect'), subtitle: tr(locale, 'Configuración lista para tu entorno', 'Setup ready for your environment') },
    admin: { title: tr(locale, 'Administración', 'Administration'), subtitle: tr(locale, 'Clientes, costos y rentabilidad del gateway', 'Customers, costs and gateway profitability') },
  }
}

function PortalLanguageToggle({ locale, onChange }: { locale: PortalLocale; onChange: (locale: PortalLocale) => void }) {
  return <div className="portal-language-toggle" aria-label="Language"><button type="button" className={locale === 'es' ? 'active' : ''} onClick={() => onChange('es')}>ES</button><span>/</span><button type="button" className={locale === 'en' ? 'active' : ''} onClick={() => onChange('en')}>EN</button></div>
}

function money(value: number, digits = 2) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function tokenPrice(value: number) {
  return money(value, value < 0.1 ? 4 : value < 1 ? 3 : 2)
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)
}

function formatDate(timestamp: number) {
  if (!timestamp) return 'Sin uso'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000))
}

function formatDuration(ms: number) {
  if (!ms || ms < 1000) return `${Math.max(0, Math.round(ms || 0))} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  return `${minutes}m ${String(remaining).padStart(2, '0')}s`
}

function parseUsageMeta(log: UsageLog): UsageMeta {
  const raw = log.other
  if (!raw) return {}
  if (typeof raw === 'object') return raw as UsageMeta
  try {
    return JSON.parse(raw) as UsageMeta
  } catch {
    return {}
  }
}

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.success === false) throw new Error(body.message || 'No se pudo completar la operación.')
  return body
}

function AuthScreen({ onAuthenticated, initialMode = 'login', locale = 'es', onChangeLocale }: { onAuthenticated: () => void; initialMode?: 'login' | 'register'; locale?: 'es' | 'en'; onChangeLocale?: (loc: 'es' | 'en') => void }) {
  const [currentLocale, setCurrentLocale] = useState<'es' | 'en'>(locale)
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    setCurrentLocale(locale)
  }, [locale])

  function handleLocaleChange(next: 'es' | 'en') {
    setCurrentLocale(next)
    if (onChangeLocale) onChangeLocale(next)
    try {
      window.localStorage.setItem('orbiqen-portal-locale', next)
      const url = new URL(window.location.href)
      url.searchParams.set('lang', next)
      window.history.replaceState({}, '', url.toString())
    } catch {
      // ignore
    }
  }

  const english = currentLocale === 'en'
  const copy = english ? {
    welcome: 'WELCOME BACK', newAccount: 'GET STARTED FREE', loginTitle: 'Sign in to your dashboard', registerTitle: 'Create developer account',
    username: 'Username', usernamePlaceholder: 'your_username', email: 'Email address', emailPlaceholder: 'you@yourcompany.com',
    verification: 'Verification code', sendCode: 'Send code', resend: 'Resend', password: 'Password', passwordPlaceholder: 'At least 8 characters',
    sent: 'Code sent. Check your inbox and spam folder.', signIn: 'Sign In to Dashboard', create: 'Create Account & Get API Key', createNew: "Don't have an account? Create one for free", already: 'Already have an account? Sign in',
    heroTitle: <>Save up to <mark className="auth-highlight">90%</mark><br />on AI Models.</>,
    heroText: 'Access GPT-5.5, Claude Opus 4.8 & Sonnet 5 with one unified endpoint. Prepaid balance in ARS or Crypto.',
    backHome: '← Back to Home',
  } : {
    welcome: 'BIENVENIDO DE VUELTA', newAccount: 'EMPEZÁ CON CRÉDITO GRATIS', loginTitle: 'Iniciá sesión en tu panel', registerTitle: 'Creá tu cuenta de desarrollador',
    username: 'Usuario', usernamePlaceholder: 'tu_usuario', email: 'Correo electrónico', emailPlaceholder: 'vos@tuempresa.com',
    verification: 'Código de verificación', sendCode: 'Enviar código', resend: 'Reenviar', password: 'Contraseña', passwordPlaceholder: 'Mínimo 8 caracteres',
    sent: 'Código enviado. Revisá también la carpeta de spam.', signIn: 'Ingresar al Panel', create: 'Crear Cuenta y Obtener Clave API', createNew: '¿No tenés cuenta? Creá una gratis acá', already: '¿Ya tenés una cuenta? Ingresá acá',
    heroTitle: <>Ahorrá hasta un <mark className="auth-highlight">90%</mark><br />en Modelos de IA.</>,
    heroText: 'Accedé a GPT-5.5, Claude Opus 4.8 y Sonnet 5 con un único endpoint. Recargá con Mercado Pago o Cripto.',
    backHome: '← Volver al Inicio',
  }

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  async function sendVerificationCode() {
    setSendingCode(true)
    setError('')
    try {
      await readJson(await fetch('/api/auth/verification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      }))
      setCodeSent(true)
      setCooldown(60)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo enviar el código.')
    } finally {
      setSendingCode(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'register') {
        await readJson(await fetch('/api/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, email, verificationCode }),
        }))
      }
      await readJson(await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
      }))
      onAuthenticated()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo ingresar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand-top">
          <a href={english ? '/en' : '/es'} className="brand brand-light" style={{ textDecoration: 'none' }}>
            <BrandLogo light />
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="auth-language-switch">
              <button type="button" className={!english ? 'active' : ''} onClick={() => handleLocaleChange('es')}>ES</button>
              <span>/</span>
              <button type="button" className={english ? 'active' : ''} onClick={() => handleLocaleChange('en')}>EN</button>
            </div>
            <a href={english ? '/en' : '/es'} className="auth-back-link">
              {copy.backHome}
            </a>
          </div>
        </div>

        <div className="auth-brand-content">
          <div className="auth-pill-badge">
            <span className="auth-pulse-dot" />
            <span>{english ? 'ZERO DATA RETENTION • LATENCY < 35MS' : 'ZERO DATA RETENTION • LATENCIA < 35MS'}</span>
          </div>

          <h1 className="auth-hero-headline">{copy.heroTitle}</h1>
          <p className="auth-hero-subtext">{copy.heroText}</p>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><Zap size={16} /></div>
              <div>
                <strong>Claude Opus 4.8 &amp; GPT-5.5</strong>
                <span>{english ? 'Instant access via API & OpenAI SDK' : 'Acceso inmediato vía API y SDK estándar'}</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon"><WalletCards size={16} /></div>
              <div>
                <strong>{english ? 'Mercado Pago & Crypto' : 'Mercado Pago & Criptomonedas'}</strong>
                <span>{english ? 'Top up instantly in ARS or USDT without subscriptions' : 'Recargas prepagas en Pesos (ARS) o Cripto sin costos fijos'}</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon"><ShieldCheck size={16} /></div>
              <div>
                <strong>{english ? '100% Drop-in Compatible' : '100% Compatible con Cursor & Claude'}</strong>
                <span>{english ? 'Connect Cursor, Codex CLI or Python in 10s' : 'Conectá tu editor en 10 segundos con asistente automático'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-proof">
          <Server size={15} />
          <span>Base URL: <code>https://orbiqen.com/v1</code></span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-top-nav">
          <a href={english ? '/en' : '/es'} className="auth-mobile-back-btn">
            {copy.backHome}
          </a>
          <div className="auth-mobile-brand brand">
            <BrandLogo light />
          </div>
          <div className="auth-language-switch">
            <button type="button" className={!english ? 'active' : ''} onClick={() => handleLocaleChange('es')}>ES</button>
            <span>/</span>
            <button type="button" className={english ? 'active' : ''} onClick={() => handleLocaleChange('en')}>EN</button>
          </div>
        </div>

        <div className="auth-form-card">
          <div className="auth-mode-pill-selector">
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setCodeSent(false); }}
            >
              {english ? 'Sign In' : 'Iniciar Sesión'}
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); setCodeSent(false); }}
            >
              {english ? 'Create Account' : 'Crear Cuenta'}
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <div className="auth-form-header">
              <p className="eyebrow">{mode === 'login' ? copy.welcome : copy.newAccount}</p>
              <h2 className="auth-form-title">{mode === 'login' ? copy.loginTitle : copy.registerTitle}</h2>
            </div>

            <label className="auth-field-label">
              <span>{copy.username}</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder={copy.usernamePlaceholder}
                className="auth-input-clean"
                required
              />
            </label>

            {mode === 'register' && (
              <>
                <label className="auth-field-label">
                  <span>{copy.email}</span>
                  <input
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); setCodeSent(false); setCooldown(0) }}
                    type="email"
                    autoComplete="email"
                    placeholder={copy.emailPlaceholder}
                    className="auth-input-clean"
                    required
                  />
                </label>
                <label className="auth-field-label">
                  <span>{copy.verification}</span>
                  <div className="auth-verification-row">
                    <input
                      value={verificationCode}
                      onChange={(event) => setVerificationCode(event.target.value.replace(/[^a-fA-F0-9]/g, '').toLowerCase().slice(0, 6))}
                      inputMode="text"
                      autoComplete="one-time-code"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={6}
                      placeholder="a1b2c3"
                      pattern="[a-fA-F0-9]{6}"
                      className="auth-input-clean verification-input"
                      required
                    />
                    <button
                      className="auth-verification-btn"
                      type="button"
                      onClick={sendVerificationCode}
                      disabled={sendingCode || cooldown > 0 || !email}
                    >
                      {sendingCode ? <LoaderCircle className="spin" size={16} /> : <Mail size={16} />}
                      <span>{cooldown > 0 ? `${cooldown}s` : codeSent ? copy.resend : copy.sendCode}</span>
                    </button>
                  </div>
                </label>
                {codeSent && <p className="auth-form-success">{copy.sent}</p>}
              </>
            )}

            <label className="auth-field-label">
              <span>{copy.password}</span>
              <div className="auth-password-wrapper">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={visible ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={copy.passwordPlaceholder}
                  className="auth-input-clean password-input"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && <div className="auth-form-error">{error}</div>}

            <button className="auth-submit-btn" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={18} />}
              <span>{mode === 'login' ? copy.signIn : copy.create}</span>
            </button>

            <button
              className="auth-mode-toggle-link"
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setCodeSent(false); setCooldown(0) }}
            >
              {mode === 'login' ? copy.createNew : copy.already}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value, hint, icon: Icon, tone, action, onAction }: { label: string; value: string; hint: string; icon: typeof Activity; tone: string; action?: string; onAction?: () => void }) {
  return (
    <article className={`stat-card tone-${tone}`} onClick={onAction} style={{ cursor: onAction ? 'pointer' : 'default' }}>
      <div className="stat-card-top">
        <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
        {action && <span className="stat-action-pill">{action}</span>}
      </div>
      <div className="stat-card-body">
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{hint}</span>
      </div>
    </article>
  )
}

function UsageStat({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: typeof Activity; tone: string }) {
  return (
    <article className="usage-stat">
      <div className={`usage-stat-icon ${tone}`}><Icon size={18} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{hint}</span>
      </div>
    </article>
  )
}

function Overview({ data, setView, locale }: { data: DashboardData; setView: (view: View) => void; locale: PortalLocale }) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const available = data.user.quota / data.quotaPerUsd
  const spent = data.user.used_quota / data.quotaPerUsd
  const activeKeys = data.keys.filter((key) => key.status === 1).length
  const billableLogs = data.logs.filter((log) => Boolean(log.model_name) && Boolean(log.token_name) && (((log.prompt_tokens || 0) + (log.completion_tokens || 0)) > 0 || (log.quota || 0) > 0))
  const english = locale === 'en'

  const copyEndpoint = () => {
    navigator.clipboard.writeText(data.gatewayUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const availableArs = Math.round(available * 1600).toLocaleString('es-AR')

  return (
    <div className="view-stack">
      {/* 1. Greeting & Quick Actions Header */}
      <section className="overview-greeting-card">
        <div className="overview-greeting-copy">
          <div className="overview-greeting-badge">
            <span className="pulse-dot" />
            <span>{tr(locale, 'Cuenta Activa • Sin costos fijos', 'Active Account • No flat fees')}</span>
          </div>
          <h2>{tr(locale, `Hola, ${data.user.username || 'Desarrollador'} 👋`, `Welcome back, ${data.user.username || 'Developer'} 👋`)}</h2>
          <p>
            {tr(
              locale,
              `Tenés ${money(available, available < 1 ? 4 : 2)} (${availableArs} ARS) disponibles para tus aplicaciones y asistentes de código.`,
              `You have ${money(available, available < 1 ? 4 : 2)} available for your coding assistants and applications.`
            )}
          </p>
        </div>
        <div className="overview-greeting-actions">
          <button className="primary-button" onClick={() => setView('wallet')}>
            <WalletCards size={17} />
            <span>{tr(locale, 'Recargar Saldo', 'Top up Balance')}</span>
          </button>
          <button className="secondary-button" onClick={() => setView('keys')}>
            <KeyRound size={17} />
            <span>{tr(locale, 'Gestionar Keys', 'Manage Keys')}</span>
          </button>
        </div>
      </section>

      {/* 2. Stat Cards Grid */}
      <section className="stats-grid">
        <Stat
          label={tr(locale, 'Saldo disponible', 'Available balance')}
          value={money(available, available < 1 ? 4 : 2)}
          hint={tr(locale, `~${availableArs} ARS al cambio`, 'Prepaid balance')}
          icon={CircleDollarSign}
          tone="green"
          action={tr(locale, '+ Cargar', '+ Top up')}
          onAction={() => setView('wallet')}
        />
        <Stat
          label={tr(locale, 'Consumo histórico', 'Historical usage')}
          value={money(spent, spent < 1 ? 4 : 2)}
          hint={`${data.logTotal} ${tr(locale, 'solicitudes procesadas', 'processed requests')}`}
          icon={Activity}
          tone="coral"
          action={tr(locale, 'Ver logs', 'View logs')}
          onAction={() => setView('usage')}
        />
        <Stat
          label={tr(locale, 'Total solicitudes', 'Total requests')}
          value={compactNumber(data.user.request_count)}
          hint={tr(locale, '100% gateway uptime', '100% gateway uptime')}
          icon={Gauge}
          tone="blue"
        />
        <Stat
          label={tr(locale, 'API Keys activas', 'Active API keys')}
          value={String(activeKeys)}
          hint={`${data.keys.length} ${tr(locale, 'creadas en total', 'created total')}`}
          icon={KeyRound}
          tone="charcoal"
          action={tr(locale, '+ Crear', '+ New key')}
          onAction={() => setView('keys')}
        />
      </section>

      {/* 3. Interactive Endpoint & Quick Launchers Band */}
      <section className="overview-endpoint-card">
        <div className="overview-endpoint-info">
          <div className="overview-endpoint-head">
            <span className="pulse-dot" />
            <strong>{tr(locale, 'Tu Endpoint OpenAI-compatible', 'Your OpenAI-compatible Endpoint')}</strong>
            <span className="endpoint-status-tag">{tr(locale, 'Listo para usar', 'Ready')}</span>
          </div>
          <div className="overview-endpoint-box">
            <code>{data.gatewayUrl}</code>
            <button className={`copy-btn ${copiedUrl ? 'copied' : ''}`} onClick={copyEndpoint} type="button">
              {copiedUrl ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedUrl ? tr(locale, 'Copiado', 'Copied') : tr(locale, 'Copiar', 'Copy')}</span>
            </button>
          </div>
        </div>

        <div className="overview-launchers">
          <span>{tr(locale, 'Conexión rápida:', 'Quick setup:')}</span>
          <div className="launcher-chips">
            <button type="button" onClick={() => setView('setup')} className="launcher-chip">
              <Code2 size={14} />
              <span>Cursor</span>
            </button>
            <button type="button" onClick={() => setView('setup')} className="launcher-chip">
              <Terminal size={14} />
              <span>Claude Code</span>
            </button>
            <button type="button" onClick={() => setView('setup')} className="launcher-chip">
              <Cpu size={14} />
              <span>Python SDK</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Quickstart Guide (Visible especially if user has zero or low consumption) */}
      {data.user.request_count === 0 && (
        <section className="overview-quickstart-card">
          <div className="quickstart-header">
            <div className="landing-eyebrow-badge" style={{ marginBottom: 0 }}>
              <Sparkles size={13} />
              <span>{tr(locale, 'GUÍA RÁPIDA DE INICIO', 'QUICKSTART GUIDE')}</span>
            </div>
            <h3>{tr(locale, 'Empezá a programar con Orbiqen en 3 pasos', 'Start building with Orbiqen in 3 steps')}</h3>
          </div>

          <div className="quickstart-steps-grid">
            <div className="quickstart-step">
              <span className="step-number">1</span>
              <h4>{tr(locale, 'Copiá tu API Key', 'Copy your API Key')}</h4>
              <p>{tr(locale, 'En la pestaña API Keys tenés tu primera clave lista para usar.', 'Go to API Keys tab to reveal and copy your key.')}</p>
              <button className="secondary-button step-btn" onClick={() => setView('keys')}>
                <KeyRound size={14} />
                <span>{tr(locale, 'Ver mis API Keys', 'View API Keys')}</span>
              </button>
            </div>

            <div className="quickstart-step">
              <span className="step-number">2</span>
              <h4>{tr(locale, 'Configurá tu editor', 'Configure your editor')}</h4>
              <p>{tr(locale, 'Pegá la Base URL en Cursor, Windsurf o exportala en Claude Code.', 'Paste Base URL in Cursor, Windsurf, or export for Claude.')}</p>
              <button className="secondary-button step-btn" onClick={() => setView('setup')}>
                <Code2 size={14} />
                <span>{tr(locale, 'Ver guías de conexión', 'View setup guides')}</span>
              </button>
            </div>

            <div className="quickstart-step">
              <span className="step-number">3</span>
              <h4>{tr(locale, 'Recargá cuando quieras', 'Top up anytime')}</h4>
              <p>{tr(locale, 'Cargá saldo prepago con Mercado Pago o Cripto desde $1 USD.', 'Add prepaid balance with Mercado Pago or Crypto from $1.')}</p>
              <button className="primary-button step-btn" onClick={() => setView('wallet')}>
                <WalletCards size={14} />
                <span>{tr(locale, 'Recargar saldo', 'Top up balance')}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 5. Recent Activity Section */}
      <section className="section-block activity-card">
        <div className="section-heading">
          <div>
            <h3>{tr(locale, 'Actividad reciente', 'Recent activity')}</h3>
            <p>{tr(locale, 'Registro en tiempo real de tus solicitudes y consumo de tokens.', 'Real-time log of your requests and token usage.')}</p>
          </div>
          <button className="text-action" onClick={() => setView('usage')}>
            <span>{tr(locale, 'Ver analíticas completas', 'View full analytics')}</span>
            <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="activity-list">
          {billableLogs.length === 0 ? (
            <div className="empty-activity-box">
              <div className="empty-icon"><Activity size={24} /></div>
              <h4>{tr(locale, 'Todavía no hay consumo registrado', 'No requests recorded yet')}</h4>
              <p>{tr(locale, 'Tus llamadas desde Cursor, Claude Code o Python aparecerán acá en tiempo real.', 'Your requests from Cursor, Claude Code, or Python will appear here in real time.')}</p>
              <button className="secondary-button" onClick={() => setView('setup')}>
                <Play size={14} />
                <span>{tr(locale, 'Hacer primera petición', 'Make first request')}</span>
              </button>
            </div>
          ) : (
            billableLogs.slice(0, 8).map((log) => {
              const tokens = (log.prompt_tokens || 0) + (log.completion_tokens || 0)
              const isClaude = log.model_name?.includes('claude')
              return (
                <article className="activity-item" key={log.id}>
                  <span className={`activity-icon ${isClaude ? 'coral' : 'emerald'}`}>
                    <Bot size={17} />
                  </span>
                  <div>
                    <strong>{log.model_name}</strong>
                    <small>{formatDate(log.created_at)} · {log.token_name}</small>
                  </div>
                  <div className="activity-metrics">
                    <span>{compactNumber(tokens)} tokens</span>
                    <strong>{money((log.quota || 0) / data.quotaPerUsd, 6)}</strong>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

function KeyModal({ data, onClose, onCreated, locale }: { data: DashboardData; onClose: () => void; onCreated: (key: string) => void; locale: PortalLocale }) {
  const [name, setName] = useState('cursor-app')
  const [quota, setQuota] = useState(Math.min(10, Math.max(1, Math.floor(data.user.quota / data.quotaPerUsd))))
  const groupOptions = data.salesGroups.map((group) => ({
    id: group.code,
    label: locale === 'en' ? group.label_en : group.label_es,
    description: locale === 'en' ? group.description_en : group.description_es,
    note: locale === 'en' ? group.note_en : group.note_es,
    multiplier: group.price_multiplier,
    matches: (id: string) => group.model_family === 'claude' ? id.includes('claude') : group.model_family === 'chatgpt' ? !id.includes('claude') : true,
  }))
  const [group, setGroup] = useState<string | null>(groupOptions[0]?.id || null)
  const selectedGroup = groupOptions.find((option) => option.id === group) || null
  const groupModels = selectedGroup ? data.keyModels.filter((model) => selectedGroup.matches(model.id)) : []
  const pricedGroupModels = groupModels.filter((model) => model.input > 0 || model.output > 0)
  const groupInputFrom = pricedGroupModels.length > 0 ? Math.min(...pricedGroupModels.map((model) => model.input * (selectedGroup?.multiplier || 1))) : 0
  const groupOutputFrom = pricedGroupModels.length > 0 ? Math.min(...pricedGroupModels.map((model) => model.output * (selectedGroup?.multiplier || 1))) : 0
  const [models, setModels] = useState<string[]>(groupModels.map(m => m.id))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function selectGroup(nextGroup: string) {
    setGroup(nextGroup)
    const nextOption = groupOptions.find((option) => option.id === nextGroup)
    setModels(nextOption ? data.keyModels.filter((model) => nextOption.matches(model.id)).map((model) => model.id) : [])
  }

  function toggleModel(id: string) {
    setModels((current) => current.includes(id) ? current.filter((model) => model !== id) : [...current, id])
  }

  function selectAllModels() {
    setModels(groupModels.map(m => m.id))
  }

  function deselectAllModels() {
    setModels([])
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const body = await readJson(await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quotaUsd: quota, group, models }),
      }))
      onCreated(body.data.key)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (locale === 'en' ? 'Could not create key.' : 'No se pudo crear la clave.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="modal key-modal" onSubmit={create}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="landing-eyebrow-badge" style={{ marginBottom: '4px' }}>
              <span className="pulse-dot" />
              <span>{tr(locale, 'NUEVA CREDENCIAL', 'NEW CREDENTIAL')}</span>
            </div>
            <h3>{tr(locale, 'Crear API Key', 'Create API Key')}</h3>
            <p className="modal-subtitle">{tr(locale, 'Generá una subclave con límite de gasto y modelos permitidos.', 'Create a subkey with spend limit and allowed models.')}</p>
          </div>
          <button type="button" className="icon-button modal-close-btn" onClick={onClose} aria-label={tr(locale, 'Cerrar', 'Close')}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Top Inputs: Name & Quota */}
          <div className="modal-inputs-row">
            <label className="modal-field">
              <span className="field-label">{tr(locale, 'Nombre de la clave', 'Key name')}</span>
              <input
                type="text"
                className="modal-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={50}
                placeholder="ej. cursor-pro, backend-prod..."
                required
              />
              <span className="field-hint">{tr(locale, 'Para identificar dónde la usás', 'To identify where you use it')}</span>
            </label>

            <label className="modal-field">
              <span className="field-label">{tr(locale, 'Límite de saldo (USD)', 'Spend limit (USD)')}</span>
              <div className="input-with-affix">
                <span className="affix">$</span>
                <input
                  type="number"
                  className="modal-input with-affix"
                  min="0.01"
                  step="0.01"
                  value={quota}
                  onChange={(event) => setQuota(Number(event.target.value))}
                  required
                />
              </div>
              <span className="field-hint">{tr(locale, 'Tope máximo de gasto asignado', 'Maximum spending cap')}</span>
            </label>
          </div>

          {/* Section 1: Sales Group Choices */}
          <div className="modal-section">
            <div className="modal-section-title">
              <strong>1. {tr(locale, 'Elegí el grupo de enrutamiento', 'Choose routing group')}</strong>
              <small>{tr(locale, 'Define los canales y multiplicador de precio', 'Defines channels & price multiplier')}</small>
            </div>

            <div className="group-choice-grid">
              {groupOptions.map((option) => {
                const availableModels = data.keyModels.filter((model) => option.matches(model.id))
                const pricedModels = availableModels.filter((model) => model.input > 0 || model.output > 0)
                const inputFrom = pricedModels.length > 0 ? Math.min(...pricedModels.map((model) => model.input * option.multiplier)) : 0
                const outputFrom = pricedModels.length > 0 ? Math.min(...pricedModels.map((model) => model.output * option.multiplier)) : 0
                const available = availableModels.length > 0
                const isSelected = group === option.id

                return (
                  <div
                    className={`group-choice-card ${isSelected ? 'selected' : ''} ${!available ? 'disabled' : ''}`}
                    key={option.id}
                    onClick={() => available && selectGroup(option.id)}
                  >
                    <div className="group-choice-header">
                      <div className="group-choice-name">
                        <span className={`custom-radio ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <span className="custom-radio-dot" />}
                        </span>
                        <strong>{option.label}</strong>
                      </div>
                      <span className="multiplier-badge">{option.multiplier}x</span>
                    </div>

                    <p className="group-choice-desc">{available ? option.note : tr(locale, 'Sin modelos disponibles', 'No models available')}</p>

                    <div className="group-choice-footer">
                      <span className="family-tag">{option.description}</span>
                      <span className="price-tag">
                        In <b>{tokenPrice(inputFrom)}</b> · Out <b>{tokenPrice(outputFrom)}</b>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 2: Model Checklist */}
          {selectedGroup && (
            <div className="modal-section">
              <div className="modal-section-title split">
                <div>
                  <strong>2. {tr(locale, 'Modelos habilitados', 'Allowed models')} ({selectedGroup.label})</strong>
                  <small>{models.length} / {groupModels.length} {tr(locale, 'activos para esta key', 'active for this key')}</small>
                </div>
                <div className="quick-select-btns">
                  <button type="button" onClick={selectAllModels} className="text-btn">
                    {tr(locale, 'Todos', 'All')}
                  </button>
                  <span>·</span>
                  <button type="button" onClick={deselectAllModels} className="text-btn">
                    {tr(locale, 'Ninguno', 'None')}
                  </button>
                </div>
              </div>

              <div className="model-checklist-box">
                {groupModels.map((model) => {
                  const isChecked = models.includes(model.id)
                  return (
                    <div
                      className={`model-check-item ${isChecked ? 'checked' : ''}`}
                      key={model.id}
                      onClick={() => toggleModel(model.id)}
                    >
                      <div className={`custom-checkbox ${isChecked ? 'checked' : ''}`}>
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="model-check-info">
                        <strong>{model.label}</strong>
                        <small>In {tokenPrice(model.input * selectedGroup.multiplier)} · Out {tokenPrice(model.output * selectedGroup.multiplier)}</small>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            {tr(locale, 'Cancelar', 'Cancel')}
          </button>
          <button className="primary-button" disabled={loading || !group || models.length === 0} type="submit">
            {loading ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
            <span>{tr(locale, 'Crear API Key', 'Create API Key')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

function SecretModal({ secret, onClose, locale }: { secret: string; onClose: () => void; locale: PortalLocale }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal secret-modal">
        <div className="modal-header">
          <div>
            <div className="landing-eyebrow-badge" style={{ marginBottom: '4px' }}>
              <Sparkles size={13} />
              <span>{tr(locale, 'CREDENCIAL GENERADA', 'CREDENTIAL READY')}</span>
            </div>
            <h3>{tr(locale, 'Tu API Key está lista', 'Your API Key is Ready')}</h3>
            <p className="modal-subtitle">{tr(locale, 'Copiá tu clave ahora. Podés usarla de inmediato en cualquier editor.', 'Copy your key now. You can use it in any editor.')}</p>
          </div>
          <button className="icon-button modal-close-btn" onClick={onClose} aria-label={tr(locale, 'Cerrar', 'Close')}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="secret-card-display">
            <div className="secret-code-box">
              <code>{secret}</code>
            </div>
            <button className={`primary-button copy-secret-btn ${copied ? 'copied' : ''}`} onClick={copy} type="button">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? tr(locale, '¡Clave Copiada!', 'Key Copied!') : tr(locale, 'Copiar al portapapeles', 'Copy to Clipboard')}</span>
            </button>
          </div>

          <div className="security-notice-card">
            <ShieldCheck size={20} color="#10b981" />
            <div>
              <strong>{tr(locale, 'Protegé tu credencial', 'Protect your credential')}</strong>
              <p>{tr(locale, 'No la compartas públicamente en repositorios ni foros. Podés revocarla o cambiar su límite cuando quieras.', 'Do not share it in public repos. You can revoke it or change its limits anytime.')}</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-button" onClick={onClose}>{tr(locale, 'Entendido, cerrar', 'Got it, close')}</button>
        </div>
      </div>
    </div>
  )
}

type SetupTarget = 'codex' | 'codex-ws' | 'opencode'
type SetupAuthMode = 'compatibility' | 'api-key'
type SetupOs = 'unix' | 'windows'

function codexConfig(base: string, provider: string) {
  return `model_provider = "${provider}"
model = "gpt-5.5"
review_model = "gpt-5.5"
model_reasoning_effort = "xhigh"
disable_response_storage = true
network_access = "enabled"
windows_wsl_setup_acknowledged = true

[model_providers.${provider}]
name = "${provider}"
base_url = "${base}"
wire_api = "responses"
requires_openai_auth = true

[features]
goals = true`
}

function setupFiles(target: SetupTarget, os: SetupOs, base: string, key: string, authMode: SetupAuthMode) {
  const apiKey = key || 'sk-tu-api-key'
  const provider = 'Orbiqen'
  const configPath = os === 'windows' ? '%USERPROFILE%\\.codex\\config.toml' : '~/.codex/config.toml'
  const authPath = os === 'windows' ? '%USERPROFILE%\\.codex\\auth.json' : '~/.codex/auth.json'
  if (target === 'opencode') {
    return [{
      path: os === 'windows' ? '%USERPROFILE%\\.config\\opencode\\opencode.json' : '~/.config/opencode/opencode.json',
      content: JSON.stringify({
        $schema: 'https://opencode.ai/config.json',
        provider: {
          orbiqen: {
            npm: '@ai-sdk/openai-compatible',
            name: 'Orbiqen',
            options: { baseURL: base, apiKey },
            models: { 'gpt-5.5': { name: 'GPT-5.5' } },
          },
        },
        model: 'orbiqen/gpt-5.5',
      }, null, 2),
    }]
  }
  const wireComment = target === 'codex-ws'
    ? '# Configuracion para Codex CLI (WebSocket); conserva wire_api=responses para el gateway compatible'
    : ''
  return [
    { path: configPath, content: `${wireComment ? `${wireComment}\n` : ''}${codexConfig(base, provider)}` },
    { path: authPath, content: JSON.stringify({ OPENAI_API_KEY: apiKey }, null, 2) },
  ]
}

function UseApiKeyModal({ data, keyInfo, onClose, locale }: { data: DashboardData; keyInfo: ApiKey; onClose: () => void; locale: PortalLocale }) {
  const [target, setTarget] = useState<SetupTarget>('codex')
  const [authMode, setAuthMode] = useState<SetupAuthMode>('compatibility')
  const [os, setOs] = useState<SetupOs>('unix')
  const [secret, setSecret] = useState('')
  const [copied, setCopied] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadSecret() {
      try {
        const body = await readJson(await fetch(`/api/keys/${keyInfo.id}/reveal`, { method: 'POST' }))
        if (!cancelled) setSecret(body.data.key)
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : (locale === 'en' ? 'Could not load key.' : 'No se pudo cargar la clave.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadSecret()
    return () => { cancelled = true }
  }, [keyInfo.id, locale])

  const files = setupFiles(target, os, data.gatewayUrl, secret, authMode)
  async function copy(path: string, content: string) {
    await navigator.clipboard.writeText(content)
    setCopied(path)
    setTimeout(() => setCopied(''), 1800)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal setup-modal">
        <div className="modal-header">
          <div>
            <div className="landing-eyebrow-badge" style={{ marginBottom: '4px' }}>
              <Terminal size={13} />
              <span>{tr(locale, 'GUÍA DE CONEXIÓN', 'SETUP GUIDE')}</span>
            </div>
            <h3>{tr(locale, 'Conectar', 'Connect')} · {keyInfo.name}</h3>
            <p className="modal-subtitle">{tr(locale, 'Archivos de configuración listos para copiar y pegar.', 'Ready-to-use configuration files.')}</p>
          </div>
          <button className="icon-button modal-close-btn" onClick={onClose} aria-label={tr(locale, 'Cerrar', 'Close')}><X size={20} /></button>
        </div>

        <div className="modal-body setup-body">
          <div className="setup-controls">
            <div className="setup-segment">
              <span>{tr(locale, 'Cliente', 'Client')}</span>
              <div>
                {([['codex', 'Codex CLI'], ['codex-ws', 'Codex CLI (WS)'], ['opencode', 'OpenCode']] as const).map(([value, label]) => (
                  <button key={value} className={target === value ? 'active' : ''} onClick={() => setTarget(value)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="setup-segment">
              <span>{tr(locale, 'Autenticación', 'Auth')}</span>
              <div>
                {([['compatibility', 'Compatibility'], ['api-key', 'API Key Direct']] as const).map(([value, label]) => (
                  <button key={value} className={authMode === value ? 'active' : ''} onClick={() => setAuthMode(value)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="setup-segment">
              <span>{tr(locale, 'Sistema', 'OS')}</span>
              <div>
                {([['unix', 'macOS / Linux'], ['windows', 'Windows']] as const).map(([value, label]) => (
                  <button key={value} className={os === value ? 'active' : ''} onClick={() => setOs(value)}>{label}</button>
                ))}
              </div>
            </div>
          </div>

          {loading && <div className="setup-loading"><LoaderCircle className="spin" size={19} />{tr(locale, 'Cargando la credencial...', 'Loading key credential...')}</div>}
          {error && <div className="form-error">{error}</div>}

          {!loading && !error && files.map((file) => (
            <section className="setup-file" key={file.path}>
              <div className="setup-file-head">
                <code>{file.path}</code>
                <button className="copy-code" onClick={() => copy(file.path, file.content)}>
                  {copied === file.path ? <Check size={16} /> : <Copy size={16} />}
                  {copied === file.path ? tr(locale, 'Copiado', 'Copied') : tr(locale, 'Copiar', 'Copy')}
                </button>
              </div>
              <pre><code>{file.content}</code></pre>
            </section>
          ))}
        </div>

        <div className="modal-footer">
          <button className="primary-button" onClick={onClose}>{tr(locale, 'Listo', 'Done')}</button>
        </div>
      </div>
    </div>
  )
}

function KeysView({ data, reload, locale }: { data: DashboardData; reload: () => Promise<void>; locale: PortalLocale }) {
  const [creating, setCreating] = useState(false)
  const [secret, setSecret] = useState('')
  const [setupKey, setSetupKey] = useState<ApiKey | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const english = locale === 'en'

  async function reveal(id: number) {
    setBusyId(id); setError('')
    try {
      const body = await readJson(await fetch(`/api/keys/${id}/reveal`, { method: 'POST' }))
      setSecret(body.data.key)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (english ? 'Could not reveal key.' : 'No se pudo revelar la clave.'))
    } finally {
      setBusyId(null)
    }
  }

  async function copyKey(key: ApiKey) {
    setBusyId(key.id); setError('')
    try {
      const body = await readJson(await fetch(`/api/keys/${key.id}/reveal`, { method: 'POST' }))
      await navigator.clipboard.writeText(body.data.key)
      setCopiedKeyId(key.id)
      setTimeout(() => setCopiedKeyId(null), 2000)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (english ? 'Could not copy key.' : 'No se pudo copiar la clave.'))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id: number) {
    if (!confirm(tr(locale, '¿Eliminar esta API Key? Las aplicaciones que la usen dejarán de funcionar.', 'Delete this API Key? Applications using it will stop working.'))) return
    setBusyId(id); setError('')
    try {
      await readJson(await fetch(`/api/keys/${id}`, { method: 'DELETE' }))
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (english ? 'Could not delete key.' : 'No se pudo eliminar la clave.'))
    } finally {
      setBusyId(null)
    }
  }

  async function changeGroup(id: number, group: string) {
    setBusyId(id); setError('')
    try {
      await readJson(await fetch(`/api/keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group }),
      }))
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (english ? 'Could not update key group.' : 'No se pudo cambiar el grupo de la clave.'))
    } finally {
      setBusyId(null)
    }
  }

  const activeCount = data.keys.filter((key) => key.status === 1).length

  return (
    <div className="view-stack">
      {/* 1. Hero Card */}
      <section className="keys-hero-card">
        <div>
          <div className="landing-eyebrow-badge" style={{ marginBottom: '8px' }}>
            <span className="pulse-dot" />
            <span>{tr(locale, 'SUBCLAVES AISLADAS Y SEGURIDAD', 'ISOLATED SUBKEYS & SECURITY')}</span>
          </div>
          <h2>{tr(locale, 'API Keys y Credenciales de Acceso', 'API Keys & Access Credentials')}</h2>
          <p>
            {tr(
              locale,
              'Generá subclaves con límites de gasto y modelos específicos para Cursor, Windsurf, Claude Code o tus scripts.',
              'Generate subkeys with custom spending limits and allowed models for Cursor, Claude Code, or production servers.'
            )}
          </p>
        </div>
        <div className="keys-hero-meta">
          <div>
            <KeyRound size={18} color="#10b981" />
            <div>
              <strong>{activeCount} {tr(locale, 'Activas', 'Active')}</strong>
              <small>{data.keys.length} {tr(locale, 'en total', 'total created')}</small>
            </div>
          </div>
          <div>
            <ShieldCheck size={18} color="#06b6d4" />
            <div>
              <strong>AES-256</strong>
              <small>{tr(locale, 'Cifrado seguro', 'Encrypted')}</small>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Toolbar */}
      <div className="keys-toolbar">
        <div className="keys-count-badge">
          <span className="status-dot active" />
          <span>{activeCount} {tr(locale, 'claves operativas', 'active keys')}</span>
        </div>
        <button className="primary-button" onClick={() => setCreating(true)}>
          <Plus size={18} />
          <span>{tr(locale, 'Crear API Key', 'Create API Key')}</span>
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* 3. Table Card */}
      <section className="keys-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tr(locale, 'Nombre', 'Name')}</th>
                <th>{tr(locale, 'Credencial', 'Credential')}</th>
                <th>{tr(locale, 'Grupo comercial', 'Sales Group')}</th>
                <th>{tr(locale, 'Modelos', 'Models')}</th>
                <th>{tr(locale, 'Saldo asignado', 'Quota Limit')}</th>
                <th>{tr(locale, 'Último acceso', 'Last used')}</th>
                <th className="right">{tr(locale, 'Acciones', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.keys.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-row" style={{ padding: '40px 0' }}>
                      <KeyRound size={24} />
                      <div>
                        <strong>{tr(locale, 'No tenés ninguna API Key creada', 'No API Keys created yet')}</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                          {tr(locale, 'Creá tu primera credencial para conectar Cursor o Claude Code.', 'Create your first credential to connect Cursor or Claude.')}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                data.keys.map((key) => (
                  <tr key={key.id}>
                    <td>
                      <div className="key-title-cell">
                        <span className="key-name">
                          <span className={`status-dot ${key.status === 1 ? 'active' : ''}`} />
                          {key.name}
                        </span>
                        <span className="key-created-at">{tr(locale, 'Creada', 'Created')} {formatDate(key.created_time)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="masked-key-box">
                        <code>{key.key}</code>
                        <button
                          className={`copy-btn ${copiedKeyId === key.id ? 'copied' : ''}`}
                          style={{ position: 'static', padding: '3px 8px' }}
                          onClick={() => copyKey(key)}
                          disabled={busyId === key.id}
                          type="button"
                          title={tr(locale, 'Copiar clave', 'Copy key')}
                        >
                          {copiedKeyId === key.id ? <Check size={13} /> : <Copy size={13} />}
                          <span style={{ fontSize: '11px' }}>{copiedKeyId === key.id ? tr(locale, 'Copiado', 'Copied') : tr(locale, 'Copiar', 'Copy')}</span>
                        </button>
                      </div>
                    </td>
                    <td>
                      <select
                        className="key-group-select"
                        value={key.group || ''}
                        disabled={busyId === key.id}
                        onChange={(event) => changeGroup(key.id, event.target.value)}
                      >
                        {data.salesGroups.map((group) => (
                          <option key={group.code} value={group.code}>
                            {locale === 'en' ? group.label_en : group.label_es} ({group.price_multiplier}x)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className="model-count-pill">
                        <Cpu size={13} />
                        <span>{key.model_limits ? `${key.model_limits.split(',').length} ${tr(locale, 'modelos', 'models')}` : tr(locale, 'Todos', 'All')}</span>
                      </span>
                    </td>
                    <td>
                      <strong>{money(key.remain_quota / data.quotaPerUsd, 2)}</strong>
                    </td>
                    <td>
                      <small style={{ color: '#64748b' }}>{key.accessed_time ? formatDate(key.accessed_time) : tr(locale, 'Nunca', 'Never')}</small>
                    </td>
                    <td className="right">
                      <div className="key-action-btns">
                        <button className="secondary-button key-use-btn" onClick={() => setSetupKey(key)}>
                          <Terminal size={14} />
                          <span>{tr(locale, 'Conectar', 'Connect')}</span>
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => reveal(key.id)}
                          disabled={busyId === key.id}
                          aria-label={tr(locale, 'Revelar clave', 'Reveal key')}
                          title={tr(locale, 'Revelar clave', 'Reveal key')}
                        >
                          {busyId === key.id ? <LoaderCircle className="spin" size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          className="icon-button icon-btn-danger"
                          onClick={() => remove(key.id)}
                          disabled={busyId === key.id}
                          aria-label={tr(locale, 'Eliminar clave', 'Delete key')}
                          title={tr(locale, 'Eliminar clave', 'Delete key')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {creating && (
        <KeyModal
          data={data}
          locale={locale}
          onClose={() => setCreating(false)}
          onCreated={async (key) => {
            setCreating(false)
            setSecret(key)
            await reload()
          }}
        />
      )}

      {secret && <SecretModal secret={secret} locale={locale} onClose={() => setSecret('')} />}

      {setupKey && <UseApiKeyModal data={data} locale={locale} keyInfo={setupKey} onClose={() => setSetupKey(null)} />}
    </div>
  )
}

type UsageRange = '24h' | '7d' | '30d'
type UsageGranularity = 'hour' | 'day'

type UsageBucket = {
  label: string
  requests: number
  tokens: number
  cost: number
  durationMs: number
}

function bucketLabel(timestamp: number, granularity: UsageGranularity) {
  const date = new Date(timestamp * 1000)
  if (granularity === 'hour') {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', hour: '2-digit' }).format(date)
  }
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(date)
}

function rangeFloor(range: UsageRange) {
  const now = Math.floor(Date.now() / 1000)
  if (range === '24h') return now - 24 * 3600
  if (range === '7d') return now - 7 * 24 * 3600
  return now - 30 * 24 * 3600
}

function buildBuckets(logs: UsageLog[], granularity: UsageGranularity): UsageBucket[] {
  const map = new Map<string, UsageBucket>()
  for (const log of logs.slice().sort((a, b) => a.created_at - b.created_at)) {
    const label = bucketLabel(log.created_at, granularity)
    const entry = map.get(label) || { label, requests: 0, tokens: 0, cost: 0, durationMs: 0 }
    entry.requests += 1
    entry.tokens += (log.prompt_tokens || 0) + (log.completion_tokens || 0)
    entry.cost += log.quota || 0
    entry.durationMs += log.use_time || 0
    map.set(label, entry)
  }
  return Array.from(map.values())
}

function buildBreakdown(logs: UsageLog[], quotaPerUsd: number, type: 'model' | 'key') {
  const map = new Map<string, { label: string; requests: number; tokens: number; cost: number }>()
  for (const log of logs) {
    const rawLabel = type === 'model' ? (log.model_name || 'N/D') : (log.token_name || 'Sin nombre')
    const entry = map.get(rawLabel) || { label: rawLabel, requests: 0, tokens: 0, cost: 0 }
    entry.requests += 1
    entry.tokens += (log.prompt_tokens || 0) + (log.completion_tokens || 0)
    entry.cost += (log.quota || 0) / quotaPerUsd
    map.set(rawLabel, entry)
  }
  return Array.from(map.values()).sort((a, b) => b.requests - a.requests || b.cost - a.cost)
}

function Donut({ items, total, tone, locale }: { items: Array<{ label: string; value: number; color: string }>; total: string; tone: string; locale: PortalLocale }) {
  const size = 180
  const stroke = 28
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className={`usage-donut ${tone}`}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gráfico de distribución">
        <circle cx={size / 2} cy={size / 2} r={radius} className="usage-donut-track" />
        {items.map((item) => {
          const dash = Math.max(4, (item.value / 100) * circumference)
          const circle = (
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className="usage-donut-segment"
              stroke={item.color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          )
          offset += dash
          return circle
        })}
      </svg>
      <div className="usage-donut-label">
        <strong>{total}</strong>
        <span>{tr(locale, 'selección activa', 'active selection')}</span>
      </div>
    </div>
  )
}

function UsageView({ data, locale }: { data: DashboardData; locale: PortalLocale }) {
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState<UsageRange>('7d')
  const [granularity, setGranularity] = useState<UsageGranularity>('day')
  const english = locale === 'en'

  useEffect(() => {
    let alive = true
    async function loadUsage() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/usage', { cache: 'no-store' })
        if (response.status === 401) {
          setError(english ? 'Session expired.' : 'La sesión expiró.')
          return
        }
        const body = await readJson(response)
        if (alive) setUsage(body.data)
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : (english ? 'Could not load usage data.' : 'No se pudo cargar el uso real.'))
      } finally {
        if (alive) setLoading(false)
      }
    }
    void loadUsage()
    return () => { alive = false }
  }, [english])

  const quotaPerUsd = usage?.quotaPerUsd || data.quotaPerUsd
  const logs = (usage?.logs || []).filter((log) => Boolean(log.model_name?.trim()) && Boolean(log.token_name?.trim()) && (((log.prompt_tokens || 0) + (log.completion_tokens || 0)) > 0 || (log.quota || 0) > 0))
  const filtered = useMemo(() => {
    const floor = rangeFloor(range)
    return logs.filter((log) => log.created_at >= floor).sort((a, b) => b.created_at - a.created_at)
  }, [logs, range])
  const totalRequests = filtered.length
  const totalPrompt = filtered.reduce((sum, log) => sum + (log.prompt_tokens || 0), 0)
  const totalCompletion = filtered.reduce((sum, log) => sum + (log.completion_tokens || 0), 0)
  const totalTokens = totalPrompt + totalCompletion
  const totalCost = filtered.reduce((sum, log) => sum + ((log.quota || 0) / quotaPerUsd), 0)
  const avgDuration = filtered.length ? filtered.reduce((sum, log) => sum + (log.use_time || 0), 0) / filtered.length : 0
  const buckets = useMemo(() => buildBuckets(filtered, granularity), [filtered, granularity])
  const modelBreakdown = useMemo(() => buildBreakdown(filtered, quotaPerUsd, 'model').slice(0, 6), [filtered, quotaPerUsd])
  const keyBreakdown = useMemo(() => buildBreakdown(filtered, quotaPerUsd, 'key').slice(0, 6), [filtered, quotaPerUsd])
  const totalModelRequests = modelBreakdown.reduce((sum, item) => sum + item.requests, 0) || 1
  const totalKeyRequests = keyBreakdown.reduce((sum, item) => sum + item.requests, 0) || 1

  const series = buckets.map((bucket) => ({ label: bucket.label, requests: bucket.requests }))
  const seriesMax = Math.max(1, ...series.map((bucket) => bucket.requests))

  const detailedRows = useMemo(() => filtered.map((log) => {
    const meta = parseUsageMeta(log) as Record<string, unknown>
    const originalCost = ((log.quota || 0) / quotaPerUsd)
    const rateMultiplier = 1.0
    const billedCost = originalCost * rateMultiplier
    return {
      id: log.id,
      time: log.created_at,
      apiKey: log.token_name || 'default',
      model: log.model_name || 'unknown',
      reasoning: meta.reasoning_mode ? String(meta.reasoning_mode) : '-',
      endpoint: '/v1/chat/completions',
      ip: log.ip || '127.0.0.1',
      type: meta.stream ? 'stream' : 'sync',
      billingMode: 'prepaid',
      inputTokens: log.prompt_tokens || 0,
      outputTokens: log.completion_tokens || 0,
      cacheReadTokens: Number(meta.cache_read_tokens || 0),
      cacheCreationTokens: Number(meta.cache_creation_tokens || 0),
      rateMultiplier,
      billedCost,
      originalCost,
      firstTokenMs: Number(meta.first_token_time || 0),
      durationMs: log.use_time || 0,
    }
  }), [filtered, quotaPerUsd])

  function exportCsv() {
    const headers = [
      'timestamp', 'time_iso', 'api_key', 'model', 'reasoning', 'endpoint', 'ip', 'stream_type', 'billing_mode',
      'input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_creation_tokens', 'rate_multiplier',
      'billed_cost_usd', 'original_cost_usd', 'first_token_ms', 'duration_ms',
    ]
    const rows = [
      headers.join(','),
      ...detailedRows.map((row) => [
        row.time,
        new Date(row.time * 1000).toISOString(),
        row.apiKey,
        row.model,
        row.reasoning,
        row.endpoint,
        row.ip,
        row.type,
        row.billingMode,
        row.inputTokens,
        row.outputTokens,
        row.cacheReadTokens,
        row.cacheCreationTokens,
        row.rateMultiplier.toFixed(4),
        row.billedCost.toFixed(8),
        row.originalCost.toFixed(8),
        row.firstTokenMs || '',
        row.durationMs || '',
      ].map(csvEscape).join(',')),
    ]
    const suffix = range === '24h' ? '24h' : range === '7d' ? '7d' : '30d'
    downloadText(`usage_${suffix}.csv`, `${rows.join('\n')}\n`)
  }

  const totalCostArs = Math.round(totalCost * 1600).toLocaleString('es-AR')

  return (
    <div className="usage-page">
      {/* Hero */}
      <section className="usage-hero">
        <div>
          <div className="landing-eyebrow-badge" style={{ marginBottom: '8px' }}>
            <span className="pulse-dot" />
            <span>{tr(locale, 'MÉTRICAS Y REGISTROS EN TIEMPO REAL', 'REAL-TIME USAGE & LOGS')}</span>
          </div>
          <h2>{tr(locale, 'Analíticas de Consumo y Tokens', 'Usage Analytics & Token Logs')}</h2>
          <span>{tr(locale, 'Monitoreo detallado de consumo por modelo, claves de API, costo en tiempo real y latencia.', 'Detailed breakdown of requests, token distribution, real-time cost, and latency.')}</span>
        </div>
        <div className="usage-hero-meta">
          <div>
            <small>{tr(locale, 'Cuenta', 'Account')}</small>
            <strong>{usage?.user.display_name || usage?.user.username || data.user.username}</strong>
          </div>
          <div>
            <small>{tr(locale, 'Ventana', 'Window')}</small>
            <strong>{range === '24h' ? tr(locale, '24 horas', '24 hours') : range === '7d' ? tr(locale, '7 días', '7 days') : tr(locale, '30 días', '30 days')}</strong>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="usage-toolbar">
        <div className="usage-controls">
          <label>
            <CalendarRange size={16} />
            <select value={range} onChange={(event) => setRange(event.target.value as UsageRange)}>
              <option value="24h">{tr(locale, 'Últimas 24 horas', 'Last 24 hours')}</option>
              <option value="7d">{tr(locale, 'Últimos 7 días', 'Last 7 days')}</option>
              <option value="30d">{tr(locale, 'Últimos 30 días', 'Last 30 days')}</option>
            </select>
          </label>
          <label>
            <Filter size={16} />
            <select value={granularity} onChange={(event) => setGranularity(event.target.value as UsageGranularity)}>
              <option value="hour">{tr(locale, 'Por hora', 'By hour')}</option>
              <option value="day">{tr(locale, 'Por día', 'By day')}</option>
            </select>
          </label>
        </div>
        <div className="usage-toolbar-actions">
          <div className="usage-toolbar-note">
            <Clock3 size={16} />
            <span>{tr(locale, 'Actualización en vivo', 'Live data syncing')}</span>
          </div>
          <button className="secondary-button" onClick={exportCsv}>
            <Clipboard size={16} />
            <span>{tr(locale, 'Exportar CSV', 'Export CSV')}</span>
          </button>
        </div>
      </section>

      {loading && (
        <section className="usage-skeleton">
          <LoaderCircle className="spin" size={28} />
          <span>{tr(locale, 'Sincronizando registros de uso...', 'Loading real-time usage data...')}</span>
        </section>
      )}

      {error && <div className="form-error">{error}</div>}

      {!loading && !error && (
        <>
          {/* Stats Grid */}
          <section className="usage-stats-grid">
            <UsageStat
              label={tr(locale, 'Total solicitudes', 'Total requests')}
              value={compactNumber(totalRequests)}
              hint={tr(locale, 'Peticiones en rango', 'Requests in range')}
              icon={Activity}
              tone="blue"
            />
            <UsageStat
              label={tr(locale, 'Total tokens', 'Total tokens')}
              value={compactNumber(totalTokens)}
              hint={`In: ${compactNumber(totalPrompt)} / Out: ${compactNumber(totalCompletion)}`}
              icon={Gauge}
              tone="green"
            />
            <UsageStat
              label={tr(locale, 'Costo total', 'Total cost')}
              value={money(totalCost, totalCost < 1 ? 4 : 2)}
              hint={tr(locale, `~${totalCostArs} ARS consumidos`, 'Actual user cost')}
              icon={CircleDollarSign}
              tone="coral"
            />
            <UsageStat
              label={tr(locale, 'Latencia promedio', 'Avg duration')}
              value={formatDuration(avgDuration)}
              hint={tr(locale, 'Tiempo medio de respuesta', 'Average response time')}
              icon={Clock3}
              tone="violet"
            />
          </section>

          {/* Charts Grid */}
          <section className="usage-chart-grid">
            <article className="usage-panel">
              <div className="usage-panel-head">
                <div>
                  <p>{tr(locale, 'DISTRIBUCIÓN DE MODELOS', 'MODEL DISTRIBUTION')}</p>
                  <h3>{tr(locale, 'Por solicitudes', 'By requests')}</h3>
                </div>
                <span>Top {modelBreakdown.length}</span>
              </div>
              <div className="usage-panel-body split">
                <Donut
                  locale={locale}
                  tone="blue"
                  total={compactNumber(totalRequests)}
                  items={modelBreakdown.map((item, index) => ({
                    label: item.label,
                    value: (item.requests / totalModelRequests) * 100,
                    color: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][index % 6],
                  }))}
                />
                <div className="usage-list">
                  {modelBreakdown.length === 0 ? (
                    <div className="empty-row" style={{ fontSize: '12px' }}>
                      <Bot size={16} /> {tr(locale, 'Sin datos de modelos en este rango', 'No model data in this range')}
                    </div>
                  ) : (
                    modelBreakdown.map((item, index) => (
                      <div className="usage-list-row" key={item.label}>
                        <div>
                          <strong>{item.label}</strong>
                          <small>{compactNumber(item.tokens)} tokens</small>
                        </div>
                        <div>
                          <span>{compactNumber(item.requests)} req</span>
                          <small>{money(item.cost, 4)}</small>
                        </div>
                        <i style={{ background: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][index % 6] }} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>

            <article className="usage-panel">
              <div className="usage-panel-head">
                <div>
                  <p>{tr(locale, 'DISTRIBUCIÓN POR CLAVES', 'GROUP USAGE DISTRIBUTION')}</p>
                  <h3>{tr(locale, 'Por API Keys', 'By API Keys')}</h3>
                </div>
                <span>Top {keyBreakdown.length}</span>
              </div>
              <div className="usage-panel-body split">
                <Donut
                  locale={locale}
                  tone="green"
                  total={money(totalCost, 2)}
                  items={keyBreakdown.map((item, index) => ({
                    label: item.label,
                    value: (item.requests / totalKeyRequests) * 100,
                    color: ['#10b981', '#34d399', '#06b6d4', '#3b82f6', '#f59e0b', '#ef4444'][index % 6],
                  }))}
                />
                <div className="usage-list">
                  {keyBreakdown.length === 0 ? (
                    <div className="empty-row" style={{ fontSize: '12px' }}>
                      <KeyRound size={16} /> {tr(locale, 'Sin datos de claves en este rango', 'No key data in this range')}
                    </div>
                  ) : (
                    keyBreakdown.map((item, index) => (
                      <div className="usage-list-row" key={item.label}>
                        <div>
                          <strong>{item.label}</strong>
                          <small>{compactNumber(item.tokens)} tokens</small>
                        </div>
                        <div>
                          <span>{compactNumber(item.requests)} req</span>
                          <small>{money(item.cost, 4)}</small>
                        </div>
                        <i style={{ background: ['#10b981', '#34d399', '#06b6d4', '#3b82f6', '#f59e0b', '#ef4444'][index % 6] }} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>
          </section>

          {/* Activity Trend Graph */}
          <section className="usage-panel usage-graph-panel">
            <div className="usage-panel-head">
              <div>
                <p>{tr(locale, 'TENDENCIA DE ACTIVIDAD', 'ACTIVITY TREND')}</p>
                <h3>{tr(locale, 'Peticiones en el tiempo', 'Requests over time')}</h3>
              </div>
              <span>{series.length} {tr(locale, 'puntos', 'points')}</span>
            </div>
            <div className="usage-bars">
              {series.length === 0 || series.every(s => s.requests === 0) ? (
                <div className="empty-row" style={{ width: '100%', height: '120px' }}>
                  <Activity size={18} /> {tr(locale, 'Sin actividad registrada en este período', 'No activity in this range')}
                </div>
              ) : (
                series.map((bucket) => (
                  <div className="usage-bar-item" key={`${bucket.label}-${bucket.requests}`}>
                    <div className="usage-bar-track">
                      <span style={{ height: `${Math.max(8, (bucket.requests / seriesMax) * 100)}%` }} />
                    </div>
                    <strong>{bucket.requests}</strong>
                    <small>{bucket.label}</small>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Detailed Logs Table */}
          <section className="usage-table-card">
            <div className="usage-panel-head">
              <div>
                <p>{tr(locale, 'REGISTRO DETALLADO', 'DETAILED LOGS')}</p>
                <h3>{tr(locale, 'Peticiones Recientes', 'Recent Requests')}</h3>
              </div>
              <span>{filtered.length} {tr(locale, 'en pantalla', 'shown')}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{tr(locale, 'Hora', 'Time')}</th>
                    <th>{tr(locale, 'API Key', 'API Key')}</th>
                    <th>{tr(locale, 'Modelo', 'Model')}</th>
                    <th>{tr(locale, 'Tipo', 'Type')}</th>
                    <th>{tr(locale, 'Prompt In', 'Prompt In')}</th>
                    <th>{tr(locale, 'Comp Out', 'Comp Out')}</th>
                    <th>{tr(locale, 'Caché Read', 'Cache Read')}</th>
                    <th>{tr(locale, 'Latencia', 'Latency')}</th>
                    <th>{tr(locale, 'Duración', 'Duration')}</th>
                    <th className="right">{tr(locale, 'Costo USD', 'Cost USD')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedRows.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <div className="empty-row" style={{ padding: '30px 0' }}>
                          <Activity size={18} />
                          {tr(locale, 'No hay peticiones registradas para este rango de fechas', 'No records found for this date range')}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    detailedRows.map((row) => (
                      <tr key={row.id}>
                        <td>{new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.time * 1000))}</td>
                        <td><code>{row.apiKey}</code></td>
                        <td><span className="usage-model">{row.model}</span></td>
                        <td><span className="info-chip" style={{ fontSize: '11px', padding: '2px 6px' }}>{row.type}</span></td>
                        <td>{compactNumber(row.inputTokens)}</td>
                        <td>{compactNumber(row.outputTokens)}</td>
                        <td>{compactNumber(row.cacheReadTokens)}</td>
                        <td>{row.firstTokenMs ? `${Math.round(row.firstTokenMs)} ms` : '-'}</td>
                        <td>{formatDuration(row.durationMs || 0)}</td>
                        <td className="right strong">{money(row.billedCost, 6)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

const PROVIDER_GROUP_META: Record<string, { labelEs: string; labelEn: string; descriptionEs: string; descriptionEn: string }> = {
  clientes: {
    labelEs: 'ChatGPT económico',
    labelEn: 'Economy ChatGPT',
    descriptionEs: 'Grupo 0.1 · Menor precio',
    descriptionEn: 'Group 0.1 · Lowest price',
  },
  clientes_025: {
    labelEs: 'ChatGPT estable',
    labelEn: 'Stable ChatGPT',
    descriptionEs: 'Grupo 0.25 · Mayor disponibilidad',
    descriptionEn: 'Group 0.25 · Higher availability',
  },
  claude: {
    labelEs: 'Claude',
    labelEn: 'Claude',
    descriptionEs: 'Anthropic · Opus, Sonnet y Haiku',
    descriptionEn: 'Anthropic · Opus, Sonnet and Haiku',
  },
}

type AdminTab = 'metrics' | 'customers' | 'groups' | 'providers' | 'models' | 'vouchers'

function AdminView({ locale }: { locale: PortalLocale }) {
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('metrics')
  const [admin, setAdmin] = useState<AdminResponse | null>(null)
  const [redeemCodes, setRedeemCodes] = useState<RedeemCodeRow[]>([])
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingModel, setSavingModel] = useState('')
  const [redeemCount, setRedeemCount] = useState(1)
  const [redeemAmount, setRedeemAmount] = useState('0.50')
  const [redeemNote, setRedeemNote] = useState('Prueba demo')
  const [creatingRedeem, setCreatingRedeem] = useState(false)
  const [providerEditingId, setProviderEditingId] = useState<number | null>(null)
  const [providerName, setProviderName] = useState('')
  const [providerDescription, setProviderDescription] = useState('')
  const [providerBaseUrl, setProviderBaseUrl] = useState('')
  const [providerApiKey, setProviderApiKey] = useState('')
  const [providerGroups, setProviderGroups] = useState<string[]>(['clientes'])
  const [providerMultiplier, setProviderMultiplier] = useState('1')
  const [savingProvider, setSavingProvider] = useState(false)
  const [providerAction, setProviderAction] = useState<number | 'restore' | null>(null)
  const [validatingProvider, setValidatingProvider] = useState(false)
  const [providerValidation, setProviderValidation] = useState<ProviderModelValidation | null>(null)
  const [groupCode, setGroupCode] = useState('')
  const [groupLabel, setGroupLabel] = useState('')
  const [groupNote, setGroupNote] = useState('')
  const [groupFamily, setGroupFamily] = useState<'chatgpt' | 'claude' | 'all'>('chatgpt')
  const [groupMultiplier, setGroupMultiplier] = useState('1')
  const [groupPublished, setGroupPublished] = useState(true)
  const [savingGroup, setSavingGroup] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [copiedCode, setCopiedCode] = useState<string>('')
  const english = locale === 'en'

  useEffect(() => {
    let alive = true
    async function loadAdmin() {
      setLoading(true)
      setError('')
      try {
        const [body, redeemBody] = await Promise.all([
          readJson(await fetch(`/api/admin?range=${range}`, { cache: 'no-store' })),
          readJson(await fetch('/api/admin/redeem-codes', { cache: 'no-store' })),
        ])
        if (alive) setAdmin(body.data)
        if (alive) setRedeemCodes(redeemBody.data.codes || [])
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el panel administrativo.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void loadAdmin()
    return () => { alive = false }
  }, [range, refreshKey])

  function exportCustomers() {
    if (!admin) return
    const rows = [
      ['Cliente', 'Grupo', 'Estado', 'Saldo USD', 'Requests', 'Tokens', 'Facturado USD', 'Costo estimado USD', 'Errores'],
      ...admin.customers.map((customer) => [
        customer.username,
        customer.group,
        customer.status === 1 ? 'Activo' : 'Bloqueado',
        customer.balanceUsd,
        customer.requests,
        customer.tokens,
        customer.revenueUsd,
        customer.costUsd,
        customer.errors,
      ]),
    ]
    downloadText(`admin_clientes_${range}.csv`, `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`)
  }

  async function toggleModel(modelId: string, enabled: boolean) {
    if (!admin) return
    setSavingModel(modelId)
    setError('')
    try {
      const body = await readJson(await fetch('/api/admin/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models: [{ modelId, enabled }] }),
      }))
      setAdmin((current) => current ? {
        ...current,
        modelControls: body.data.map((next: { modelId: string; group: 'clientes' | 'claude'; enabled: boolean }) => ({
          ...next,
          label: current.modelControls.find((model) => model.modelId === next.modelId)?.label || next.modelId,
        })),
      } : current)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el modelo.')
    } finally {
      setSavingModel('')
    }
  }

  async function createRedeemCodes(event: FormEvent) {
    event.preventDefault()
    setCreatingRedeem(true)
    setError('')
    try {
      const body = await readJson(await fetch('/api/admin/redeem-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: Number(redeemAmount), count: redeemCount, note: redeemNote }),
      }))
      setRedeemCodes((current) => [...(body.data.codes || []), ...current])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron crear los códigos.')
    } finally {
      setCreatingRedeem(false)
    }
  }

  function resetProviderForm() {
    setProviderEditingId(null)
    setProviderName('')
    setProviderDescription('')
    setProviderBaseUrl('')
    setProviderApiKey('')
    setProviderGroups(['clientes'])
    setProviderMultiplier('1')
    setProviderValidation(null)
  }

  function editProvider(profile: ProviderProfile) {
    setProviderEditingId(profile.id)
    setProviderName(profile.name)
    setProviderDescription(profile.description)
    setProviderBaseUrl(profile.base_url)
    setProviderApiKey('')
    setProviderGroups(profile.target_groups)
    setProviderMultiplier(String(profile.price_multiplier))
    setProviderValidation(null)
    setActiveAdminTab('providers')
  }

  async function validateProvider() {
    setValidatingProvider(true)
    setError('')
    try {
      const body = await readJson(await fetch('/api/admin/providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: providerEditingId, baseUrl: providerBaseUrl, apiKey: providerApiKey }),
      }))
      setProviderValidation(body.data)
    } catch (cause) {
      setProviderValidation(null)
      setError(cause instanceof Error ? cause.message : 'No se pudo validar el proveedor.')
    } finally {
      setValidatingProvider(false)
    }
  }

  async function saveProvider(event: FormEvent) {
    event.preventDefault()
    setSavingProvider(true)
    setError('')
    try {
      const payload: Record<string, unknown> = {
        name: providerName,
        description: providerDescription,
        baseUrl: providerBaseUrl,
        targetGroups: providerGroups,
        priceMultiplier: Number(providerMultiplier),
      }
      if (providerApiKey.trim() || providerEditingId === null) payload.apiKey = providerApiKey
      const response = await readJson(await fetch('/api/admin/providers', {
        method: providerEditingId === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerEditingId === null ? payload : { ...payload, id: providerEditingId }),
      }))
      setAdmin((current) => current ? {
        ...current,
        providerProfiles: providerEditingId === null ? [response.data, ...current.providerProfiles] : current.providerProfiles.map((profile) => profile.id === providerEditingId ? response.data : profile),
      } : current)
      resetProviderForm()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el perfil.')
    } finally {
      setSavingProvider(false)
    }
  }

  function toggleProviderGroup(group: string) {
    setProviderGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group])
  }

  async function activateProvider(id: number) {
    setProviderAction(id)
    setError('')
    try {
      const response = await readJson(await fetch('/api/admin/providers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'activate', id }) }))
      setRefreshKey((value) => value + 1)
      setError(response.data?.validation?.unknownModels?.length ? `Proveedor aplicado. ${response.data.validation.unknownModels.length} modelos no están todavía en nuestro catálogo y no fueron publicados.` : '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo activar el perfil.')
    } finally {
      setProviderAction(null)
    }
  }

  async function restoreProviders() {
    setProviderAction('restore')
    setError('')
    try {
      await readJson(await fetch('/api/admin/providers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore' }) }))
      setRefreshKey((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo restaurar la configuración.')
    } finally {
      setProviderAction(null)
    }
  }

  function editSalesGroup(group: SalesGroup) {
    setGroupCode(group.code)
    setGroupLabel(locale === 'en' ? group.label_en : group.label_es)
    setGroupNote(locale === 'en' ? group.note_en : group.note_es)
    setGroupFamily(group.model_family)
    setGroupMultiplier(String(group.price_multiplier))
    setGroupPublished(group.published)
    setActiveAdminTab('groups')
  }

  function resetSalesGroupForm() {
    setGroupCode('')
    setGroupLabel('')
    setGroupNote('')
    setGroupFamily('chatgpt')
    setGroupMultiplier('1')
    setGroupPublished(true)
  }

  function prepareProviderForGroup(group: SalesGroup) {
    setProviderEditingId(null)
    setProviderName(`${locale === 'en' ? group.label_en : group.label_es} proveedor`)
    setProviderDescription(locale === 'en' ? group.note_en : group.note_es)
    setProviderBaseUrl('')
    setProviderApiKey('')
    setProviderGroups([group.code])
    setProviderMultiplier(String(group.price_multiplier))
    setProviderValidation(null)
    setActiveAdminTab('providers')
  }

  async function saveSalesGroup(event: FormEvent) {
    event.preventDefault()
    setSavingGroup(true)
    setError('')
    try {
      await readJson(await fetch('/api/admin/sales-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: groupCode,
          labelEs: groupLabel,
          labelEn: groupLabel,
          descriptionEs: groupFamily === 'claude' ? 'Anthropic' : groupFamily === 'chatgpt' ? 'OpenAI compatible' : 'Mixto',
          descriptionEn: groupFamily === 'claude' ? 'Anthropic' : groupFamily === 'chatgpt' ? 'OpenAI compatible' : 'Mixed',
          noteEs: groupNote,
          noteEn: groupNote,
          modelFamily: groupFamily,
          priceMultiplier: Number(groupMultiplier),
          published: groupPublished,
          sortOrder: admin?.salesGroups.find((item) => item.code === groupCode)?.sort_order || 100,
        }),
      }))
      resetSalesGroupForm()
      setRefreshKey((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el grupo.')
    } finally {
      setSavingGroup(false)
    }
  }

  async function removeSalesGroup(code: string) {
    if (!confirm(tr(locale, '¿Ocultar/eliminar este grupo comercial?', 'Hide/delete this sales group?'))) return
    setError('')
    try {
      await readJson(await fetch(`/api/admin/sales-groups?code=${encodeURIComponent(code)}`, { method: 'DELETE' }))
      setRefreshKey((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el grupo.')
    }
  }

  const margin = admin?.totals.revenueUsd
    ? (admin.totals.netProfitUsd / admin.totals.revenueUsd) * 100
    : 0

  const selectableProviderGroups = admin
    ? Array.from(new Set(
      admin.salesGroups.length > 0
        ? admin.salesGroups.map((group) => group.code)
        : ['clientes', 'clientes_025', 'claude']
    ))
    : []

  function salesGroupLabel(code: string) {
    const group = admin?.salesGroups.find((item) => item.code === code)
    if (group) return locale === 'en' ? group.label_en : group.label_es
    const meta = PROVIDER_GROUP_META[code]
    return meta ? tr(locale, meta.labelEs, meta.labelEn) : code
  }

  function salesGroupDescription(code: string) {
    const group = admin?.salesGroups.find((item) => item.code === code)
    if (group) return `${locale === 'en' ? group.description_en : group.description_es}${group.note_es || group.note_en ? ` · ${locale === 'en' ? group.note_en : group.note_es}` : ''}`
    const meta = PROVIDER_GROUP_META[code]
    return meta ? tr(locale, meta.descriptionEs, meta.descriptionEn) : `New API: ${code}`
  }

  function catalogForGroup(group: SalesGroup) {
    return MODEL_CATALOG.filter((model) => group.model_family === 'claude' ? model.id.includes('claude') : group.model_family === 'chatgpt' ? !model.id.includes('claude') : true)
  }

  function groupPriceSummary(group: SalesGroup) {
    const priced = catalogForGroup(group).filter((model) => model.input > 0 || model.output > 0 || model.cacheWrite > 0)
    const minInput = Math.min(...priced.filter((model) => model.input > 0).map((model) => model.input * group.price_multiplier))
    const minOutput = Math.min(...priced.filter((model) => model.output > 0).map((model) => model.output * group.price_multiplier))
    const cacheWrite = Math.min(...priced.filter((model) => model.cacheWrite > 0).map((model) => model.cacheWrite * group.price_multiplier))
    return {
      pricedCount: priced.length,
      input: Number.isFinite(minInput) ? tokenPrice(minInput) : '-',
      output: Number.isFinite(minOutput) ? tokenPrice(minOutput) : '-',
      cache: Number.isFinite(cacheWrite) ? tokenPrice(cacheWrite) : '-',
    }
  }

  async function copyVoucher(code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(''), 2000)
  }

  // Filtered customers
  const filteredCustomers = admin?.customers.filter((c) => {
    return (
      c.username.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.displayName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.group.toLowerCase().includes(customerSearch.toLowerCase())
    )
  }) || []

  return (
    <div className="view-stack admin-view">
      {/* 1. Command Bar & Hero */}
      <section className="admin-hero-card">
        <div className="admin-hero-copy">
          <div className="landing-eyebrow-badge" style={{ marginBottom: '8px' }}>
            <span className="pulse-dot" />
            <span>{tr(locale, 'CENTRO DE CONTROL FINANCIERO & GATEWAY', 'FINANCIAL CONTROL & GATEWAY HUB')}</span>
          </div>
          <h2>{tr(locale, 'Panel de Administración Integral', 'Administration Command Center')}</h2>
          <p>
            {tr(
              locale,
              'Supervisá métricas de rentabilidad, balance de clientes, grupos comerciales y conexiones con proveedores upstream.',
              'Monitor profitability metrics, customer balances, sales groups, and upstream provider connections.'
            )}
          </p>
        </div>

        <div className="admin-hero-controls">
          <label className="admin-range-selector">
            <CalendarRange size={16} color="#94a3b8" />
            <select value={range} onChange={(event) => setRange(event.target.value as typeof range)}>
              <option value="7d">{tr(locale, 'Últimos 7 días', 'Last 7 days')}</option>
              <option value="30d">{tr(locale, 'Últimos 30 días', 'Last 30 days')}</option>
              <option value="90d">{tr(locale, 'Últimos 90 días', 'Last 90 days')}</option>
              <option value="all">{tr(locale, 'Histórico completo', 'All time')}</option>
            </select>
          </label>

          <button
            className="icon-button refresh-admin-btn"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
            title={tr(locale, 'Actualizar datos', 'Refresh data')}
            type="button"
          >
            <RefreshCw className={loading ? 'spin' : ''} size={16} />
          </button>

          <button
            className="secondary-button export-btn"
            onClick={exportCustomers}
            disabled={!admin}
            type="button"
          >
            <Download size={15} />
            <span>CSV</span>
          </button>
        </div>
      </section>

      {error && <div className="form-error">{error}</div>}

      {/* 2. Sub-Navigation Tabs */}
      <section className="admin-subnav-bar">
        {[
          { id: 'metrics', label: tr(locale, 'Finanzas & Rentabilidad', 'Finance & Profitability'), icon: TrendingUp },
          { id: 'customers', label: `${tr(locale, 'Clientes', 'Customers')} (${admin?.customers.length || 0})`, icon: Users },
          { id: 'groups', label: `${tr(locale, 'Grupos & Precios', 'Groups & Pricing')} (${admin?.salesGroups.length || 0})`, icon: KeyRound },
          { id: 'providers', label: `${tr(locale, 'Proveedores Upstream', 'Upstream Providers')} (${admin?.providerProfiles.length || 0})`, icon: Server },
          { id: 'models', label: `${tr(locale, 'Catálogo', 'Catalog')} (${admin?.modelControls.length || 0})`, icon: Sparkles },
          { id: 'vouchers', label: `${tr(locale, 'Códigos Demo', 'Demo Codes')} (${redeemCodes.length})`, icon: ReceiptText },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeAdminTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveAdminTab(tab.id as AdminTab)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </section>

      {loading && !admin && (
        <section className="usage-skeleton">
          <LoaderCircle className="spin" size={26} />
          <span>{tr(locale, 'Cargando métricas administrativas...', 'Loading administrative metrics...')}</span>
        </section>
      )}

      {admin && (
        <>
          {/* TAB 1: METRICS & FINANCE */}
          {activeAdminTab === 'metrics' && (
            <div className="admin-tab-pane">
              <section className="admin-stats-grid">
                <UsageStat
                  label={tr(locale, 'Facturado por uso', 'Usage revenue')}
                  value={money(admin.totals.revenueUsd, admin.totals.revenueUsd < 1 ? 4 : 2)}
                  hint={`${compactNumber(admin.totals.requests)} ${tr(locale, 'solicitudes', 'requests')}`}
                  icon={ReceiptText}
                  tone="blue"
                />
                <UsageStat
                  label={tr(locale, 'Costo proveedor', 'Provider cost')}
                  value={money(admin.totals.costUsd, admin.totals.costUsd < 1 ? 4 : 2)}
                  hint={admin.config.providerCostIsEstimate ? `${tr(locale, 'Estimado al', 'Estimated at')} ${(admin.config.upstreamFactor * 100).toFixed(1)}%` : tr(locale, 'Costo conciliado', 'Reconciled cost')}
                  icon={CircleDollarSign}
                  tone="coral"
                />
                <UsageStat
                  label={tr(locale, 'Ganancia neta', 'Net profit')}
                  value={money(admin.totals.netProfitUsd, Math.abs(admin.totals.netProfitUsd) < 1 ? 4 : 2)}
                  hint={`${margin.toFixed(1)}% ${tr(locale, 'de margen', 'margin')}`}
                  icon={TrendingUp}
                  tone="green"
                />
                <UsageStat
                  label={tr(locale, 'Clientes activos', 'Active customers')}
                  value={`${admin.totals.activeCustomers}/${admin.totals.customers}`}
                  hint={`${admin.totals.errors} ${tr(locale, 'errores en el rango', 'errors in range')}`}
                  icon={Users}
                  tone="violet"
                />
              </section>

              <section className="admin-ledger-strip">
                <div>
                  <small>{tr(locale, 'Tokens procesados', 'Processed tokens')}</small>
                  <strong>{compactNumber(admin.totals.totalTokens)}</strong>
                </div>
                <div>
                  <small>{tr(locale, 'Comisiones pasarela', 'Payment gateway fees')}</small>
                  <strong>{money(admin.totals.paymentFeesUsd, 4)}</strong>
                </div>
                <div>
                  <small>{tr(locale, 'Crédito asignado', 'Credited balance')}</small>
                  <strong>{money(admin.totals.creditedUsd, 4)}</strong>
                </div>
                <div>
                  <small>{tr(locale, 'Última conciliación', 'Last reconciled')}</small>
                  <strong>{new Intl.DateTimeFormat(english ? 'en-US' : 'es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(admin.generatedAt))}</strong>
                </div>
              </section>

              {admin.truncated && (
                <div className="admin-warning">
                  <AlertTriangle size={17} />
                  <span>{tr(locale, 'El rango supera 2.000 registros por categoría; las tablas muestran una muestra representativa.', 'The range exceeds 2,000 records per category; tables show a representative sample.')}</span>
                </div>
              )}

              <section className="admin-split-grid">
                <article className="admin-panel">
                  <div className="section-heading">
                    <div>
                      <h3>{tr(locale, 'Modelos más utilizados', 'Most used models')}</h3>
                      <p>{tr(locale, 'Ordenados por volumen de facturación', 'Sorted by billing volume')}</p>
                    </div>
                    <BarChart3 size={18} />
                  </div>
                  <div className="admin-ranking">
                    {admin.models.length === 0 && <div className="empty-row"><BarChart3 size={18} />{tr(locale, 'Sin consumo registrado', 'No usage recorded')}</div>}
                    {admin.models.slice(0, 8).map((model, index) => (
                      <div className="admin-rank-row" key={model.model}>
                        <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>{model.model}</strong>
                          <small>{compactNumber(model.requests)} req · {compactNumber(model.tokens)} tokens</small>
                        </div>
                        <div className="rank-money">
                          <strong>{money(model.revenueUsd, 4)}</strong>
                          <small>{money(model.profitUsd, 4)} {tr(locale, 'margen', 'margin')}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="admin-panel">
                  <div className="section-heading">
                    <div>
                      <h3>{tr(locale, 'Monitoreo de Anomalías & Riesgo', 'Anomaly & Risk Monitoring')}</h3>
                      <p>{tr(locale, 'Detección de errores repetidos o consumo inusual', 'Repeated errors or unusual burst patterns')}</p>
                    </div>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="admin-risk-list">
                    {admin.suspicious.length === 0 ? (
                      <div className="admin-all-clear">
                        <ShieldCheck size={28} color="#10b981" />
                        <strong>{tr(locale, 'Sin alertas críticas', 'No critical alerts')}</strong>
                        <span>{tr(locale, 'Todos los clientes operan dentro de los parámetros esperados.', 'All customers operate within expected parameters.')}</span>
                      </div>
                    ) : (
                      admin.suspicious.map((customer) => (
                        <div className="admin-risk-row" key={customer.username}>
                          <span className="risk-icon"><AlertTriangle size={16} /></span>
                          <div>
                            <strong>{customer.username}</strong>
                            <small>{customer.reason}</small>
                          </div>
                          <span className="risk-req-pill">{compactNumber(customer.requests)} req</span>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              </section>

              {/* API Keys Profitability Table */}
              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <h3>{tr(locale, 'Rentabilidad por API Key', 'Profitability by API Key')}</h3>
                    <p>{tr(locale, 'Facturación, costo estimado y margen bruto por credencial activa', 'Revenue, estimated cost and gross profit per active credential')}</p>
                  </div>
                  <KeyRound size={18} />
                </div>
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>API Key</th>
                        <th>{tr(locale, 'Cliente', 'Customer')}</th>
                        <th>Requests</th>
                        <th>Tokens</th>
                        <th>{tr(locale, 'Facturado', 'Revenue')}</th>
                        <th>{tr(locale, 'Costo est.', 'Est. Cost')}</th>
                        <th className="right">{tr(locale, 'Ganancia bruta', 'Gross Profit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admin.keys.length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <div className="empty-row"><KeyRound size={18} />{tr(locale, 'Sin consumo por API key en el rango', 'No API key usage in range')}</div>
                          </td>
                        </tr>
                      )}
                      {admin.keys.slice(0, 50).map((key) => (
                        <tr key={`${key.username}-${key.key}`}>
                          <td>
                            <span className="key-title">
                              <KeyRound size={15} />
                              <code>{key.key}</code>
                            </span>
                          </td>
                          <td><strong>{key.username}</strong></td>
                          <td>{compactNumber(key.requests)}</td>
                          <td>{compactNumber(key.tokens)}</td>
                          <td>{money(key.revenueUsd, 4)}</td>
                          <td>{money(key.costUsd, 4)}</td>
                          <td className="right profit-cell">{money(key.profitUsd, 4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: CUSTOMERS */}
          {activeAdminTab === 'customers' && (
            <div className="admin-tab-pane">
              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <h3>{tr(locale, 'Clientes Registrados en la Plataforma', 'Registered Customers')}</h3>
                    <p>{tr(locale, 'Control de saldos prepagos, volumen de tráfico y margen individual', 'Prepaid balance tracking, traffic volume and individual margins')}</p>
                  </div>
                  <div className="customer-toolbar-right">
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder={tr(locale, 'Buscar por nombre, usuario o grupo...', 'Search by name, user or group...')}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    <span className="info-chip"><Users size={15} />{filteredCustomers.length} {tr(locale, 'cuentas', 'accounts')}</span>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{tr(locale, 'Cliente', 'Customer')}</th>
                        <th>{tr(locale, 'Grupo', 'Group')}</th>
                        <th>{tr(locale, 'Estado', 'Status')}</th>
                        <th>{tr(locale, 'Saldo USD', 'Balance USD')}</th>
                        <th>Requests</th>
                        <th>Tokens</th>
                        <th>{tr(locale, 'Facturado', 'Revenue')}</th>
                        <th>{tr(locale, 'Costo est.', 'Est. Cost')}</th>
                        <th>{tr(locale, 'Ganancia bruta', 'Gross Profit')}</th>
                        <th className="right">{tr(locale, 'Alertas', 'Alerts')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length === 0 && (
                        <tr>
                          <td colSpan={10}>
                            <div className="empty-row"><Users size={18} />{tr(locale, 'No se encontraron clientes', 'No customers found')}</div>
                          </td>
                        </tr>
                      )}
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.username}>
                          <td>
                            <span className="admin-customer">
                              <span className={`status-dot ${customer.status === 1 ? 'active' : ''}`} />
                              <span>
                                <strong>{customer.displayName || customer.username}</strong>
                                <small>{customer.username}</small>
                              </span>
                            </span>
                          </td>
                          <td><code>{customer.group}</code></td>
                          <td>
                            <span className={`admin-state ${customer.status === 1 ? 'active' : 'blocked'}`}>
                              {customer.status === 1 ? tr(locale, 'Activo', 'Active') : tr(locale, 'Bloqueado', 'Blocked')}
                            </span>
                          </td>
                          <td><strong>{money(customer.balanceUsd, 4)}</strong></td>
                          <td>{compactNumber(customer.requests)}</td>
                          <td>{compactNumber(customer.tokens)}</td>
                          <td>{money(customer.revenueUsd, 4)}</td>
                          <td>{money(customer.costUsd, 4)}</td>
                          <td className="profit-cell">{money(customer.revenueUsd - customer.costUsd, 4)}</td>
                          <td className="right">
                            {customer.errors ? (
                              <span className="risk-badge"><AlertTriangle size={13} />{customer.errors}</span>
                            ) : (
                              <span className="clean-badge">{tr(locale, 'Normal', 'Normal')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: SALES GROUPS & PRICING */}
          {activeAdminTab === 'groups' && (
            <div className="admin-tab-pane">
              <section className="section-block sales-group-section">
                <div className="section-heading">
                  <div>
                    <h3>{tr(locale, 'Grupos Comerciales & Multiplicadores de Cobro', 'Commercial Groups & Pricing Multipliers')}</h3>
                    <p>{tr(locale, 'Configuración de paquetes comerciales y multiplicadores sobre el catálogo base aplicados en New API.', 'Sales group setup and multipliers over base catalog applied in New API.')}</p>
                  </div>
                  <span className="info-chip"><KeyRound size={15} />{admin.salesGroups.filter((group) => group.published).length} {tr(locale, 'publicados', 'published')}</span>
                </div>
                <div className="sales-group-layout">
                  <div className="table-wrap">
                    <table className="admin-table unified-group-table">
                      <thead>
                        <tr>
                          <th>{tr(locale, 'Grupo comercial', 'Sales group')}</th>
                          <th>{tr(locale, 'Multiplicador & Precios', 'Multiplier & Rates')}</th>
                          <th>{tr(locale, 'Proveedor activo', 'Active provider')}</th>
                          <th>Endpoint</th>
                          <th>{tr(locale, 'Estado', 'Status')}</th>
                          <th className="right">{tr(locale, 'Acción', 'Action')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admin.salesGroups.map((group) => {
                          const providers = admin.providerProfiles.filter((profile) => profile.target_groups.includes(group.code))
                          const activeProvider = providers.find((profile) => profile.active) || providers[0]
                          const priceSummary = groupPriceSummary(group)
                          return (
                            <tr key={group.code}>
                              <td>
                                <strong>{locale === 'en' ? group.label_en : group.label_es}</strong>
                                <small>{locale === 'en' ? group.note_en : group.note_es}</small>
                                <code>{group.code}</code>
                              </td>
                              <td>
                                <span className="price-summary">
                                  <strong className="multiplier-tag">{group.price_multiplier}x</strong>
                                  <small>Input {tr(locale, 'desde', 'from')} {priceSummary.input} · Output {priceSummary.output}</small>
                                  <small>Cache {priceSummary.cache} · {priceSummary.pricedCount} {tr(locale, 'modelos', 'models')}</small>
                                </span>
                              </td>
                              <td>
                                {activeProvider ? (
                                  <span className="provider-mini">
                                    <strong>{activeProvider.name}</strong>
                                    <small>{activeProvider.active ? tr(locale, 'Activo', 'Active') : tr(locale, 'Guardado', 'Saved')}</small>
                                  </span>
                                ) : (
                                  <span className="muted-mini">{tr(locale, 'Sin proveedor', 'No provider')}</span>
                                )}
                              </td>
                              <td>
                                {activeProvider ? (
                                  <code>{activeProvider.base_url}</code>
                                ) : (
                                  <button type="button" className="secondary-button" onClick={() => prepareProviderForGroup(group)}>
                                    <Plus size={14} />{tr(locale, 'Conectar', 'Connect')}
                                  </button>
                                )}
                              </td>
                              <td>
                                <span className={`admin-state ${group.published ? 'active' : ''}`}>
                                  {group.published ? tr(locale, 'Publicado', 'Published') : tr(locale, 'Oculto', 'Hidden')}
                                </span>
                              </td>
                              <td className="right">
                                <span className="action-group">
                                  <button type="button" className="secondary-button" onClick={() => editSalesGroup(group)}>
                                    <Pencil size={14} />{tr(locale, 'Editar', 'Edit')}
                                  </button>
                                  <button type="button" className="secondary-button" onClick={() => prepareProviderForGroup(group)}>
                                    <Server size={14} />{tr(locale, 'Conexión', 'Connection')}
                                  </button>
                                  {!['clientes', 'clientes_025', 'claude'].includes(group.code) && (
                                    <button type="button" className="icon-button danger" onClick={() => removeSalesGroup(group.code)}>
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Group Form */}
                  <form className="sales-group-form" onSubmit={saveSalesGroup}>
                    <div className="form-header-box">
                      <strong>{groupCode ? tr(locale, 'Editar Grupo Comercial', 'Edit Sales Group') : tr(locale, 'Crear Nuevo Grupo', 'Create New Group')}</strong>
                      <small>{tr(locale, 'Se sincroniza automáticamente con New API y la base de datos.', 'Syncs automatically with New API and database.')}</small>
                    </div>

                    <label>
                      {tr(locale, 'Código técnico (único)', 'Technical code (unique)')}
                      <input value={groupCode} onChange={(event) => setGroupCode(event.target.value)} placeholder="fastai_02" required />
                    </label>

                    <label>
                      {tr(locale, 'Nombre visible al cliente', 'Customer visible name')}
                      <input value={groupLabel} onChange={(event) => setGroupLabel(event.target.value)} placeholder="FastAI Económico" required />
                    </label>

                    <label>
                      {tr(locale, 'Descripción o subtítulo', 'Short description')}
                      <input value={groupNote} onChange={(event) => setGroupNote(event.target.value)} placeholder="Proveedor alternativo 0.2x" />
                    </label>

                    <label>
                      {tr(locale, 'Familia de modelos', 'Model family')}
                      <select value={groupFamily} onChange={(event) => setGroupFamily(event.target.value as typeof groupFamily)}>
                        <option value="chatgpt">ChatGPT / OpenAI</option>
                        <option value="claude">Claude / Anthropic</option>
                        <option value="all">{tr(locale, 'Todos los modelos', 'All models')}</option>
                      </select>
                    </label>

                    <label>
                      {tr(locale, 'Multiplicador de cobro', 'Billing multiplier')}
                      <input type="number" min="0.001" step="0.001" value={groupMultiplier} onChange={(event) => setGroupMultiplier(event.target.value)} required />
                      <small className="field-help">{tr(locale, '1.0 = Precio base catálogo. 2.5 = 2.5x más.', '1.0 = Base catalog price. 2.5 = 2.5x higher.')}</small>
                    </label>

                    <label className="check-inline">
                      <input type="checkbox" checked={groupPublished} onChange={(event) => setGroupPublished(event.target.checked)} />
                      <span>{tr(locale, 'Publicar y permitir crear claves en este grupo', 'Publish and allow creating keys in this group')}</span>
                    </label>

                    <div className="provider-form-actions">
                      <button className="primary-button" disabled={savingGroup}>
                        {savingGroup ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                        <span>{tr(locale, 'Guardar grupo', 'Save group')}</span>
                      </button>
                      <button type="button" className="secondary-button" onClick={resetSalesGroupForm}>
                        {tr(locale, 'Limpiar formulario', 'Clear form')}
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: UPSTREAM PROVIDERS */}
          {activeAdminTab === 'providers' && (
            <div className="admin-tab-pane">
              <section className="section-block provider-profile-section">
                <div className="section-heading">
                  <div>
                    <h3>{tr(locale, 'Conexiones & Endpoints Upstream', 'Upstream Provider Connections')}</h3>
                    <p>{tr(locale, 'Configurá Base URL y clave madre para cada proveedor. Los precios se controlan en la pestaña Grupos.', 'Configure Base URL and master key for each provider. Pricing is controlled in Groups.')}</p>
                  </div>
                  <span className="info-chip">
                    <Server size={15} />
                    {admin.providerProfiles.filter((profile) => profile.active).length ? tr(locale, 'Respaldo activo', 'Backup active') : tr(locale, 'Principal activo', 'Primary active')}
                  </span>
                </div>

                <div className="provider-profile-layout">
                  <div className="provider-profile-list">
                    {admin.providerProfiles.length === 0 && (
                      <div className="empty-row"><Server size={18} />{tr(locale, 'Todavía no hay perfiles configurados.', 'No provider profiles configured yet.')}</div>
                    )}
                    {admin.providerProfiles.map((profile) => (
                      <article className={`provider-profile-row ${profile.active ? 'active' : ''}`} key={profile.id}>
                        <div className="provider-profile-icon">
                          <Server size={18} />
                        </div>
                        <div className="provider-profile-copy">
                          <strong>{profile.name}</strong>
                          <small>{profile.description || tr(locale, 'Sin descripción', 'No description')}</small>
                          <code>{profile.base_url}</code>
                          <span>{profile.target_groups.map(salesGroupLabel).join(', ')} · {profile.price_multiplier}x · {profile.keyConfigured ? profile.maskedKey : tr(locale, 'Sin key', 'No key')}</span>
                        </div>
                        <div className="provider-profile-actions">
                          <span className={`admin-state ${profile.active ? 'active' : ''}`}>
                            {profile.active ? tr(locale, 'Activo', 'Active') : tr(locale, 'Disponible', 'Available')}
                          </span>
                          <button type="button" className="secondary-button" onClick={() => editProvider(profile)}>
                            <Pencil size={14} />{tr(locale, 'Editar', 'Edit')}
                          </button>
                          <button type="button" className="primary-button" onClick={() => activateProvider(profile.id)} disabled={providerAction === profile.id}>
                            {providerAction === profile.id ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
                            {tr(locale, 'Aplicar', 'Apply')}
                          </button>
                        </div>
                      </article>
                    ))}

                    {admin.providerProfiles.length > 0 && (
                      <button
                        type="button"
                        className="secondary-button provider-restore-button"
                        onClick={restoreProviders}
                        disabled={providerAction === 'restore'}
                      >
                        {providerAction === 'restore' ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}
                        {tr(locale, 'Restaurar configuración anterior', 'Restore previous configuration')}
                      </button>
                    )}
                  </div>

                  <form className="provider-profile-form" onSubmit={saveProvider}>
                    <div className="provider-form-title">
                      <strong>{providerEditingId === null ? tr(locale, 'Nuevo Perfil Upstream', 'New Upstream Profile') : tr(locale, 'Editar Perfil Upstream', 'Edit Upstream Profile')}</strong>
                      <small>{tr(locale, 'Las credenciales quedan cifradas y seguras en el servidor.', 'Credentials stay encrypted and secure on the server.')}</small>
                    </div>

                    <label>
                      {tr(locale, 'Nombre descriptivo', 'Descriptive name')}
                      <input value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder="FastAI 0.2x" required />
                    </label>

                    <label>
                      {tr(locale, 'Descripción / Notas', 'Description / Notes')}
                      <input value={providerDescription} onChange={(event) => setProviderDescription(event.target.value)} placeholder="Proveedor de respaldo con alta concurrencia" />
                    </label>

                    <label>
                      Base URL
                      <input spellCheck={false} value={providerBaseUrl} onChange={(event) => setProviderBaseUrl(event.target.value)} placeholder="https://api.proveedor.com/v1" required />
                    </label>

                    <label>
                      {tr(locale, 'API Key madre (Upstream)', 'Master API Key (Upstream)')}
                      <input type="password" value={providerApiKey} onChange={(event) => setProviderApiKey(event.target.value)} placeholder={providerEditingId === null ? 'sk-...' : tr(locale, 'Dejar vacío para conservarla', 'Leave empty to keep current')} required={providerEditingId === null} />
                    </label>

                    <fieldset className="provider-group-picker">
                      <legend>{tr(locale, '¿Qué grupos de clientes usarán este endpoint?', 'Which customer groups will use this endpoint?')}</legend>
                      <div className="provider-group-options">
                        {selectableProviderGroups.map((group) => (
                          <label className={`provider-group-option ${providerGroups.includes(group) ? 'selected' : ''}`} key={group}>
                            <input type="checkbox" checked={providerGroups.includes(group)} onChange={() => toggleProviderGroup(group)} />
                            <span className="provider-group-check">{providerGroups.includes(group) && <Check size={13} />}</span>
                            <span className="provider-group-copy">
                              <strong>{salesGroupLabel(group)}</strong>
                              <small>{salesGroupDescription(group)}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <label>
                      {tr(locale, 'Multiplicador de costo proveedor', 'Provider cost multiplier')}
                      <input type="number" min="0.001" step="0.001" value={providerMultiplier} onChange={(event) => setProviderMultiplier(event.target.value)} required />
                    </label>

                    {providerValidation && (
                      <div className="provider-validation-result">
                        <div>
                          <Check size={16} color="#10b981" />
                          <strong>{providerValidation.models.length} {tr(locale, 'modelos detectados en el endpoint', 'models detected on endpoint')}</strong>
                        </div>
                        <small>{providerValidation.knownModels.length} {tr(locale, 'coinciden con el catálogo oficial', 'match official catalog')} · {providerValidation.unknownModels.length} {tr(locale, 'nuevos o por revisar', 'new or need review')}</small>
                        <code>{providerValidation.models.slice(0, 10).join(' · ')}{providerValidation.models.length > 10 ? ' · ...' : ''}</code>
                      </div>
                    )}

                    <div className="provider-form-actions">
                      <button type="button" className="secondary-button" onClick={validateProvider} disabled={validatingProvider || !providerBaseUrl.trim() || !providerApiKey.trim()}>
                        {validatingProvider ? <LoaderCircle className="spin" size={16} /> : <RadioTower size={16} />}
                        <span>{tr(locale, 'Validar conexión en vivo', 'Validate live endpoint')}</span>
                      </button>
                      <button type="submit" className="primary-button" disabled={savingProvider}>
                        {savingProvider ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                        <span>{tr(locale, 'Guardar perfil', 'Save profile')}</span>
                      </button>
                      {providerEditingId !== null && (
                        <button type="button" className="secondary-button" onClick={resetProviderForm}>
                          {tr(locale, 'Cancelar', 'Cancel')}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </section>
            </div>
          )}

          {/* TAB 5: MODEL CONTROL */}
          {activeAdminTab === 'models' && (
            <div className="admin-tab-pane">
              <section className="section-block model-control-section">
                <div className="section-heading">
                  <div>
                    <h3>{tr(locale, 'Publicación de Modelos por Grupo', 'Model Publishing per Group')}</h3>
                    <p>{tr(locale, 'Habilitá u ocultá modelos específicos para tus clientes de forma instantánea.', 'Enable or hide specific models for your customers instantly.')}</p>
                  </div>
                  <span className="info-chip">
                    <Sparkles size={15} />
                    {admin.modelControls.filter((model) => model.enabled).length} {tr(locale, 'publicados', 'published')}
                  </span>
                </div>

                <div className="model-control-groups">
                  {(['clientes', 'claude'] as const).map((group) => (
                    <div className="model-control-group" key={group}>
                      <div className="model-control-group-title">
                        <strong>{group === 'claude' ? 'Claude / Anthropic' : 'ChatGPT / OpenAI & Codex'}</strong>
                        <span>{group === 'claude' ? tr(locale, 'Modelos de razonamiento y visión', 'Reasoning & vision models') : tr(locale, 'Modelos GPT, Codex y audio', 'GPT, Codex and audio models')}</span>
                      </div>
                      <div className="model-control-list">
                        {admin.modelControls.filter((model) => model.group === group).map((model) => (
                          <div className="model-control-row" key={model.modelId}>
                            <div>
                              <strong>{model.label}</strong>
                              <code>{model.modelId}</code>
                            </div>
                            <button
                              type="button"
                              className={`model-toggle ${model.enabled ? 'enabled' : ''}`}
                              aria-pressed={model.enabled}
                              onClick={() => toggleModel(model.modelId, !model.enabled)}
                              disabled={savingModel === model.modelId}
                            >
                              {savingModel === model.modelId ? (
                                <LoaderCircle className="spin" size={15} />
                              ) : model.enabled ? (
                                <><Check size={14} />{tr(locale, 'Publicado', 'Published')}</>
                              ) : (
                                tr(locale, 'Oculto', 'Hidden')
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* TAB 6: DEMO VOUCHERS */}
          {activeAdminTab === 'vouchers' && (
            <div className="admin-tab-pane">
              <section className="section-block redeem-admin-section">
                <div className="section-heading">
                  <div>
                    <h3>{tr(locale, 'Generador de Códigos Demo & Cupones', 'Demo Voucher & Promo Code Generator')}</h3>
                    <p>{tr(locale, 'Generá crédito de prueba para adquisición y retención de clientes. Valor sugerido: US$ 0.50 - US$ 1.00.', 'Generate trial credit for customer onboarding and retention. Suggested value: US$ 0.50 - US$ 1.00.')}</p>
                  </div>
                  <span className="info-chip">
                    <ReceiptText size={15} />
                    {redeemCodes.filter((code) => code.status === 'active').length} {tr(locale, 'activos', 'active')}
                  </span>
                </div>

                <form className="redeem-admin-form" onSubmit={createRedeemCodes}>
                  <label>
                    {tr(locale, 'Monto por código (USD)', 'Amount per code (USD)')}
                    <input type="number" min="0.01" max="100" step="0.01" value={redeemAmount} onChange={(event) => setRedeemAmount(event.target.value)} />
                  </label>
                  <label>
                    {tr(locale, 'Cantidad a generar', 'Quantity to generate')}
                    <input type="number" min="1" max="100" step="1" value={redeemCount} onChange={(event) => setRedeemCount(Number(event.target.value))} />
                  </label>
                  <label>
                    {tr(locale, 'Campaña o Nota interna', 'Campaign / Internal note')}
                    <input value={redeemNote} onChange={(event) => setRedeemNote(event.target.value)} placeholder="Campaña Twitter / Cliente VIP" />
                  </label>
                  <button className="primary-button" disabled={creatingRedeem} type="submit">
                    {creatingRedeem ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
                    <span>{tr(locale, 'Generar cupones', 'Generate vouchers')}</span>
                  </button>
                </form>

                <div className="table-wrap">
                  <table className="admin-table redeem-table">
                    <thead>
                      <tr>
                        <th>{tr(locale, 'Código Promocional', 'Promo Code')}</th>
                        <th>{tr(locale, 'Monto', 'Amount')}</th>
                        <th>{tr(locale, 'Estado', 'Status')}</th>
                        <th>{tr(locale, 'Campaña / Nota', 'Campaign / Note')}</th>
                        <th>{tr(locale, 'Fecha Creación', 'Created Date')}</th>
                        <th className="right">{tr(locale, 'Acción', 'Action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redeemCodes.length === 0 && (
                        <tr>
                          <td colSpan={6}>
                            <div className="empty-row"><ReceiptText size={18} />{tr(locale, 'Todavía no hay códigos demo generados', 'No demo codes generated yet')}</div>
                          </td>
                        </tr>
                      )}
                      {redeemCodes.slice(0, 40).map((code) => {
                        const isCopied = copiedCode === code.code
                        return (
                          <tr key={code.id}>
                            <td>
                              <code className="voucher-code-chip">{code.code}</code>
                            </td>
                            <td><strong>{money(Number(code.amount_usd), 2)}</strong></td>
                            <td>
                              <span className={`admin-state ${code.status === 'active' ? 'active' : code.status === 'redeemed' ? 'blocked' : ''}`}>
                                {code.status === 'active' ? tr(locale, 'Disponible', 'Available') : code.status === 'redeemed' ? tr(locale, 'Canjeado', 'Redeemed') : code.status}
                              </span>
                            </td>
                            <td>{code.note || '-'}</td>
                            <td>{formatDate(Number(code.created_at))}</td>
                            <td className="right">
                              <button
                                className={`secondary-button key-use-btn ${isCopied ? 'copied' : ''}`}
                                onClick={() => copyVoucher(code.code)}
                                type="button"
                              >
                                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                <span>{isCopied ? tr(locale, 'Copiado', 'Copied') : tr(locale, 'Copiar', 'Copy')}</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  )
}


function ModelsView({ data, locale }: { data: DashboardData; locale: PortalLocale }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'anthropic' | 'openai' | 'code' | 'audio' | 'reasoning'>('all')
  const [selectedGroupCode, setSelectedGroupCode] = useState<string>(data.salesGroups[0]?.code || 'clientes')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [copiedModelId, setCopiedModelId] = useState<string>('')
  const english = locale === 'en'

  const groupOptions = data.salesGroups.map((group) => ({
    id: group.code,
    label: english ? group.label_en : group.label_es,
    description: english ? group.description_en : group.description_es,
    note: english ? group.note_en : group.note_es,
    multiplier: group.price_multiplier,
    matches: (id: string) => group.model_family === 'claude' ? id.includes('claude') : group.model_family === 'chatgpt' ? !id.includes('claude') : true,
  }))

  const selectedGroup = groupOptions.find((g) => g.id === selectedGroupCode) || groupOptions[0]
  const multiplier = selectedGroup?.multiplier ?? 1.0

  async function copyId(id: string) {
    await navigator.clipboard.writeText(id)
    setCopiedModelId(id)
    setTimeout(() => setCopiedModelId(''), 2000)
  }

  const filteredModels = data.models.filter((model) => {
    const matchesSearch =
      model.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.id.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (selectedFilter === 'anthropic') return model.id.includes('claude')
    if (selectedFilter === 'openai') return !model.id.includes('claude')
    if (selectedFilter === 'code') return model.id.includes('codex') || model.id.includes('code')
    if (selectedFilter === 'audio') return model.id.includes('audio') || model.id.includes('realtime')
    if (selectedFilter === 'reasoning') return model.id.includes('opus') || model.id.includes('sonnet') || model.id.includes('o1') || model.id.includes('o3')

    return true
  })

  return (
    <div className="view-stack models-view">
      {/* 1. Hero Card */}
      <section className="models-hero-card">
        <div className="models-hero-copy">
          <div className="landing-eyebrow-badge" style={{ marginBottom: '8px' }}>
            <span className="pulse-dot" />
            <span>{tr(locale, 'CATÁLOGO OFICIAL DE MODELOS', 'COMMERCIAL MODEL CATALOG')}</span>
          </div>
          <h2>{tr(locale, 'Modelos de IA & Tarifas por Millón de Tokens', 'AI Models & Token Pricing')}</h2>
          <p>
            {tr(
              locale,
              'Precios finales transparentes por millón de tokens (1M tokens). Soporte para Claude 3.7 / 3.5, OpenAI GPT-4o, Codex y Prompt Caching.',
              'Transparent pricing per million tokens (1M tokens). Support for Claude 3.7 / 3.5, OpenAI GPT-4o, Codex, and Prompt Caching.'
            )}
          </p>
        </div>

        <div className="models-hero-group-box">
          <span className="group-box-label">{tr(locale, 'Tarifas según Grupo Comercial:', 'Rates by Commercial Group:')}</span>
          <div className="group-select-wrap">
            <select
              className="models-group-select"
              value={selectedGroupCode}
              onChange={(e) => setSelectedGroupCode(e.target.value)}
            >
              {groupOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label} ({group.multiplier}x)
                </option>
              ))}
            </select>
            <span className="multiplier-badge">{multiplier.toFixed(1)}x</span>
          </div>
          <small>{selectedGroup?.note || tr(locale, 'Precios base aplicados', 'Base pricing applied')}</small>
        </div>
      </section>

      {/* 2. Search, Filter Toolbar & View Mode */}
      <section className="models-toolbar-card">
        <div className="models-search-box">
          <Filter size={16} color="#64748b" />
          <input
            type="text"
            placeholder={tr(locale, 'Buscar modelo por nombre o ID (ej: claude, gpt-4o, codex)...', 'Search model by name or ID (e.g. claude, gpt-4o, codex)...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')} type="button">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="models-filter-pills">
          {[
            { id: 'all', label: tr(locale, 'Todos', 'All') },
            { id: 'anthropic', label: 'Anthropic / Claude' },
            { id: 'openai', label: 'OpenAI / Codex' },
            { id: 'reasoning', label: tr(locale, 'Razonamiento', 'Reasoning') },
            { id: 'code', label: tr(locale, 'Código', 'Code') },
            { id: 'audio', label: 'Audio / Realtime' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              className={`model-filter-pill ${selectedFilter === pill.id ? 'active' : ''}`}
              onClick={() => setSelectedFilter(pill.id as typeof selectedFilter)}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="models-view-toggle">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title={tr(locale, 'Vista en cuadrícula', 'Grid view')}
          >
            <LayoutDashboard size={16} />
            <span>{tr(locale, 'Tarjetas', 'Cards')}</span>
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title={tr(locale, 'Vista en tabla', 'Table view')}
          >
            <BarChart3 size={16} />
            <span>{tr(locale, 'Tabla', 'Table')}</span>
          </button>
        </div>
      </section>

      {/* 3. Grid View */}
      {viewMode === 'grid' && (
        <section className="models-cards-grid">
          {filteredModels.length === 0 ? (
            <div className="models-empty-state">
              <Sparkles size={32} color="#64748b" />
              <h3>{tr(locale, 'No se encontraron modelos', 'No models found')}</h3>
              <p>{tr(locale, 'Probá con otro término de búsqueda o filtro.', 'Try another search term or filter.')}</p>
            </div>
          ) : (
            filteredModels.map((model) => {
              const visual = getModelVisual(model.id)
              const Icon = visual.Icon
              const inputPrice = model.input * multiplier
              const outputPrice = model.output * multiplier
              const cacheReadPrice = model.cacheRead * multiplier
              const cacheWritePrice = model.cacheWrite * multiplier
              const isCopied = copiedModelId === model.id
              const isAnthropic = model.id.includes('claude')

              return (
                <article className={`luxury-model-card ${isAnthropic ? 'provider-anthropic' : 'provider-openai'}`} key={model.id}>
                  {/* Card Header */}
                  <div className="luxury-card-head">
                    <div className="luxury-icon-box">
                      <Icon size={20} />
                    </div>
                    <div className="luxury-model-info">
                      <div className="luxury-title-row">
                        <h3>{model.label}</h3>
                        <span className="available-chip">
                          <Check size={12} />
                          <span>{tr(locale, 'Disponible', 'Available')}</span>
                        </span>
                      </div>
                      <div className="model-id-copy-row">
                        <code>{model.id}</code>
                        <button
                          type="button"
                          className={`copy-id-btn ${isCopied ? 'copied' : ''}`}
                          onClick={() => copyId(model.id)}
                          title={tr(locale, 'Copiar ID para Cursor / scripts', 'Copy ID for Cursor / scripts')}
                        >
                          {isCopied ? <Check size={13} /> : <Copy size={13} />}
                          <span>{isCopied ? tr(locale, '¡Copiado!', 'Copied!') : tr(locale, 'Copiar ID', 'Copy ID')}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Provider & Capability Badges */}
                  <div className="luxury-badges-row">
                    <span className={`provider-tag ${isAnthropic ? 'anthropic' : 'openai'}`}>
                      {isAnthropic ? 'Anthropic' : 'OpenAI'}
                    </span>
                    <span className="capability-tag">{visual.mode}</span>
                    <span className="family-tag">{visual.family}</span>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="luxury-pricing-matrix">
                    <div className="price-matrix-cell">
                      <span className="cell-label">{tr(locale, 'Entrada (Prompt)', 'Input (Prompt)')}</span>
                      <strong className="cell-value">{money(inputPrice, inputPrice < 0.1 ? 4 : 3)}</strong>
                      <small className="cell-sub">/ 1M tokens</small>
                    </div>

                    <div className="price-matrix-cell">
                      <span className="cell-label">{tr(locale, 'Salida (Output)', 'Output')}</span>
                      <strong className="cell-value">{money(outputPrice, outputPrice < 0.1 ? 4 : 3)}</strong>
                      <small className="cell-sub">/ 1M tokens</small>
                    </div>

                    <div className="price-matrix-cell cache-cell">
                      <span className="cell-label">{tr(locale, 'Cache Read', 'Cache Read')}</span>
                      <strong className="cell-value highlight">{money(cacheReadPrice, 5)}</strong>
                      <small className="cell-sub">{tr(locale, 'Ahorro 90%', '90% savings')}</small>
                    </div>

                    <div className="price-matrix-cell cache-cell">
                      <span className="cell-label">{tr(locale, 'Cache Write', 'Cache Write')}</span>
                      <strong className="cell-value">
                        {cacheWritePrice > 0 ? money(cacheWritePrice, 5) : '-'}
                      </strong>
                      <small className="cell-sub">/ 1M tokens</small>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      )}

      {/* 4. Table View */}
      {viewMode === 'table' && (
        <section className="models-table-card">
          <div className="table-wrap">
            <table className="admin-table models-table">
              <thead>
                <tr>
                  <th>{tr(locale, 'Modelo', 'Model')}</th>
                  <th>{tr(locale, 'ID de API', 'API ID')}</th>
                  <th>{tr(locale, 'Proveedor', 'Provider')}</th>
                  <th>{tr(locale, 'Entrada / 1M', 'Input / 1M')}</th>
                  <th>{tr(locale, 'Salida / 1M', 'Output / 1M')}</th>
                  <th>{tr(locale, 'Cache Read', 'Cache Read')}</th>
                  <th>{tr(locale, 'Cache Write', 'Cache Write')}</th>
                  <th className="right">{tr(locale, 'Acción', 'Action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model) => {
                  const inputPrice = model.input * multiplier
                  const outputPrice = model.output * multiplier
                  const cacheReadPrice = model.cacheRead * multiplier
                  const cacheWritePrice = model.cacheWrite * multiplier
                  const isCopied = copiedModelId === model.id
                  const isAnthropic = model.id.includes('claude')

                  return (
                    <tr key={model.id}>
                      <td>
                        <strong>{model.label}</strong>
                      </td>
                      <td>
                        <code className="table-code">{model.id}</code>
                      </td>
                      <td>
                        <span className={`provider-tag-mini ${isAnthropic ? 'anthropic' : 'openai'}`}>
                          {isAnthropic ? 'Anthropic' : 'OpenAI'}
                        </span>
                      </td>
                      <td>{money(inputPrice, inputPrice < 0.1 ? 4 : 3)}</td>
                      <td>{money(outputPrice, outputPrice < 0.1 ? 4 : 3)}</td>
                      <td className="profit-cell">{money(cacheReadPrice, 5)}</td>
                      <td>{cacheWritePrice > 0 ? money(cacheWritePrice, 5) : '-'}</td>
                      <td className="right">
                        <button
                          type="button"
                          className={`secondary-button table-copy-btn ${isCopied ? 'copied' : ''}`}
                          onClick={() => copyId(model.id)}
                        >
                          {isCopied ? <Check size={13} /> : <Copy size={13} />}
                          <span>{isCopied ? tr(locale, 'Copiado', 'Copied') : tr(locale, 'Copiar', 'Copy')}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}


function getModelVisual(modelId: string) {
  if (modelId.includes('claude')) return { Icon: BrainCircuit, family: 'Claude', mode: 'Reasoning' }
  if (modelId.includes('image')) return { Icon: ImageIcon, family: 'Image', mode: 'Vision' }
  if (modelId.includes('audio')) return { Icon: Mic2, family: 'Audio', mode: 'Voice' }
  if (modelId.includes('realtime')) return { Icon: RadioTower, family: 'Realtime', mode: 'Stream' }
  if (modelId.includes('codex')) return { Icon: Code2, family: 'Codex', mode: 'Code' }
  if (modelId.includes('pro')) return { Icon: Cpu, family: 'Pro', mode: 'Premium' }
  if (modelId.includes('mini')) return { Icon: Gauge, family: 'Mini', mode: 'Light' }
  if (modelId.includes('terra')) return { Icon: Server, family: 'Terra', mode: 'General' }
  if (modelId.includes('sol')) return { Icon: Sparkles, family: 'Sol', mode: 'General' }
  return { Icon: Bot, family: 'Core', mode: 'General' }
}

function statusTone(status: ChannelStatus['status']) {
  if (status === 'Operational') return 'green'
  if (status === 'Degraded') return 'coral'
  return 'blue'
}

function statusDotClass(status: ChannelStatus['status']) {
  if (status === 'Operational') return 'status-good'
  if (status === 'Degraded') return 'status-warn'
  return 'status-muted'
}

function formatSeen(timestamp: number) {
  if (!timestamp) return 'Sin tráfico'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000))
}

function formatRelativeHours(timestamp: number) {
  if (!timestamp) return 'sin historial'
  const diffMs = Date.now() - timestamp * 1000
  const hours = Math.max(0, Math.round(diffMs / (60 * 60 * 1000)))
  return hours === 0 ? 'ahora' : `hace ${hours}h`
}

function StatusView({ data, refresh, locale }: { data: DashboardData; refresh: () => Promise<void>; locale: PortalLocale }) {
  const [windowDays, setWindowDays] = useState<7 | 15 | 30>(7)
  const [probing, setProbing] = useState(false)
  const [probeError, setProbeError] = useState('')
  const [liveProbes, setLiveProbes] = useState<Record<string, LiveProbe>>({})
  const runProbe = useCallback(async () => {
    setProbing(true)
    setProbeError('')
    try {
      const body = await readJson(await fetch('/api/channel-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models: data.channels.map((channel) => channel.modelId) }),
      })) as { data: { results: LiveProbe[] } }
      const next = Object.fromEntries(body.data.results.map((probe) => [probe.model, probe]))
      setLiveProbes(next)
      window.setTimeout(() => { void refresh() }, 800)
    } catch (cause) {
      setProbeError(cause instanceof Error ? cause.message : 'No se pudo probar el estado real.')
    } finally {
      setProbing(false)
    }
  }, [data.channels, refresh])

  useEffect(() => {
    const intervalMs = 2 * 60 * 60 * 1000
    let intervalId: number | undefined
    const ageMs = data.statusLastCheckedAt ? Date.now() - (data.statusLastCheckedAt * 1000) : Number.POSITIVE_INFINITY
    const firstDelay = Number.isFinite(ageMs) && ageMs < intervalMs ? intervalMs - ageMs : 0
    const timeoutId = window.setTimeout(() => {
      void runProbe().finally(() => {
        intervalId = window.setInterval(() => { void runProbe() }, intervalMs)
      })
    }, firstDelay)
    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [data.statusLastCheckedAt, runProbe])

  const windowKey = String(windowDays) as '7' | '15' | '30'
  const availableWindows = data.statusWindows.length ? data.statusWindows : [7, 15, 30]
  const cards = data.channels.map((channel) => ({
    ...channel,
    window: channel.windows[windowKey],
    live: liveProbes[channel.modelId],
    availabilityValue: liveProbes[channel.modelId]
      ? liveProbes[channel.modelId].ok ? 100 : 0
      : channel.windows[windowKey].availability,
  }))
  const operational = cards.filter((channel) => (channel.live?.status || channel.status) === 'Operational').length
  const degraded = cards.filter((channel) => (channel.live?.status || channel.status) === 'Degraded').length
  const avgAvailability = cards.length ? Math.round(cards.reduce((sum, channel) => sum + channel.availabilityValue, 0) / cards.length) : 0
  const latestLiveCheck = Math.max(0, ...Object.values(liveProbes).map((probe) => probe.checkedAt || 0))
  const lastCheckLabel = latestLiveCheck ? formatSeen(latestLiveCheck) : formatRelativeHours(data.statusLastCheckedAt)

  return (
    <div className="view-stack status-view">
      <section className="status-topbar">
        <div className="status-title">
          <h2>Channel Status</h2>
          <p>{tr(locale, 'Vista de disponibilidad, actividad y salud por modelo.', 'Availability, activity and health by model.')}</p>
        </div>
        <div className="status-actions">
          <div className="window-switch">
            {availableWindows.map((days) => (
              <button key={days} className={windowDays === days ? 'active' : ''} onClick={() => setWindowDays(days as 7 | 15 | 30)}>
                {days} {tr(locale, 'días', 'days')}
              </button>
            ))}
          </div>
          <span className={`status-pill ${degraded > 0 ? 'warn' : 'ok'}`}>{degraded > 0 ? 'DEGRADED' : 'OPERATIONAL'}</span>
          <button className="icon-button" onClick={() => void refresh()} aria-label="Actualizar">
            <RefreshCw size={18} />
          </button>
          <span className="refresh-pill">
            <RefreshCw size={16} className={probing ? 'spin' : ''} />
            {tr(locale, 'Auto chequeo: 2 h', 'Auto check: 2h')}
          </span>
        </div>
      </section>
      {probeError && <div className="status-error">{probeError}</div>}

      <section className="status-summary">
        <div className="summary-card">
          <span>{tr(locale, 'Canales', 'Channels')}</span>
          <strong>{cards.length}</strong>
          <small>{tr(locale, 'Modelos habilitados', 'Enabled models')}</small>
        </div>
        <div className="summary-card">
          <span>{tr(locale, 'Operativos', 'Operational')}</span>
          <strong>{operational}</strong>
          <small>{tr(locale, 'En la ventana de', 'In the')} {windowDays} {tr(locale, 'días', 'days')}</small>
        </div>
        <div className="summary-card">
          <span>{tr(locale, 'Disponibilidad', 'Availability')}</span>
          <strong>{avgAvailability}%</strong>
          <small>{tr(locale, 'Promedio de actividad', 'Activity average')}</small>
        </div>
      </section>

      <section className="status-grid">
        {cards.map((channel) => (
          <article className={`status-card tone-${channel.accent} ${channel.live ? 'has-live' : ''}`} key={channel.id}>
            <div className="status-card-head">
              <div className="status-card-brand">
                <span className={`status-glyph ${channel.accent}`}><Server size={18} /></span>
                <div>
                  <h3>{channel.label}</h3>
                  <div className="status-meta">
                    <span className="provider-badge">{channel.provider}</span>
                    <code>{channel.modelId}</code>
                  </div>
                </div>
              </div>
              <span className={`channel-badge ${statusTone(channel.live?.status || channel.status)}`}>{channel.live?.status || channel.status}</span>
            </div>

            <div className="status-metrics">
              <div>
                <span>{tr(locale, 'Dialog latency', 'Dialog latency')}</span>
                <strong>{channel.live?.dialogLatencyMs || channel.dialogLatencyMs}ms</strong>
              </div>
              <div>
                <span>Endpoint ping</span>
                <strong>{channel.live?.endpointPingMs || channel.endpointPingMs}ms</strong>
              </div>
            </div>

            <div className="status-foot">
              <div>
                <span>{tr(locale, 'Disponibilidad', 'Availability')} · {windowDays} {tr(locale, 'días', 'days')}</span>
                <strong>{channel.availabilityValue}%</strong>
              </div>
              <div>
                <span>{tr(locale, 'Historial', 'History')} ({channel.window.history.length} {tr(locale, 'pts', 'pts')})</span>
                <strong>{tr(locale, 'Próxima actualización en 50 s', 'Next update in 50s')}</strong>
              </div>
            </div>

            <div className="status-bars" aria-hidden="true">
              {channel.window.history.map((height, index) => (
                <span
                  key={`${channel.id}-${index}`}
                  className={`status-bar ${statusDotClass(channel.live?.status || channel.status)}`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>

            <div className="status-card-bottom">
              <span>Past</span>
              <span>Now</span>
            </div>

            <div className="status-card-footer">
              <span>{tr(locale, 'Grupo', 'Group')}</span>
              <code>{channel.group}</code>
              <span>{channel.live ? `HTTP ${channel.live.statusCode || 'ERR'}` : tr(locale, 'Última actividad', 'Last seen')}</span>
              <strong title={channel.live?.message}>{channel.live ? formatSeen(channel.live.checkedAt) : formatSeen(channel.window.lastSeen)}</strong>
            </div>
          </article>
        ))}
      </section>
      <div className="status-footnote">{tr(locale, 'Último chequeo global:', 'Last global check:')} {lastCheckLabel}</div>
    </div>
  )
}

function WalletView({ data, paymentReturn, onDismissPayment, onRedeemed, locale }: { data: DashboardData; paymentReturn: PaymentReturn | null; onDismissPayment: () => void; onRedeemed: () => Promise<void>; locale: PortalLocale }) {
  const [message, setMessage] = useState('')
  const [busyAmount, setBusyAmount] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercadopago')
  const [customAmount, setCustomAmount] = useState('')
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const english = locale === 'en'

  const customAmountValue = Number(customAmount)
  const minimumAmount = paymentMethod === 'crypto2328' ? MINIMUM_CRYPTO_PAYMENT_USD : 1
  const customAmountValid = customAmount.trim() !== '' && Number.isFinite(customAmountValue) && customAmountValue >= minimumAmount && customAmountValue <= 10_000 && Math.round((customAmountValue + Number.EPSILON) * 100) / 100 === customAmountValue

  async function checkout(amount: number) {
    setBusyAmount(amount)
    setMessage('')
    try {
      const body = await readJson(await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, provider: paymentMethod }),
      }))
      const paymentUrl = paymentMethod === 'crypto2328' ? body.data?.invoiceUrl : body.data?.initPoint
      if (!paymentUrl) {
        throw new Error(paymentMethod === 'crypto2328' ? (english ? '2328.io did not return a payment link.' : '2328.io no devolvió el enlace de pago.') : (english ? 'Mercado Pago did not return a payment link.' : 'Mercado Pago no devolvió el enlace de pago.'))
      }
      window.location.assign(paymentUrl)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : (english ? 'Payments are unavailable.' : 'Pagos no disponibles.'))
    } finally {
      setBusyAmount(null)
    }
  }

  function submitCustomAmount(event: FormEvent) {
    event.preventDefault()
    if (!customAmountValid) {
      setMessage(`${tr(locale, 'Ingresá un importe desde', 'Enter an amount from')} US$ ${minimumAmount} ${tr(locale, 'y con hasta 2 decimales.', 'with up to 2 decimals.')}`)
      return
    }
    void checkout(customAmountValue)
  }

  async function submitRedeem(event: FormEvent) {
    event.preventDefault()
    setRedeeming(true)
    setMessage('')
    try {
      const body = await readJson(await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode }),
      }))
      setRedeemCode('')
      setMessage(`${tr(locale, 'Código canjeado con éxito. Se acreditaron', 'Code redeemed successfully. Credited')} ${money(body.data.amountUsd, 2)} ${tr(locale, 'en tu cuenta.', 'to your account.')}`)
      await onRedeemed()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : (english ? 'Could not redeem the code.' : 'No se pudo canjear el código.'))
    } finally {
      setRedeeming(false)
    }
  }

  const balance = data.user.quota / data.quotaPerUsd
  const balanceArs = Math.round(balance * 1600).toLocaleString('es-AR')
  const spentUsd = data.user.used_quota / data.quotaPerUsd
  const spentArs = Math.round(spentUsd * 1600).toLocaleString('es-AR')

  const packages = [
    {
      amount: 1,
      tag: tr(locale, 'Micro Recarga', 'Micro Top-up'),
      desc: tr(locale, 'Ideal para probar prompts y scripts', 'Ideal for testing prompts and scripts'),
      tokens: '~10M tokens',
    },
    {
      amount: 5,
      tag: tr(locale, 'Starter Pack', 'Starter Pack'),
      desc: tr(locale, 'Para desarrollo diario y Cursor', 'For daily development and Cursor'),
      tokens: '~50M tokens',
    },
    {
      amount: 10,
      tag: tr(locale, 'Más elegido', 'Most Popular'),
      desc: tr(locale, 'Suficiente para semanas de programación', 'Enough for weeks of coding'),
      tokens: '~100M tokens',
      featured: true,
    },
    {
      amount: 25,
      tag: tr(locale, 'Power Dev', 'Power Dev'),
      desc: tr(locale, 'Máxima autonomía y Claude 3.7', 'Maximum autonomy and Claude 3.7'),
      tokens: '~250M tokens',
    },
  ]

  return (
    <div className="view-stack wallet-view">
      {/* 1. Payment status banner */}
      {paymentReturn && (
        <section className={`payment-result ${paymentReturn}`} role="status">
          <span className="payment-result-icon">
            {paymentReturn === 'success' ? <Check size={20} /> : paymentReturn === 'pending' ? <Clock3 size={20} /> : <AlertTriangle size={20} />}
          </span>
          <div>
            <strong>{paymentReturn === 'success' ? tr(locale, 'Pago aprobado', 'Payment approved') : paymentReturn === 'pending' ? tr(locale, 'Pago pendiente', 'Payment pending') : tr(locale, 'Pago no completado', 'Payment incomplete')}</strong>
            <p>
              {paymentReturn === 'success'
                ? tr(locale, 'El proveedor confirmó la operación. Tu saldo se actualizó automáticamente.', 'The payment was confirmed. Your balance has been updated automatically.')
                : paymentReturn === 'pending'
                ? tr(locale, 'El pago está en proceso de verificación. Se acreditará en cuanto se confirme.', 'Payment is being processed. It will be credited once confirmed.')
                : tr(locale, 'No se acreditó saldo. Podés volver a intentarlo cuando quieras.', 'No balance was credited. You can try again at any time.')}
            </p>
          </div>
          <button className="icon-button" onClick={onDismissPayment} aria-label={tr(locale, 'Cerrar estado del pago', 'Close payment status')}>
            <X size={17} />
          </button>
        </section>
      )}

      {/* 2. Hero Card */}
      <section className="wallet-hero-card">
        <div className="wallet-hero-main">
          <div className="landing-eyebrow-badge" style={{ marginBottom: '8px' }}>
            <span className="pulse-dot" />
            <span>{tr(locale, 'BILLETERA & CRÉDITO PREPAGO', 'WALLET & PREPAID CREDIT')}</span>
          </div>
          <h2>{tr(locale, 'Saldo Disponible para APIs', 'Available API Balance')}</h2>
          <div className="wallet-balance-display">
            <span className="wallet-balance-number">{money(balance, balance < 1 ? 4 : 2)}</span>
            <span className="wallet-balance-ars">≈ AR$ {balanceArs}</span>
          </div>
          <p className="wallet-hero-sub">
            {tr(locale, 'Cuenta:', 'Account:')} <strong>{data.user.display_name || data.user.username}</strong> · {tr(locale, 'Sin costo de mantenimiento ni vencimiento.', 'No maintenance fees or expiration.')}
          </p>
        </div>

        <div className="wallet-hero-stats">
          <div className="wallet-stat-box">
            <small>{tr(locale, 'Consumo histórico', 'Total spent')}</small>
            <strong>{money(spentUsd, 2)}</strong>
            <span>≈ AR$ {spentArs}</span>
          </div>
          <div className="wallet-stat-box">
            <small>{tr(locale, 'Peticiones procesadas', 'Processed requests')}</small>
            <strong>{compactNumber(data.user.request_count)}</strong>
            <span>100% gateway uptime</span>
          </div>
        </div>
      </section>

      {/* 3. Payment Method Selection */}
      <section className="wallet-section-card">
        <div className="wallet-section-header">
          <div>
            <div className="landing-eyebrow-badge" style={{ marginBottom: '4px' }}>
              <CreditCard size={13} />
              <span>{tr(locale, 'PASO 1', 'STEP 1')}</span>
            </div>
            <h3>{tr(locale, 'Seleccioná tu método de pago', 'Select your payment method')}</h3>
            <p>{tr(locale, 'Acreditación instantánea en tu cuenta sin comisiones ocultas.', 'Instant deposit to your account with no hidden fees.')}</p>
          </div>
        </div>

        <div className="wallet-methods-grid">
          <button
            type="button"
            className={`wallet-method-card ${paymentMethod === 'mercadopago' ? 'selected' : ''}`}
            onClick={() => setPaymentMethod('mercadopago')}
          >
            <div className="method-card-top">
              <div className="method-brand">
                <span className="method-icon mp"><CreditCard size={20} /></span>
                <div>
                  <strong>Mercado Pago</strong>
                  <span className="method-currency">ARS · Pesos Argentinos</span>
                </div>
              </div>
              <span className="method-check">{paymentMethod === 'mercadopago' ? <Check size={14} /> : null}</span>
            </div>
            <p className="method-desc">{tr(locale, 'Tarjetas de crédito, débito, dinero en cuenta y transferencias.', 'Credit/debit cards, account money, and bank transfers.')}</p>
            <div className="method-footer">
              <span className="rate-badge">Tasa: AR$ 1.600 / USD</span>
              <span className="instant-badge">⚡ {tr(locale, 'Acreditación inmediata', 'Instant credit')}</span>
            </div>
          </button>

          <button
            type="button"
            className={`wallet-method-card ${paymentMethod === 'crypto2328' ? 'selected' : ''}`}
            onClick={() => setPaymentMethod('crypto2328')}
          >
            <div className="method-card-top">
              <div className="method-brand">
                <span className="method-icon crypto"><Bitcoin size={20} /></span>
                <div>
                  <strong>Crypto · 2328.io</strong>
                  <span className="method-currency">USDT · BTC · ETH · SOL</span>
                </div>
              </div>
              <div className="method-badge-wrap">
                <span className="featured-pill">{tr(locale, 'RECOMENDADO', 'RECOMMENDED')}</span>
                <span className="method-check">{paymentMethod === 'crypto2328' ? <Check size={14} /> : null}</span>
              </div>
            </div>
            <p className="method-desc">{tr(locale, 'USDT (TRC20, Polygon, Arbitrum), Bitcoin, Ethereum, Solana.', 'USDT (TRC20, Polygon, Arbitrum), Bitcoin, Ethereum, Solana.')}</p>
            <div className="method-footer">
              <span className="rate-badge">USDT 1:1 USD</span>
              <span className="instant-badge">⚡ {tr(locale, 'Mínimo US$ 1', 'Min US$ 1')}</span>
            </div>
          </button>
        </div>
      </section>

      {/* 4. Packages Grid */}
      <section className="wallet-section-card">
        <div className="wallet-section-header">
          <div>
            <div className="landing-eyebrow-badge" style={{ marginBottom: '4px' }}>
              <Sparkles size={13} />
              <span>{tr(locale, 'PASO 2', 'STEP 2')}</span>
            </div>
            <h3>{tr(locale, 'Elegí el monto a recargar', 'Choose top-up amount')}</h3>
            <p>
              {paymentMethod === 'crypto2328'
                ? tr(locale, 'Pago directo en criptomonedas con conversión 1:1 a saldo de API.', 'Direct crypto deposit with 1:1 conversion to API balance.')
                : tr(locale, 'Pago seguro procesado por Mercado Pago en pesos argentinos.', 'Secure payment processed by Mercado Pago in Argentine Pesos.')}
            </p>
          </div>
        </div>

        <div className="wallet-packages-grid">
          {packages.filter((p) => p.amount >= minimumAmount).map((pkg) => {
            const isBusy = busyAmount === pkg.amount
            const pkgArs = Math.round(pkg.amount * 1600).toLocaleString('es-AR')

            return (
              <div className={`wallet-pkg-card ${pkg.featured ? 'featured' : ''}`} key={pkg.amount}>
                {pkg.featured && <span className="pkg-featured-badge">{pkg.tag}</span>}
                <div className="pkg-header">
                  {!pkg.featured && <span className="pkg-tag">{pkg.tag}</span>}
                  <div className="pkg-price-row">
                    <strong className="pkg-price-usd">{money(pkg.amount, 2)}</strong>
                  </div>
                  <span className="pkg-price-ars">
                    {paymentMethod === 'crypto2328' ? '1:1 en crypto' : `AR$ ${pkgArs}`}
                  </span>
                </div>

                <p className="pkg-desc">{pkg.desc}</p>

                <div className="pkg-token-chip">
                  <Cpu size={13} />
                  <span>{pkg.tokens}</span>
                </div>

                <button
                  className={`primary-button pkg-pay-btn ${pkg.featured ? 'glowing' : ''}`}
                  onClick={() => checkout(pkg.amount)}
                  disabled={busyAmount !== null}
                  type="button"
                >
                  {isBusy ? (
                    <>
                      <LoaderCircle className="spin" size={16} />
                      <span>{tr(locale, 'Conectando...', 'Connecting...')}</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={15} />
                      <span>{tr(locale, 'Cargar', 'Top up')} {money(pkg.amount, 0)}</span>
                      <ChevronRight size={15} />
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Custom Amount Form */}
        <div className="wallet-custom-box">
          <div className="wallet-custom-info">
            <strong>{tr(locale, '¿Querés un importe personalizado?', 'Want a custom amount?')}</strong>
            <small>{tr(locale, `Ingresá desde US$ ${minimumAmount} hasta US$ 10.000.`, `Enter from US$ ${minimumAmount} up to US$ 10,000.`)}</small>
          </div>

          <form className="wallet-custom-form" onSubmit={submitCustomAmount}>
            <div className="custom-input-wrap">
              <span className="custom-input-prefix">US$</span>
              <input
                type="number"
                min={minimumAmount}
                max="10000"
                step="0.01"
                inputMode="decimal"
                placeholder={paymentMethod === 'crypto2328' ? '15.00' : '15.00'}
                value={customAmount}
                onChange={(event) => {
                  setCustomAmount(event.target.value)
                  setMessage('')
                }}
                aria-label="Importe en dólares"
              />
            </div>

            <div className="quick-add-buttons">
              {[5, 15, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setCustomAmount(String(val))
                    setMessage('')
                  }}
                  className="quick-amount-pill"
                >
                  +$${val}
                </button>
              ))}
            </div>

            <button
              className="primary-button custom-pay-btn"
              type="submit"
              disabled={busyAmount !== null || !customAmountValid}
            >
              <CreditCard size={16} />
              <span>{tr(locale, 'Continuar al pago', 'Continue to payment')}</span>
            </button>
          </form>

          {customAmountValid && (
            <div className="custom-amount-preview">
              <Check size={14} color="#10b981" />
              <span>
                {paymentMethod === 'crypto2328'
                  ? `${tr(locale, 'Total a pagar:', 'Total to pay:')} US$ ${customAmountValue.toFixed(2)} ${tr(locale, 'en criptomonedas.', 'in crypto.')}`
                  : `${tr(locale, 'Total a pagar:', 'Total to pay:')} AR$ ${(Math.round(customAmountValue * 1600)).toLocaleString('es-AR')}`}
              </span>
            </div>
          )}

          {message && <div className="payment-message">{message}</div>}
        </div>
      </section>

      {/* 5. Redeem Promo Code */}
      <section className="wallet-section-card redeem-card">
        <div className="redeem-layout">
          <div className="redeem-info">
            <div className="redeem-icon-box">
              <ReceiptText size={24} color="#10b981" />
            </div>
            <div>
              <h3>{tr(locale, '¿Tenés un código promocional o demo?', 'Have a promotional or demo code?')}</h3>
              <p>{tr(locale, 'Ingresá tu cupón para acreditar saldo de prueba inmediatamente en tu cuenta.', 'Enter your voucher code to add trial balance instantly to your account.')}</p>
            </div>
          </div>

          <form className="redeem-form-inline" onSubmit={submitRedeem}>
            <input
              value={redeemCode}
              onChange={(event) => {
                setRedeemCode(event.target.value.toUpperCase())
                setMessage('')
              }}
              placeholder="ORB-XXXX-XXXX-XXXX"
              maxLength={30}
              className="redeem-input"
            />
            <button className="primary-button redeem-submit-btn" disabled={redeeming || !redeemCode.trim()}>
              {redeeming ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
              <span>{tr(locale, 'Canjear', 'Redeem')}</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

type SetupPlatform = 'cursor' | 'claude-code' | 'python' | 'node' | 'curl' | 'env'

function maskSecretKey(key: string) {
  if (!key) return 'sk-orbiqen-••••••••••••••••••••'
  if (key.length <= 10) return '••••••••••••••••'
  const prefix = key.startsWith('sk-') ? key.slice(0, 7) : key.slice(0, 4)
  const suffix = key.slice(-4)
  return `${prefix}••••••••••••••••••••${suffix}`
}

function SetupView({ data, locale }: { data: DashboardData; locale: PortalLocale }) {
  const [platform, setPlatform] = useState<SetupPlatform>('cursor')
  const [selectedKeyId, setSelectedKeyId] = useState<string>(data.keys[0] ? String(data.keys[0].id) : '')
  const [revealedKey, setRevealedKey] = useState<string>('')
  const [showKey, setShowKey] = useState(false)
  const [copiedField, setCopiedField] = useState<string>('')
  const [loadingKey, setLoadingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string; latency?: number }>({ status: 'idle', message: '' })
  const english = locale === 'en'

  const activeKeyObj = data.keys.find((k) => String(k.id) === selectedKeyId) || data.keys[0]
  const realSecretKey = revealedKey || activeKeyObj?.key || 'sk-orbiqen-tu-api-key'
  const displayKey = showKey ? realSecretKey : maskSecretKey(realSecretKey)
  const baseUrl = data.gatewayUrl

  useEffect(() => {
    let alive = true
    async function loadInitialSecret() {
      if (!selectedKeyId) return
      setLoadingKey(true)
      try {
        const body = await readJson(await fetch(`/api/keys/${selectedKeyId}/reveal`, { method: 'POST' }))
        if (alive) setRevealedKey(body.data.key)
      } catch {
        // Fallback to masked
      } finally {
        if (alive) setLoadingKey(false)
      }
    }
    void loadInitialSecret()
    return () => { alive = false }
  }, [selectedKeyId])

  async function copy(text: string, fieldId: string) {
    await navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(''), 2000)
  }

  async function runConnectionTest() {
    setTestResult({ status: 'loading', message: english ? 'Sending test prompt to gateway...' : 'Enviando petición de prueba al gateway...' })
    const start = performance.now()
    try {
      const response = await fetch('/api/keys/' + (activeKeyObj?.id || '1') + '/reveal', { method: 'POST' })
      const keyData = await readJson(response)
      const secret = keyData.data.key

      const chatRes = await fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`,
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 10,
        }),
      })

      const latency = Math.round(performance.now() - start)
      if (!chatRes.ok) {
        throw new Error(`HTTP ${chatRes.status}: ${chatRes.statusText}`)
      }
      const chatBody = await chatRes.json()
      const reply = chatBody.choices?.[0]?.message?.content || 'OK'
      setTestResult({
        status: 'success',
        latency,
        message: english
          ? `Connected successfully in ${latency}ms! Gateway response: "${reply}"`
          : `¡Conexión exitosa en ${latency}ms! Respuesta del gateway: "${reply}"`,
      })
    } catch (err) {
      setTestResult({
        status: 'error',
        message: err instanceof Error ? err.message : (english ? 'Connection test failed.' : 'Falló el test de conexión.'),
      })
    }
  }

  const platforms: { id: SetupPlatform; label: string; icon: typeof Code2; tag: string }[] = [
    { id: 'cursor', label: 'Cursor IDE', icon: Code2, tag: tr(locale, 'Popular', 'Popular') },
    { id: 'claude-code', label: 'Claude Code', icon: Terminal, tag: 'CLI' },
    { id: 'python', label: 'Python SDK', icon: Cpu, tag: 'OpenAI' },
    { id: 'node', label: 'Node.js / TS', icon: Sparkles, tag: 'npm' },
    { id: 'curl', label: 'cURL / REST', icon: Server, tag: 'API' },
    { id: 'env', label: '.env File', icon: Code2, tag: 'Config' },
  ]

  function getCode(snippetType: SetupPlatform, forCopy: boolean) {
    const key = forCopy ? realSecretKey : displayKey
    switch (snippetType) {
      case 'claude-code':
        return `export ANTHROPIC_BASE_URL="${baseUrl}"\nexport ANTHROPIC_API_KEY="${key}"\n\n# Iniciar Claude Code\nclaude`
      case 'python':
        return `import os\nfrom openai import OpenAI\n\nclient = OpenAI(\n    base_url="${baseUrl}",\n    api_key="${key}",\n)\n\nresponse = client.chat.completions.create(\n    model="gpt-5.4-mini",\n    messages=[\n        {"role": "system", "content": "Sos un asistente de programación experto."},\n        {"role": "user", "content": "¡Hola! ¿Estás operativo?"}\n    ],\n    temperature=0.7,\n)\n\nprint(response.choices[0].message.content)`
      case 'node':
        return `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  baseURL: "${baseUrl}",\n  apiKey: "${key}",\n});\n\nasync function main() {\n  const completion = await client.chat.completions.create({\n    model: "gpt-5.4-mini",\n    messages: [{ role: "user", content: "Hola desde Node.js" }],\n  });\n\n  console.log(completion.choices[0].message.content);\n}\n\nmain().catch(console.error);`
      case 'curl':
        return `curl "${baseUrl}/chat/completions" \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "gpt-5.4-mini",\n    "messages": [{"role": "user", "content": "Hola mundo"}]\n  }'`
      case 'env':
        return `OPENAI_BASE_URL="${baseUrl}"\nOPENAI_API_KEY="${key}"\nANTHROPIC_BASE_URL="${baseUrl}"\nANTHROPIC_API_KEY="${key}"`
      default:
        return ''
    }
  }

  return (
    <div className="view-stack setup-view">
      {/* 1. Hero Banner */}
      <section className="setup-hero-card">
        <div className="setup-hero-copy">
          <div className="landing-eyebrow-badge" style={{ marginBottom: '8px' }}>
            <span className="pulse-dot" />
            <span>{tr(locale, 'INTEGRACIÓN UNIVERSAL OPENAI-COMPATIBLE', 'UNIVERSAL OPENAI-COMPATIBLE SETUP')}</span>
          </div>
          <h2>{tr(locale, 'Centro de Conexión & Asistentes de Código', 'Connection & Developer Setup')}</h2>
          <p>
            {tr(
              locale,
              'Conectá Cursor, Windsurf, Claude Code, Python o Node.js con Orbiqen en segundos usando tu Base URL y API Key.',
              'Connect Cursor, Windsurf, Claude Code, Python, or Node.js to Orbiqen in seconds using your Base URL and API Key.'
            )}
          </p>
        </div>

        <div className="setup-hero-endpoint">
          <span className="endpoint-label">{tr(locale, 'Tu Endpoint Base URL', 'Your Base URL Endpoint')}</span>
          <div className="endpoint-pill-box">
            <code>{baseUrl}</code>
            <button
              className={`copy-btn ${copiedField === 'baseUrl' ? 'copied' : ''}`}
              onClick={() => copy(baseUrl, 'baseUrl')}
              type="button"
            >
              {copiedField === 'baseUrl' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedField === 'baseUrl' ? tr(locale, 'Copiado', 'Copied') : tr(locale, 'Copiar', 'Copy')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Active Key Injector Bar */}
      <section className="setup-key-injector-card">
        <div className="injector-label-group">
          <KeyRound size={20} color="#10b981" />
          <div>
            <strong>{tr(locale, 'Credencial activa para snippets:', 'Active credential for snippets:')}</strong>
            <small>{tr(locale, 'Los ejemplos de código abajo se configuran con esta clave.', 'Code snippets below are configured with this key.')}</small>
          </div>
        </div>

        <div className="injector-controls">
          <select
            className="injector-select"
            value={selectedKeyId}
            onChange={(event) => setSelectedKeyId(event.target.value)}
          >
            {data.keys.map((key) => (
              <option key={key.id} value={key.id}>
                {key.name} ({key.key})
              </option>
            ))}
          </select>

          <button
            className="icon-button reveal-toggle-btn"
            onClick={() => setShowKey(!showKey)}
            type="button"
            title={showKey ? tr(locale, 'Ocultar clave', 'Hide key') : tr(locale, 'Mostrar clave', 'Show key')}
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          <button
            className={`secondary-button copy-key-btn ${copiedField === 'activeKey' ? 'copied' : ''}`}
            onClick={() => copy(realSecretKey, 'activeKey')}
            type="button"
            disabled={loadingKey}
          >
            {copiedField === 'activeKey' ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiedField === 'activeKey' ? tr(locale, '¡Clave Copiada!', 'Key Copied!') : tr(locale, 'Copiar Key', 'Copy Key')}</span>
          </button>
        </div>
      </section>

      {/* 3. Interactive Client Guides & Code Workspace */}
      <section className="setup-workspace-card">
        {/* Workspace Navigation Tabs */}
        <div className="setup-tabs-bar">
          {platforms.map((item) => {
            const Icon = item.icon
            const isActive = platform === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`setup-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setPlatform(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                <span className="tab-tag">{item.tag}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="setup-tab-content">
          {platform === 'cursor' && (
            <div className="cursor-setup-guide">
              <div className="guide-steps-grid">
                <div className="guide-step-card">
                  <span className="step-num">1</span>
                  <h4>{tr(locale, 'Abrir Ajustes de Modelos', 'Open Model Settings')}</h4>
                  <p>{tr(locale, 'En Cursor, presioná Ctrl + Shift + J (o Cmd + Shift + J en macOS) y seleccioná la pestaña "Models".', 'In Cursor, press Ctrl + Shift + J (or Cmd + Shift + J) and click "Models".')}</p>
                </div>

                <div className="guide-step-card">
                  <span className="step-num">2</span>
                  <h4>{tr(locale, 'Activar Override Base URL', 'Enable Override Base URL')}</h4>
                  <p>{tr(locale, 'Activá "OpenAI API Key" y tildá la opción "Override OpenAI Base URL".', 'Enable "OpenAI API Key" and check "Override OpenAI Base URL".')}</p>
                </div>

                <div className="guide-step-card">
                  <span className="step-num">3</span>
                  <h4>{tr(locale, 'Pegar Credenciales', 'Paste Credentials')}</h4>
                  <p>{tr(locale, 'Pegá el Base URL y tu API Key generada abajo. ¡Listo para programar!', 'Paste the Base URL and API Key generated below. Ready to code!')}</p>
                </div>
              </div>

              {/* Cursor Config Fields Card */}
              <div className="cursor-fields-card">
                <div className="cursor-field-row">
                  <div className="field-info">
                    <strong>Override OpenAI Base URL</strong>
                    <small>{tr(locale, 'Pegá este valor exacto en Cursor', 'Paste this exact value into Cursor')}</small>
                  </div>
                  <div className="field-copy-box">
                    <code>{baseUrl}</code>
                    <button
                      className={`copy-btn ${copiedField === 'cursorBase' ? 'copied' : ''}`}
                      onClick={() => copy(baseUrl, 'cursorBase')}
                      type="button"
                    >
                      {copiedField === 'cursorBase' ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedField === 'cursorBase' ? tr(locale, 'Copiado', 'Copied') : tr(locale, 'Copiar', 'Copy')}</span>
                    </button>
                  </div>
                </div>

                <div className="cursor-field-row">
                  <div className="field-info">
                    <strong>OpenAI API Key</strong>
                    <small>{tr(locale, 'Tu credencial activa (oculta por seguridad)', 'Your active credential (masked for security)')}</small>
                  </div>
                  <div className="field-copy-box">
                    <code>{displayKey}</code>
                    <div className="field-action-group">
                      <button
                        className="icon-button field-action-btn"
                        onClick={() => setShowKey(!showKey)}
                        type="button"
                        title={showKey ? tr(locale, 'Ocultar clave', 'Hide key') : tr(locale, 'Mostrar clave', 'Show key')}
                      >
                        {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        className={`copy-btn ${copiedField === 'cursorKey' ? 'copied' : ''}`}
                        onClick={() => copy(realSecretKey, 'cursorKey')}
                        type="button"
                        title={tr(locale, 'Copiar clave real al portapapeles', 'Copy real key to clipboard')}
                      >
                        {copiedField === 'cursorKey' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedField === 'cursorKey' ? tr(locale, '¡Copiado!', 'Copied!') : tr(locale, 'Copiar', 'Copy')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {platform !== 'cursor' && (
            <div className="code-snippet-panel">
              <div className="snippet-header">
                <div>
                  <strong>{platforms.find((p) => p.id === platform)?.label}</strong>
                  <small>{tr(locale, 'El botón copiar siempre incluye tu clave real lista para ejecutar.', 'The copy button always includes your real key ready to run.')}</small>
                </div>
                <div className="snippet-actions">
                  <button
                    className="secondary-button reveal-btn-small"
                    onClick={() => setShowKey(!showKey)}
                    type="button"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showKey ? tr(locale, 'Ocultar', 'Hide') : tr(locale, 'Revelar', 'Reveal')}</span>
                  </button>
                  <button
                    className={`secondary-button copy-snippet-btn ${copiedField === platform ? 'copied' : ''}`}
                    onClick={() => copy(getCode(platform, true), platform)}
                    type="button"
                  >
                    {copiedField === platform ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copiedField === platform ? tr(locale, '¡Copiado!', 'Copied!') : tr(locale, 'Copiar código', 'Copy code')}</span>
                  </button>
                </div>
              </div>
              <pre className="code-block">
                <code>{getCode(platform, false)}</code>
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* 4. Live Gateway Connection Tester */}
      <section className="setup-tester-card">
        <div className="tester-header">
          <div className="tester-title">
            <RadioTower size={22} color="#10b981" />
            <div>
              <h3>{tr(locale, 'Test de Conectividad en Tiempo Real', 'Real-Time Connectivity Test')}</h3>
              <p>{tr(locale, 'Probá tu conexión directa al gateway OpenAI compatible con un solo clic.', 'Test your direct gateway connection with a single click.')}</p>
            </div>
          </div>

          <button
            className="primary-button tester-btn"
            onClick={runConnectionTest}
            disabled={testResult.status === 'loading'}
            type="button"
          >
            {testResult.status === 'loading' ? (
              <>
                <LoaderCircle className="spin" size={16} />
                <span>{tr(locale, 'Probando...', 'Testing...')}</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>{tr(locale, 'Probar Conexión Ahora', 'Test Connection Now')}</span>
              </>
            )}
          </button>
        </div>

        {testResult.status !== 'idle' && (
          <div className={`tester-result-box ${testResult.status}`}>
            {testResult.status === 'loading' && <LoaderCircle className="spin" size={18} />}
            {testResult.status === 'success' && <Check size={18} color="#10b981" />}
            {testResult.status === 'error' && <AlertTriangle size={18} color="#ef4444" />}
            <span>{testResult.message}</span>
            {testResult.latency && <span className="latency-badge">{testResult.latency}ms</span>}
          </div>
        )}
      </section>

      {/* 5. Automatic Setup Windows Assistant */}
      <section className="setup-assistant-card">
        <div className="assistant-info">
          <div className="assistant-icon-box">
            <Download size={24} color="#06b6d4" />
          </div>
          <div>
            <h3>{tr(locale, 'Asistente de Configuración para Windows', 'Windows Setup Assistant')}</h3>
            <p>{tr(locale, 'Configurador automático en 1 clic: configura Codex, Claude Code, variables de entorno y copias de seguridad.', '1-click automated setup: configures Codex, Claude Code, env vars and backups.')}</p>
          </div>
        </div>

        <div className="assistant-actions">
          <a className="primary-button" href="/downloads/orbiqen-windows/Orbiqen-Windows.rar" download>
            <Download size={16} />
            <span>{tr(locale, 'Descargar Asistente (.rar)', 'Download Assistant (.rar)')}</span>
          </a>
          <a className="secondary-button" href="/downloads/orbiqen-windows/LEEME-PRIMERO.txt" target="_blank" rel="noreferrer">
            <BookOpen size={16} />
            <span>{tr(locale, 'Instrucciones TXT', 'TXT Instructions')}</span>
          </a>
        </div>
      </section>
    </div>
  )
}

function LoadingScreen() {
  return <main className="loading-screen"><div className="brand"><BrandLogo /></div><LoaderCircle className="spin" size={25} /></main>
}

export function PortalApp({ initialMode = 'login', locale = 'es' }: { initialMode?: 'login' | 'register'; locale?: 'es' | 'en' } = {}) {
  const [portalLocale, setPortalLocale] = useState<PortalLocale>(locale)
  const [auth, setAuth] = useState<'loading' | 'anonymous' | 'authenticated'>('loading')
  const [data, setData] = useState<DashboardData | null>(null)
  const [view, setView] = useState<View>('overview')
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturn | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const load = useCallback(async () => {
    setRefreshing(true); setError('')
    try {
      let response = await fetch('/api/portal', { cache: 'no-store' })
      if (response.status === 401) {
        const refreshed = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' })
        if (refreshed.ok) response = await fetch('/api/portal', { cache: 'no-store' })
      }
      if (response.status === 401) { setAuth('anonymous'); setData(null); return }
      const body = await readJson(response)
      setData(body.data); setAuth('authenticated')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el panel.')
      if (!data) setAuth('anonymous')
    } finally { setRefreshing(false) }
  }, [data])

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (locale === 'en' || locale === 'es') {
      setPortalLocale(locale)
      window.localStorage.setItem('orbiqen-portal-locale', locale)
      return
    }
    const saved = window.localStorage.getItem('orbiqen-portal-locale')
    if (saved === 'es' || saved === 'en') setPortalLocale(saved)
  }, [locale])

  function changeLocale(nextLocale: PortalLocale) {
    setPortalLocale(nextLocale)
    window.localStorage.setItem('orbiqen-portal-locale', nextLocale)
  }

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get('payment')
    if (payment !== 'success' && payment !== 'pending' && payment !== 'failure') return
    setPaymentReturn(payment)
    setView('wallet')
    window.history.replaceState({}, document.title, window.location.pathname)
  }, [])

  const content = useMemo(() => {
    if (!data) return null
    if (view === 'overview') return <Overview data={data} locale={portalLocale} setView={setView} />
    if (view === 'usage') return <UsageView data={data} locale={portalLocale} />
    if (view === 'admin') return <AdminView locale={portalLocale} />
    if (view === 'status') return <StatusView data={data} locale={portalLocale} refresh={load} />
    if (view === 'keys') return <KeysView data={data} locale={portalLocale} reload={load} />
    if (view === 'models') return <ModelsView data={data} locale={portalLocale} />
    if (view === 'wallet') return <WalletView data={data} locale={portalLocale} paymentReturn={paymentReturn} onDismissPayment={() => setPaymentReturn(null)} onRedeemed={load} />
    return <SetupView data={data} locale={portalLocale} />
  }, [data, view, load, paymentReturn, portalLocale])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setData(null); setAuth('anonymous'); setView('overview'); setPaymentReturn(null)
  }

  if (auth === 'loading') return <LoadingScreen />
  if (auth === 'anonymous') return <AuthScreen onAuthenticated={load} initialMode={initialMode} locale={portalLocale} onChangeLocale={changeLocale} />
  if (!data) return <LoadingScreen />

  const title = getViewTitles(portalLocale)[view]
  const visibleNav = getNavItems(portalLocale).filter((item) => !item.adminOnly || Number(data.user.role || 0) >= 10)
  const initials = (data.user.display_name || data.user.username).slice(0, 2).toUpperCase()
  return <main className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="brand"><BrandLogo light /></div>
      <nav>{visibleNav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setSidebarOpen(false) }}><Icon size={19} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-footer"><div className="account-row"><span className="avatar">{initials}</span><span><strong>{data.user.display_name || data.user.username}</strong><small>{data.user.username}</small></span><button className="icon-button" onClick={logout} aria-label="Cerrar sesión"><LogOut size={17} /></button></div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú" />}
    <section className="main-area">
      <header className="topbar"><button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label={tr(portalLocale, 'Abrir menú', 'Open menu')}><Menu size={21} /></button><div><h1>{title.title}</h1><p>{title.subtitle}</p></div><div className="top-actions"><PortalLanguageToggle locale={portalLocale} onChange={changeLocale} /><button className="icon-button" onClick={load} disabled={refreshing} aria-label={tr(portalLocale, 'Actualizar', 'Refresh')}><RefreshCw className={refreshing ? 'spin' : ''} size={18} /></button><button className="balance-pill" onClick={() => setView('wallet')}><WalletCards size={17} /><span>{money(data.user.quota / data.quotaPerUsd, 2)}</span></button></div></header>
      <div className="content-area">{error && <div className="form-error">{error}</div>}{content}</div>
      <nav className="mobile-nav">{visibleNav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
    </section>
  </main>
}
