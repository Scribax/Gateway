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
  X,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { PublicLanguageSwitch } from './public-nav'

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
type DashboardData = {
  user: User
  keys: ApiKey[]
  logs: UsageLog[]
  logTotal: number
  models: ModelPrice[]
  keyModels: ModelPrice[]
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

function AuthScreen({ onAuthenticated, initialMode = 'login', locale = 'es' }: { onAuthenticated: () => void; initialMode?: 'login' | 'register'; locale?: 'es' | 'en' }) {
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
  const english = locale === 'en'
  const copy = english ? {
    welcome: 'Welcome', newAccount: 'New account', loginTitle: 'Sign in to your dashboard', registerTitle: 'Create your account',
    username: 'Username', usernamePlaceholder: 'your_username', email: 'Email address', emailPlaceholder: 'you@yourcompany.com',
    verification: 'Verification code', sendCode: 'Send code', resend: 'Resend', password: 'Password', passwordPlaceholder: 'At least 8 characters',
    sent: 'Code sent. Check your inbox and spam folder.', signIn: 'Sign in', create: 'Create account', createNew: 'Create a new account', already: 'I already have an account',
    heroTitle: <>One API.<br />All your models.</>, heroText: 'Manage balance, keys and usage from a dashboard built for work.', proof: 'Isolated keys and usage control',
  } : {
    welcome: 'Bienvenido', newAccount: 'Nueva cuenta', loginTitle: 'Ingresá a tu panel', registerTitle: 'Creá tu cuenta',
    username: 'Usuario', usernamePlaceholder: 'tu_usuario', email: 'Correo electrónico', emailPlaceholder: 'vos@tuempresa.com',
    verification: 'Código de verificación', sendCode: 'Enviar código', resend: 'Reenviar', password: 'Contraseña', passwordPlaceholder: 'Mínimo 8 caracteres',
    sent: 'Código enviado. Revisá también la carpeta de spam.', signIn: 'Ingresar', create: 'Crear cuenta', createNew: 'Crear una cuenta nueva', already: 'Ya tengo una cuenta',
    heroTitle: <>Una API.<br />Todos tus modelos.</>, heroText: 'Administrá saldo, claves y consumo desde un panel hecho para trabajar.', proof: 'Claves aisladas y control de consumo',
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
        <div className="brand brand-light"><BrandLogo light /></div>
        <div className="auth-brand-content">
          <div className="auth-signal"><span /><span /><span /></div>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroText}</p>
        </div>
        <div className="auth-proof"><ShieldCheck size={18} /><span>{copy.proof}</span></div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-mobile-brand brand"><BrandLogo /></div>
        <div className="auth-language"><PublicLanguageSwitch locale={locale} englishPath={`/login?lang=en${mode === 'register' ? '&mode=register' : ''}`} spanishPath={`/login?lang=es${mode === 'register' ? '&mode=register' : ''}`} /></div>
        <form className="auth-form" onSubmit={submit}>
          <div>
            <p className="eyebrow">{mode === 'login' ? copy.welcome : copy.newAccount}</p>
            <h2>{mode === 'login' ? copy.loginTitle : copy.registerTitle}</h2>
          </div>
          <label>
            {copy.username}
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder={copy.usernamePlaceholder} required />
          </label>
          {mode === 'register' && <>
            <label>
              {copy.email}
              <input value={email} onChange={(event) => { setEmail(event.target.value); setCodeSent(false); setCooldown(0) }} type="email" autoComplete="email" placeholder={copy.emailPlaceholder} required />
            </label>
            <label>
              {copy.verification}
              <span className="verification-field">
                <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/[^a-fA-F0-9]/g, '').toLowerCase().slice(0, 6))} inputMode="text" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} maxLength={6} placeholder="a1b2c3" pattern="[a-fA-F0-9]{6}" required />
                <button className="secondary-button verification-send" type="button" onClick={sendVerificationCode} disabled={sendingCode || cooldown > 0 || !email}>
                  {sendingCode ? <LoaderCircle className="spin" size={17} /> : <Mail size={17} />}
                  {cooldown > 0 ? `${cooldown}s` : codeSent ? copy.resend : copy.sendCode}
                </button>
              </span>
            </label>
            {codeSent && <p className="form-success">{copy.sent}</p>}
          </>}
          <label>
            {copy.password}
            <span className="password-field">
              <input value={password} onChange={(event) => setPassword(event.target.value)} type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={copy.passwordPlaceholder} required />
              <button type="button" className="icon-button inline-icon" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </span>
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={18} />}{mode === 'login' ? copy.signIn : copy.create}</button>
          <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setCodeSent(false); setCooldown(0) }}>
            {mode === 'login' ? copy.createNew : copy.already}
          </button>
        </form>
      </section>
    </main>
  )
}

function Stat({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: typeof Activity; tone: string }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
      <div><p>{label}</p><strong>{value}</strong><span>{hint}</span></div>
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
  const available = data.user.quota / data.quotaPerUsd
  const spent = data.user.used_quota / data.quotaPerUsd
  const activeKeys = data.keys.filter((key) => key.status === 1).length
  const billableLogs = data.logs.filter((log) => Boolean(log.model_name) && Boolean(log.token_name) && (((log.prompt_tokens || 0) + (log.completion_tokens || 0)) > 0 || (log.quota || 0) > 0))
  return (
    <div className="view-stack">
      <section className="stats-grid">
        <Stat label={tr(locale, 'Saldo disponible', 'Available balance')} value={money(available, available < 1 ? 4 : 2)} hint={tr(locale, 'Crédito actual', 'Current credit')} icon={CircleDollarSign} tone="green" />
        <Stat label={tr(locale, 'Consumo histórico', 'Historical usage')} value={money(spent, spent < 1 ? 4 : 2)} hint={`${data.logTotal} ${tr(locale, 'solicitudes con consumo', 'usage requests')}`} icon={Activity} tone="coral" />
        <Stat label={tr(locale, 'Solicitudes', 'Requests')} value={compactNumber(data.user.request_count)} hint={tr(locale, 'Procesadas correctamente', 'Processed successfully')} icon={Gauge} tone="blue" />
        <Stat label={tr(locale, 'Claves activas', 'Active keys')} value={String(activeKeys)} hint={`${data.keys.length} ${tr(locale, 'creadas', 'created')}`} icon={KeyRound} tone="charcoal" />
      </section>
      <section className="quick-band">
        <div><span className="quick-icon"><Server size={20} /></span><div><strong>{tr(locale, 'Tu endpoint está listo', 'Your endpoint is ready')}</strong><code>{data.gatewayUrl}</code></div></div>
        <button className="secondary-button" onClick={() => setView('setup')}>{tr(locale, 'Ver configuración', 'View setup')} <ChevronRight size={17} /></button>
      </section>
      <section className="section-block activity-card">
        <div className="section-heading"><div><h3>{tr(locale, 'Actividad reciente', 'Recent activity')}</h3><p>{tr(locale, 'Solo mostramos solicitudes con consumo real.', 'Only requests with real usage are shown.')}</p></div><button className="text-action" onClick={() => setView('usage')}>{tr(locale, 'Ver usage', 'View usage')} <ArrowUpRight size={16} /></button></div>
        <div className="activity-list">
          {billableLogs.length === 0 && <div className="empty-row"><Activity size={20} />{tr(locale, 'Todavía no hay consumo registrado', 'No usage recorded yet')}</div>}
          {billableLogs.slice(0, 8).map((log) => {
            const tokens = (log.prompt_tokens || 0) + (log.completion_tokens || 0)
            return <article className="activity-item" key={log.id}><span className="activity-icon"><Bot size={17} /></span><div><strong>{log.model_name}</strong><small>{formatDate(log.created_at)} · {log.token_name}</small></div><div className="activity-metrics"><span>{compactNumber(tokens)} tokens</span><strong>{money((log.quota || 0) / data.quotaPerUsd, 6)}</strong></div></article>
          })}
        </div>
      </section>
    </div>
  )
}

function KeyModal({ data, onClose, onCreated, locale }: { data: DashboardData; onClose: () => void; onCreated: (key: string) => void; locale: PortalLocale }) {
  const [name, setName] = useState('mi-aplicacion')
  const [quota, setQuota] = useState(Math.min(10, Math.max(1, Math.floor(data.user.quota / data.quotaPerUsd))))
  const groupOptions = [
    { id: 'clientes', label: 'ChatGPT economico', description: 'Grupo 0.1', note: 'Menor precio para tareas comunes', multiplier: 1, matches: (id: string) => !id.includes('claude') },
    { id: 'clientes_025', label: 'ChatGPT estable', description: 'Grupo 0.25', note: 'Mayor disponibilidad si el barato falla', multiplier: 2.5, matches: (id: string) => !id.includes('claude') },
    { id: 'claude', label: 'Claude', description: 'Anthropic', note: 'Opus, Sonnet, Haiku y Fable', multiplier: 1, matches: (id: string) => id.includes('claude') },
  ]
  const [group, setGroup] = useState<string | null>(null)
  const selectedGroup = groupOptions.find((option) => option.id === group) || null
  const groupModels = selectedGroup ? data.keyModels.filter((model) => selectedGroup.matches(model.id)) : []
  const pricedGroupModels = groupModels.filter((model) => model.input > 0 || model.output > 0)
  const groupInputFrom = pricedGroupModels.length > 0 ? Math.min(...pricedGroupModels.map((model) => model.input * (selectedGroup?.multiplier || 1))) : 0
  const groupOutputFrom = pricedGroupModels.length > 0 ? Math.min(...pricedGroupModels.map((model) => model.output * (selectedGroup?.multiplier || 1))) : 0
  const [models, setModels] = useState<string[]>([])
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

  async function create(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const body = await readJson(await fetch('/api/keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quotaUsd: quota, group, models }),
      }))
      onCreated(body.data.key)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear la clave.') }
    finally { setLoading(false) }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form className="modal key-modal" onSubmit={create}>
      <div className="modal-header"><div><p className="eyebrow">{tr(locale, 'Nueva credencial', 'New credential')}</p><h3>Crear API Key</h3></div><button type="button" className="icon-button" onClick={onClose} aria-label={tr(locale, 'Cerrar', 'Close')}><X size={20} /></button></div>
      <div className="modal-body">
        <label>{tr(locale, 'Nombre', 'Name')}<input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} required /></label>
        <label>{tr(locale, 'Límite de consumo (USD)', 'Usage limit (USD)')}<input type="number" min="0.01" step="0.01" value={quota} onChange={(event) => setQuota(Number(event.target.value))} required /></label>
        <fieldset><legend>{tr(locale, '1. Elegí como querés enrutar esta key', '1. Choose how this key should route requests')}</legend><div className="group-choice-grid">{groupOptions.map((option) => { const availableModels = data.keyModels.filter((model) => option.matches(model.id)); const pricedModels = availableModels.filter((model) => model.input > 0 || model.output > 0); const inputFrom = pricedModels.length > 0 ? Math.min(...pricedModels.map((model) => model.input * option.multiplier)) : 0; const outputFrom = pricedModels.length > 0 ? Math.min(...pricedModels.map((model) => model.output * option.multiplier)) : 0; const available = availableModels.length > 0; return <label className={`group-choice ${group === option.id ? 'selected' : ''} ${!available ? 'disabled' : ''}`} key={option.id}><input type="radio" name="api-key-group" checked={group === option.id} disabled={!available} onChange={() => selectGroup(option.id)} /><span className="group-choice-mark">{group === option.id && <Check size={14} />}</span><span className="group-choice-copy"><strong>{option.label}</strong><small>{available ? option.note : tr(locale, 'Sin modelos disponibles ahora', 'No models available right now')}</small><span className="group-price-line"><b>{option.description}</b><em>Input {tr(locale, 'desde', 'from')} {tokenPrice(inputFrom)} · {tr(locale, 'Salida desde', 'Output from')} {tokenPrice(outputFrom)}</em></span></span></label> })}</div></fieldset>
        {selectedGroup ? <fieldset><div className="model-field-head"><strong>2. {tr(locale, 'Elegí los modelos de', 'Choose models for')} {selectedGroup.label}</strong><span>{groupModels.length} {tr(locale, 'disponibles', 'available')}</span></div><div className="selected-group-summary"><div><small>Input {tr(locale, 'desde', 'from')}</small><strong>{tokenPrice(groupInputFrom)}</strong></div><div><small>{tr(locale, 'Salida desde', 'Output from')}</small><strong>{tokenPrice(groupOutputFrom)}</strong></div><div><small>{tr(locale, 'Precio', 'Price')}</small><strong>{selectedGroup.multiplier === 1 ? tr(locale, 'Base', 'Base') : `${selectedGroup.multiplier}x`}</strong></div></div>{groupModels.length > 0 ? <div className="model-check-grid priced">{groupModels.map((model) => <label className={`check-row priced ${models.includes(model.id) ? 'selected' : ''}`} key={model.id}><input type="checkbox" checked={models.includes(model.id)} onChange={() => toggleModel(model.id)} /><span>{models.includes(model.id) && <Check size={14} />}</span><div><strong>{model.label}</strong><small>Input {tokenPrice(model.input * selectedGroup.multiplier)} · {tr(locale, 'Salida', 'Output')} {tokenPrice(model.output * selectedGroup.multiplier)}{model.cacheWrite > 0 ? ` · Cache ${tokenPrice(model.cacheWrite * selectedGroup.multiplier)}` : ''}</small></div></label>)}</div> : <p className="field-note">{tr(locale, 'No hay modelos disponibles en este grupo.', 'No models are available in this group.')}</p>}</fieldset> : <div className="group-prompt"><Sparkles size={17} /><span>{tr(locale, 'Elegí un grupo para ver modelos y precios.', 'Choose a group to see models and prices.')}</span></div>}
        {error && <div className="form-error">{error}</div>}
      </div>
      <div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>{tr(locale, 'Cancelar', 'Cancel')}</button><button className="primary-button" disabled={loading || !group || models.length === 0}>{loading ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}{tr(locale, 'Crear clave', 'Create key')}</button></div>
    </form>
  </div>
}

function SecretModal({ secret, onClose, locale }: { secret: string; onClose: () => void; locale: PortalLocale }) {
  const [copied, setCopied] = useState(false)
  async function copy() { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1800) }
  return <div className="modal-backdrop"><div className="modal secret-modal"><div className="modal-header"><div><p className="eyebrow">API Key</p><h3>{tr(locale, 'Credencial lista', 'Credential ready')}</h3></div><button className="icon-button" onClick={onClose} aria-label={tr(locale, 'Cerrar', 'Close')}><X size={20} /></button></div><div className="modal-body"><div className="secret-box"><code>{secret}</code><button className="icon-button" onClick={copy} aria-label={tr(locale, 'Copiar', 'Copy')}>{copied ? <Check size={19} /> : <Copy size={19} />}</button></div><p className="security-note"><ShieldCheck size={17} />{tr(locale, 'Guardala en un gestor de secretos y no la incluyas en código público.', 'Store it in a secrets manager and never include it in public code.')}</p></div><div className="modal-footer"><button className="primary-button" onClick={onClose}>{tr(locale, 'Listo', 'Done')}</button></div></div></div>
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
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la clave.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadSecret()
    return () => { cancelled = true }
  }, [keyInfo.id])

  const files = setupFiles(target, os, data.gatewayUrl, secret, authMode)
  async function copy(path: string, content: string) {
    await navigator.clipboard.writeText(content)
    setCopied(path)
    setTimeout(() => setCopied(''), 1800)
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="modal setup-modal">
      <div className="modal-header"><div><p className="eyebrow">{tr(locale, 'Usar API Key', 'Use API Key')} · {keyInfo.name}</p><h3>{tr(locale, 'Configuración de cliente', 'Client setup')}</h3></div><button className="icon-button" onClick={onClose} aria-label={tr(locale, 'Cerrar', 'Close')}><X size={20} /></button></div>
      <div className="setup-controls">
        <div className="setup-segment"><span>{tr(locale, 'Cliente', 'Client')}</span><div>{([['codex', 'Codex CLI'], ['codex-ws', 'Codex CLI (WebSocket)'], ['opencode', 'OpenCode']] as const).map(([value, label]) => <button key={value} className={target === value ? 'active' : ''} onClick={() => setTarget(value)}>{label}</button>)}</div></div>
        <div className="setup-segment"><span>{tr(locale, 'Autenticación', 'Authentication')}</span><div>{([['compatibility', 'Compatibility mode'], ['api-key', 'API Key Mode']] as const).map(([value, label]) => <button key={value} className={authMode === value ? 'active' : ''} onClick={() => setAuthMode(value)}>{label}</button>)}</div></div>
        <div className="setup-segment"><span>{tr(locale, 'Sistema', 'System')}</span><div>{([['unix', 'macOS / Linux'], ['windows', 'Windows']] as const).map(([value, label]) => <button key={value} className={os === value ? 'active' : ''} onClick={() => setOs(value)}>{label}</button>)}</div></div>
      </div>
      <p className="setup-mode-note">{authMode === 'api-key' ? tr(locale, 'API Key Mode usa la credencial directa del cliente para autorizar el gateway.', 'API Key Mode uses the client credential to authorize the gateway.') : tr(locale, 'Compatibility mode genera el formato OPENAI_API_KEY para clientes existentes.', 'Compatibility mode generates the OPENAI_API_KEY format for existing clients.')}</p>
      <div className="modal-body setup-body">
        {loading && <div className="setup-loading"><LoaderCircle className="spin" size={19} />{tr(locale, 'Cargando la credencial de esta clave...', 'Loading this key credential...')}</div>}
        {error && <div className="form-error">{error}</div>}
        {!loading && !error && files.map((file) => <section className="setup-file" key={file.path}><div className="setup-file-head"><code>{file.path}</code><button className="copy-code" onClick={() => copy(file.path, file.content)}>{copied === file.path ? <Check size={16} /> : <Copy size={16} />}{copied === file.path ? tr(locale, 'Copiado', 'Copied') : tr(locale, 'Copiar', 'Copy')}</button></div><pre><code>{file.content}</code></pre></section>)}
        <p className="security-note"><ShieldCheck size={17} />{tr(locale, 'La clave se revela solo para generar esta configuración. No la compartas ni la subas a Git.', 'The key is revealed only to generate this setup. Do not share it or upload it to Git.')}</p>
      </div>
      <div className="modal-footer"><button className="primary-button" onClick={onClose}>{tr(locale, 'Listo', 'Done')}</button></div>
    </div>
  </div>
}

function KeysView({ data, reload, locale }: { data: DashboardData; reload: () => Promise<void>; locale: PortalLocale }) {
  const [creating, setCreating] = useState(false)
  const [secret, setSecret] = useState('')
  const [setupKey, setSetupKey] = useState<ApiKey | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function reveal(id: number) {
    setBusyId(id); setError('')
    try { const body = await readJson(await fetch(`/api/keys/${id}/reveal`, { method: 'POST' })); setSecret(body.data.key) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo revelar la clave.') }
    finally { setBusyId(null) }
  }
  async function remove(id: number) {
    if (!confirm(tr(locale, '¿Eliminar esta API Key? Las aplicaciones que la usen dejarán de funcionar.', 'Delete this API Key? Applications using it will stop working.'))) return
    setBusyId(id); setError('')
    try { await readJson(await fetch(`/api/keys/${id}`, { method: 'DELETE' })); await reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la clave.') }
    finally { setBusyId(null) }
  }

  return <div className="view-stack"><div className="view-actions"><div className="info-chip"><ShieldCheck size={16} />{data.keys.filter((key) => key.status === 1).length} {tr(locale, 'activas', 'active')}</div><button className="primary-button" onClick={() => setCreating(true)}><Plus size={18} />{tr(locale, 'Crear API Key', 'Create API Key')}</button></div>{error && <div className="form-error">{error}</div>}<section className="section-block"><div className="table-wrap"><table><thead><tr><th>{tr(locale, 'Nombre', 'Name')}</th><th>{tr(locale, 'Credencial', 'Credential')}</th><th>{tr(locale, 'Modelos', 'Models')}</th><th>{tr(locale, 'Saldo', 'Balance')}</th><th>{tr(locale, 'Último uso', 'Last use')}</th><th className="right">{tr(locale, 'Acciones', 'Actions')}</th></tr></thead><tbody>{data.keys.length === 0 && <tr><td colSpan={6}><div className="empty-row"><KeyRound size={20} />{tr(locale, 'No hay claves creadas', 'No keys created')}</div></td></tr>}{data.keys.map((key) => <tr key={key.id}><td><span className="key-title"><span className={`status-dot ${key.status === 1 ? 'active' : ''}`} />{key.name}</span></td><td><code className="masked-key">{key.key}</code></td><td><span className="model-count">{key.model_limits ? key.model_limits.split(',').length : tr(locale, 'Todos', 'All')}</span></td><td>{money(key.remain_quota / data.quotaPerUsd, 4)}</td><td>{formatDate(key.accessed_time)}</td><td className="right"><span className="action-group"><button className="secondary-button key-use-button" onClick={() => setSetupKey(key)}><Terminal size={16} />{tr(locale, 'Usar API Key', 'Use API Key')}</button><button className="icon-button" onClick={() => reveal(key.id)} disabled={busyId === key.id} aria-label={tr(locale, 'Revelar clave', 'Reveal key')}>{busyId === key.id ? <LoaderCircle className="spin" size={17} /> : <Eye size={17} />}</button><button className="icon-button danger" onClick={() => remove(key.id)} disabled={busyId === key.id} aria-label={tr(locale, 'Eliminar clave', 'Delete key')}><Trash2 size={17} /></button></span></td></tr>)}</tbody></table></div></section>{creating && <KeyModal data={data} locale={locale} onClose={() => setCreating(false)} onCreated={async (key) => { setCreating(false); setSecret(key); await reload() }} />}{secret && <SecretModal secret={secret} locale={locale} onClose={() => setSecret('')} />}{setupKey && <UseApiKeyModal data={data} locale={locale} keyInfo={setupKey} onClose={() => setSetupKey(null)} />}</div>
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

  useEffect(() => {
    let alive = true
    async function loadUsage() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/usage', { cache: 'no-store' })
        if (response.status === 401) {
          setError('La sesión expiró.')
          return
        }
        const body = await readJson(response)
        if (alive) setUsage(body.data)
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el usage.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void loadUsage()
    return () => { alive = false }
  }, [])

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
  const seriesMax = Math.max(1, ...buckets.map((item) => item.requests))
  const series = buckets.slice(-14)
  const detailedRows = useMemo(() => filtered.map((log) => {
    const meta = parseUsageMeta(log)
    const billingMode = meta.billing_mode || meta.billing_source || 'Token'
    const rateMultiplier = meta.cache_ratio || 0.1
    const billedCost = (log.quota || 0) / quotaPerUsd
    const originalCost = rateMultiplier > 0 ? billedCost / rateMultiplier : billedCost
    const inputTokens = Math.max(0, (log.prompt_tokens || 0) - (meta.cache_tokens || 0))
    const outputTokens = log.completion_tokens || 0
    const cacheReadTokens = meta.cache_tokens || 0
    const cacheCreationTokens = meta.cache_creation_tokens || 0
    const totalTokenCount = inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens
    const rowType = log.type === 2 ? 'Stream' : log.type === 1 ? 'Sync' : (meta.stream_status?.status ? 'Stream' : 'Sync')
    return {
      id: log.id,
      time: log.created_at,
      apiKey: log.token_name || 'Sin nombre',
      model: log.model_name || 'N/D',
      reasoning: meta.reasoning_effort || '-',
      endpoint: meta.request_path || log.channel_name || '/v1/chat/completions',
      ip: log.ip || 'N/D',
      type: rowType,
      billingMode,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheCreationTokens,
      rateMultiplier,
      billedCost,
      originalCost,
      firstTokenMs: meta.frt || 0,
      durationMs: log.use_time || 0,
      totalTokenCount,
    }
  }), [filtered, quotaPerUsd])

  function exportCsv() {
    const header = [
      'Time',
      'API Key Name',
      'Model',
      'Reasoning Effort',
      'Inbound Endpoint',
      'IP Address',
      'Type',
      'Billing Mode',
      'Input Tokens',
      'Output Tokens',
      'Cache Read Tokens',
      'Cache Creation Tokens',
      'Rate Multiplier',
      'Billed Cost',
      'Original Cost',
      'First Token (ms)',
      'Duration (ms)',
    ]
    const rows = [
      header.map(csvEscape).join(','),
      ...detailedRows.map((row) => [
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

  return (
    <div className="usage-page">
      <section className="usage-hero">
        <div>
          <p className="eyebrow">Usage Records</p>
          <h2>{tr(locale, 'Uso real por cliente', 'Real customer usage')}</h2>
          <span>{tr(locale, 'Todo el consumo que ve este usuario sale de sus propios logs en New API.', 'All usage shown here comes from this user’s own New API logs.')}</span>
        </div>
        <div className="usage-hero-meta">
          <div><small>{tr(locale, 'Cuenta', 'Account')}</small><strong>{usage?.user.display_name || usage?.user.username || data.user.username}</strong></div>
          <div><small>{tr(locale, 'Ventana', 'Window')}</small><strong>{range === '24h' ? tr(locale, '24 horas', '24 hours') : range === '7d' ? tr(locale, '7 días', '7 days') : tr(locale, '30 días', '30 days')}</strong></div>
        </div>
      </section>

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
            <span>{tr(locale, 'Datos en vivo con actualización al abrir la pestaña', 'Live data refreshes when this tab opens')}</span>
          </div>
          <button className="secondary-button" onClick={exportCsv}><Clipboard size={16} />Export CSV</button>
        </div>
      </section>

      {loading && <section className="usage-skeleton"><LoaderCircle className="spin" size={26} /><span>{tr(locale, 'Cargando uso real...', 'Loading real usage...')}</span></section>}
      {error && <div className="form-error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="usage-stats-grid">
            <UsageStat label={tr(locale, 'Total requests', 'Total requests')} value={compactNumber(totalRequests)} hint={tr(locale, 'Solicitudes del rango', 'Requests in range')} icon={Activity} tone="blue" />
            <UsageStat label={tr(locale, 'Total tokens', 'Total tokens')} value={compactNumber(totalTokens)} hint={`Prompt ${compactNumber(totalPrompt)} / Completion ${compactNumber(totalCompletion)}`} icon={Gauge} tone="green" />
            <UsageStat label={tr(locale, 'Costo total', 'Total cost')} value={money(totalCost, totalCost < 1 ? 4 : 2)} hint={tr(locale, 'Costo real del usuario', 'Actual user cost')} icon={CircleDollarSign} tone="coral" />
            <UsageStat label={tr(locale, 'Duración promedio', 'Avg duration')} value={formatDuration(avgDuration)} hint={tr(locale, 'Tiempo promedio por request', 'Average request time')} icon={Clock3} tone="violet" />
          </section>

          <section className="usage-chart-grid">
            <article className="usage-panel">
              <div className="usage-panel-head">
                <div>
                  <p>Model Distribution</p>
                  <h3>{tr(locale, 'Por requests', 'By requests')}</h3>
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
                  {modelBreakdown.map((item, index) => (
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
                  ))}
                </div>
              </div>
            </article>

            <article className="usage-panel">
              <div className="usage-panel-head">
                <div>
                  <p>Group Usage Distribution</p>
                  <h3>{tr(locale, 'Por keys', 'By keys')}</h3>
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
                  {keyBreakdown.map((item, index) => (
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
                  ))}
                </div>
              </div>
            </article>
          </section>

          <section className="usage-panel usage-graph-panel">
            <div className="usage-panel-head">
              <div>
                <p>Activity Trend</p>
                <h3>{tr(locale, 'Solicitudes del rango', 'Requests in range')}</h3>
              </div>
              <span>{series.length} {tr(locale, 'puntos', 'points')}</span>
            </div>
            <div className="usage-bars">
              {series.length === 0 && <div className="empty-row"><Activity size={18} />{tr(locale, 'Sin actividad en el rango', 'No activity in this range')}</div>}
              {series.map((bucket) => (
                <div className="usage-bar-item" key={`${bucket.label}-${bucket.requests}`}>
                  <div className="usage-bar-track">
                    <span style={{ height: `${Math.max(6, (bucket.requests / seriesMax) * 100)}%` }} />
                  </div>
                  <strong>{bucket.requests}</strong>
                  <small>{bucket.label}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="usage-table-card">
            <div className="usage-panel-head">
              <div>
                <p>Recent Requests</p>
                <h3>{tr(locale, 'Tabla detallada', 'Detailed table')}</h3>
              </div>
              <span>{filtered.length} {tr(locale, 'en pantalla', 'shown')}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>API Key</th>
                    <th>Model</th>
                    <th>Reasoning</th>
                    <th>Endpoint</th>
                    <th>IP</th>
                    <th>Type</th>
                    <th>Billing</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Cache R</th>
                    <th>Cache C</th>
                    <th>Rate</th>
                    <th>Billed</th>
                    <th>Original</th>
                    <th>FRT</th>
                    <th>Duration</th>
                    <th className="right">{tr(locale, 'Costo', 'Cost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedRows.length === 0 && <tr><td colSpan={18}><div className="empty-row"><Activity size={18} />{tr(locale, 'No hay registros para ese rango', 'No records in this range')}</div></td></tr>}
                  {detailedRows.map((row) => (
                    <tr key={row.id}>
                      <td>{new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.time * 1000))}</td>
                      <td>{row.apiKey}</td>
                      <td><span className="usage-model">{row.model}</span></td>
                      <td>{row.reasoning}</td>
                      <td>{row.endpoint}</td>
                      <td>{row.ip}</td>
                      <td>{row.type}</td>
                      <td>{row.billingMode}</td>
                      <td>{compactNumber(row.inputTokens)}</td>
                      <td>{compactNumber(row.outputTokens)}</td>
                      <td>{compactNumber(row.cacheReadTokens)}</td>
                      <td>{compactNumber(row.cacheCreationTokens)}</td>
                      <td>{row.rateMultiplier.toFixed(3)}</td>
                      <td>{money(row.billedCost, 6)}</td>
                      <td>{money(row.originalCost, 6)}</td>
                      <td>{row.firstTokenMs ? `${Math.round(row.firstTokenMs)} ms` : '-'}</td>
                      <td>{formatDuration(row.durationMs || 0)}</td>
                      <td className="right strong">{money(row.billedCost, 6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function AdminView({ locale }: { locale: PortalLocale }) {
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

  useEffect(() => {
    let alive = true
    async function loadAdmin() {
      setLoading(true); setError('')
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
      ...admin.customers.map((customer) => [customer.username, customer.group, customer.status === 1 ? 'Activo' : 'Bloqueado', customer.balanceUsd, customer.requests, customer.tokens, customer.revenueUsd, customer.costUsd, customer.errors]),
    ]
    downloadText(`admin_clientes_${range}.csv`, `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`)
  }

  async function toggleModel(modelId: string, enabled: boolean) {
    if (!admin) return
    setSavingModel(modelId); setError('')
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
    setCreatingRedeem(true); setError('')
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
  }

  function editProvider(profile: ProviderProfile) {
    setProviderEditingId(profile.id)
    setProviderName(profile.name)
    setProviderDescription(profile.description)
    setProviderBaseUrl(profile.base_url)
    setProviderApiKey('')
    setProviderGroups(profile.target_groups)
    setProviderMultiplier(String(profile.price_multiplier))
  }

  async function saveProvider(event: FormEvent) {
    event.preventDefault(); setSavingProvider(true); setError('')
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
      setAdmin((current) => current ? { ...current, providerProfiles: providerEditingId === null ? [response.data, ...current.providerProfiles] : current.providerProfiles.map((profile) => profile.id === providerEditingId ? response.data : profile) } : current)
      resetProviderForm()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el perfil.')
    } finally { setSavingProvider(false) }
  }

  function toggleProviderGroup(group: string) {
    setProviderGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group])
  }

  async function activateProvider(id: number) {
    setProviderAction(id); setError('')
    try {
      await readJson(await fetch('/api/admin/providers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'activate', id }) }))
      setRefreshKey((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo activar el perfil.')
    } finally { setProviderAction(null) }
  }

  async function restoreProviders() {
    setProviderAction('restore'); setError('')
    try {
      await readJson(await fetch('/api/admin/providers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore' }) }))
      setRefreshKey((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo restaurar la configuración.')
    } finally { setProviderAction(null) }
  }

  const margin = admin?.totals.revenueUsd
    ? (admin.totals.netProfitUsd / admin.totals.revenueUsd) * 100
    : 0

  return <div className="admin-page">
    <section className="admin-command-bar">
      <div>
        <p className="eyebrow">Control financiero</p>
        <h2>{tr(locale, 'Rentabilidad del gateway', 'Gateway profitability')}</h2>
        <span>{tr(locale, 'Datos administrativos de New API', 'New API administrative data')}</span>
      </div>
      <div className="admin-actions">
        <label><CalendarRange size={16} /><select value={range} onChange={(event) => setRange(event.target.value as typeof range)}><option value="7d">{tr(locale, '7 días', '7 days')}</option><option value="30d">{tr(locale, '30 días', '30 days')}</option><option value="90d">{tr(locale, '90 días', '90 days')}</option><option value="all">{tr(locale, 'Histórico', 'All time')}</option></select></label>
        <button className="icon-button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} aria-label="Actualizar administración"><RefreshCw className={loading ? 'spin' : ''} size={17} /></button>
        <button className="secondary-button" onClick={exportCustomers} disabled={!admin}><Download size={17} />Exportar</button>
      </div>
    </section>

    {error && <div className="form-error">{error}</div>}
    {loading && !admin && <section className="usage-skeleton"><LoaderCircle className="spin" size={25} /><span>{tr(locale, 'Cargando métricas administrativas...', 'Loading administrative metrics...')}</span></section>}
    {admin && <>
      <section className="admin-stats-grid">
        <UsageStat label={tr(locale, 'Facturado por uso', 'Usage revenue')} value={money(admin.totals.revenueUsd, admin.totals.revenueUsd < 1 ? 4 : 2)} hint={`${compactNumber(admin.totals.requests)} ${tr(locale, 'solicitudes', 'requests')}`} icon={ReceiptText} tone="blue" />
        <UsageStat label={tr(locale, 'Costo proveedor', 'Provider cost')} value={money(admin.totals.costUsd, admin.totals.costUsd < 1 ? 4 : 2)} hint={admin.config.providerCostIsEstimate ? `${tr(locale, 'Estimado al', 'Estimated at')} ${(admin.config.upstreamFactor * 100).toFixed(1)}%` : tr(locale, 'Costo conciliado', 'Reconciled cost')} icon={CircleDollarSign} tone="coral" />
        <UsageStat label={tr(locale, 'Ganancia neta', 'Net profit')} value={money(admin.totals.netProfitUsd, Math.abs(admin.totals.netProfitUsd) < 1 ? 4 : 2)} hint={`${margin.toFixed(1)}% ${tr(locale, 'de margen', 'margin')}`} icon={TrendingUp} tone="green" />
        <UsageStat label={tr(locale, 'Clientes activos', 'Active customers')} value={`${admin.totals.activeCustomers}/${admin.totals.customers}`} hint={`${admin.totals.errors} ${tr(locale, 'errores en el rango', 'errors in range')}`} icon={Users} tone="violet" />
      </section>

      <section className="admin-ledger-strip">
        <div><small>Tokens procesados</small><strong>{compactNumber(admin.totals.totalTokens)}</strong></div>
        <div><small>Comisiones estimadas</small><strong>{money(admin.totals.paymentFeesUsd, 4)}</strong></div>
        <div><small>{tr(locale, 'Crédito asignado', 'Credited balance')}</small><strong>{money(admin.totals.creditedUsd, 4)}</strong></div>
        <div><small>{tr(locale, 'Última actualización', 'Last updated')}</small><strong>{new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(admin.generatedAt))}</strong></div>
      </section>

      {admin.truncated && <div className="admin-warning"><AlertTriangle size={17} />{tr(locale, 'El rango supera 2.000 registros por categoría; las tablas muestran una muestra limitada.', 'The range exceeds 2,000 records per category; tables show a limited sample.')}</div>}

      <section className="section-block redeem-admin-section">
        <div className="section-heading"><div><h3>{tr(locale, 'Códigos demo', 'Demo codes')}</h3><p>{tr(locale, 'Generá crédito de prueba para nuevos clientes. Valor recomendado: US$ 0.50.', 'Generate trial credit for new customers. Recommended value: US$ 0.50.')}</p></div><span className="info-chip"><ReceiptText size={15} />{redeemCodes.filter((code) => code.status === 'active').length} {tr(locale, 'activos', 'active')}</span></div>
        <form className="redeem-admin-form" onSubmit={createRedeemCodes}>
          <label>Monto USD<input type="number" min="0.01" max="100" step="0.01" value={redeemAmount} onChange={(event) => setRedeemAmount(event.target.value)} /></label>
          <label>Cantidad<input type="number" min="1" max="100" step="1" value={redeemCount} onChange={(event) => setRedeemCount(Number(event.target.value))} /></label>
          <label>Nota<input value={redeemNote} onChange={(event) => setRedeemNote(event.target.value)} placeholder="Campaña o cliente" /></label>
          <button className="primary-button" disabled={creatingRedeem}>{creatingRedeem ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}{tr(locale, 'Generar códigos', 'Generate codes')}</button>
        </form>
        <div className="table-wrap"><table className="admin-table redeem-table"><thead><tr><th>Código</th><th>Monto</th><th>Estado</th><th>Nota</th><th>Creado</th><th className="right">Acción</th></tr></thead><tbody>
          {redeemCodes.length === 0 && <tr><td colSpan={6}><div className="empty-row"><ReceiptText size={18} />{tr(locale, 'Todavía no hay códigos demo', 'No demo codes yet')}</div></td></tr>}
          {redeemCodes.slice(0, 40).map((code) => <tr key={code.id}><td><code>{code.code}</code></td><td>{money(Number(code.amount_usd), 2)}</td><td><span className={`admin-state ${code.status === 'active' ? 'active' : code.status === 'redeemed' ? 'blocked' : ''}`}>{code.status === 'active' ? 'Disponible' : code.status === 'redeemed' ? 'Canjeado' : code.status}</span></td><td>{code.note || '-'}</td><td>{formatDate(Number(code.created_at))}</td><td className="right"><button className="secondary-button key-use-button" onClick={() => navigator.clipboard.writeText(code.code)} type="button"><Copy size={15} />Copiar</button></td></tr>)}
        </tbody></table></div>
      </section>

      <section className="section-block provider-profile-section">
        <div className="section-heading"><div><h3>{tr(locale, 'Proveedores y modo emergencia', 'Providers and emergency mode')}</h3><p>{tr(locale, 'Cambiá Base URL y key madre sin recompilar el portal. Los grupos se detectan automáticamente desde New API.', 'Change the Base URL and master key without rebuilding the portal. Groups are detected automatically from New API.')}</p></div><span className="info-chip"><Server size={15} />{admin.providerProfiles.filter((profile) => profile.active).length ? tr(locale, 'Respaldo activo', 'Backup active') : tr(locale, 'Principal activo', 'Primary active')}</span></div>
        <div className="provider-profile-layout">
          <div className="provider-profile-list">
            {admin.providerProfiles.length === 0 && <div className="empty-row"><Server size={18} />{tr(locale, 'Todavía no hay perfiles configurados.', 'No provider profiles configured yet.')}</div>}
            {admin.providerProfiles.map((profile) => <article className={`provider-profile-row ${profile.active ? 'active' : ''}`} key={profile.id}><div className="provider-profile-icon"><Server size={17} /></div><div className="provider-profile-copy"><strong>{profile.name}</strong><small>{profile.description || tr(locale, 'Sin descripción', 'No description')}</small><code>{profile.base_url}</code><span>{profile.target_groups.join(', ')} · {profile.price_multiplier}x · {profile.keyConfigured ? profile.maskedKey : tr(locale, 'Sin key', 'No key')}</span></div><div className="provider-profile-actions"><span className={`admin-state ${profile.active ? 'active' : ''}`}>{profile.active ? tr(locale, 'Activo', 'Active') : tr(locale, 'Disponible', 'Available')}</span><button type="button" className="secondary-button" onClick={() => editProvider(profile)}><Eye size={15} />{tr(locale, 'Editar', 'Edit')}</button><button type="button" className="primary-button" onClick={() => activateProvider(profile.id)} disabled={providerAction === profile.id}>{providerAction === profile.id ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}{tr(locale, 'Aplicar', 'Apply')}</button></div></article>)}
            {admin.providerProfiles.length > 0 && <button type="button" className="secondary-button provider-restore-button" onClick={restoreProviders} disabled={providerAction === 'restore'}>{providerAction === 'restore' ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}{tr(locale, 'Restaurar configuración anterior', 'Restore previous configuration')}</button>}
          </div>
          <form className="provider-profile-form" onSubmit={saveProvider}>
            <div className="provider-form-title"><strong>{providerEditingId === null ? tr(locale, 'Nuevo perfil', 'New profile') : tr(locale, 'Editar perfil', 'Edit profile')}</strong><small>{tr(locale, 'Las credenciales quedan solo en el servidor.', 'Credentials stay on the server only.')}</small></div>
            <label>{tr(locale, 'Nombre', 'Name')}<input name="provider-profile-name" autoComplete="off" value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder="FastAI 0.2x" required /></label>
            <label>{tr(locale, 'Descripción', 'Description')}<input name="provider-profile-description" autoComplete="off" value={providerDescription} onChange={(event) => setProviderDescription(event.target.value)} placeholder="Proveedor de respaldo" /></label>
            <label>Base URL<input name="provider-base-url" autoComplete="url" spellCheck={false} value={providerBaseUrl} onChange={(event) => setProviderBaseUrl(event.target.value)} placeholder="https://api.proveedor.com/v1" required /></label>
            <label>API key madre<input name="provider-api-key" autoComplete="new-password" type="password" value={providerApiKey} onChange={(event) => setProviderApiKey(event.target.value)} placeholder={providerEditingId === null ? 'sk-...' : tr(locale, 'Dejar vacío para conservarla', 'Leave empty to keep current')} required={providerEditingId === null} /></label>
            <fieldset className="provider-group-picker"><legend>{tr(locale, 'Grupos que cambiará este perfil', 'Groups changed by this profile')}</legend><div className="provider-group-options">{(admin.providerGroups.length ? admin.providerGroups : ['default', 'clientes', 'clientes_025', 'claude']).map((group) => <label className={`provider-group-option ${providerGroups.includes(group) ? 'selected' : ''}`} key={group}><input type="checkbox" checked={providerGroups.includes(group)} onChange={() => toggleProviderGroup(group)} /><span>{providerGroups.includes(group) && <Check size={13} />}</span><strong>{group}</strong></label>)}</div></fieldset>
            <label>{tr(locale, 'Multiplicador de referencia', 'Reference multiplier')}<input name="provider-price-multiplier" autoComplete="off" type="number" min="0.001" step="0.001" value={providerMultiplier} onChange={(event) => setProviderMultiplier(event.target.value)} required /></label>
            <div className="provider-form-actions"><button type="submit" className="primary-button" disabled={savingProvider}>{savingProvider ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{tr(locale, 'Guardar perfil', 'Save profile')}</button>{providerEditingId !== null && <button type="button" className="secondary-button" onClick={resetProviderForm}>{tr(locale, 'Cancelar', 'Cancel')}</button>}</div>
          </form>
        </div>
      </section>

      <section className="section-block model-control-section">
        <div className="section-heading"><div><h3>{tr(locale, 'Catálogo y grupos de venta', 'Catalog and sales groups')}</h3><p>{tr(locale, 'La selección es manual. El estado HTTP solo se muestra como diagnóstico.', 'Selection is manual. HTTP status is shown for diagnostics only.')}</p></div><span className="info-chip"><Sparkles size={15} />{admin.modelControls.filter((model) => model.enabled).length} {tr(locale, 'publicados', 'published')}</span></div>
        <div className="model-control-groups">
          {(['clientes', 'claude'] as const).map((group) => <div className="model-control-group" key={group}><div className="model-control-group-title"><strong>{group === 'claude' ? 'Claude' : 'ChatGPT'}</strong><span>{group === 'claude' ? 'Modelos Anthropic' : 'Modelos GPT, Codex y otros'}</span></div><div className="model-control-list">{admin.modelControls.filter((model) => model.group === group).map((model) => <div className="model-control-row" key={model.modelId}><div><strong>{model.label}</strong><code>{model.modelId}</code></div><button type="button" className={`model-toggle ${model.enabled ? 'enabled' : ''}`} aria-pressed={model.enabled} onClick={() => toggleModel(model.modelId, !model.enabled)} disabled={savingModel === model.modelId}>{savingModel === model.modelId ? <LoaderCircle className="spin" size={16} /> : model.enabled ? <><Check size={15} />Publicado</> : 'Oculto'}</button></div>)}</div></div>)}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h3>Clientes registrados</h3><p>Saldo, consumo y rentabilidad por cuenta</p></div><span className="info-chip"><Users size={15} />{admin.customers.length} clientes</span></div>
        <div className="table-wrap"><table className="admin-table"><thead><tr><th>Cliente</th><th>Grupo</th><th>Estado</th><th>Saldo</th><th>Requests</th><th>Tokens</th><th>Facturado</th><th>Costo est.</th><th>Ganancia bruta</th><th className="right">Alertas</th></tr></thead><tbody>
          {admin.customers.length === 0 && <tr><td colSpan={10}><div className="empty-row"><Users size={18} />No hay clientes registrados</div></td></tr>}
          {admin.customers.map((customer) => <tr key={customer.username}><td><span className="admin-customer"><span className={`status-dot ${customer.status === 1 ? 'active' : ''}`} /><span><strong>{customer.displayName}</strong><small>{customer.username}</small></span></span></td><td><code>{customer.group}</code></td><td><span className={`admin-state ${customer.status === 1 ? 'active' : 'blocked'}`}>{customer.status === 1 ? 'Activo' : 'Bloqueado'}</span></td><td>{money(customer.balanceUsd, 4)}</td><td>{compactNumber(customer.requests)}</td><td>{compactNumber(customer.tokens)}</td><td>{money(customer.revenueUsd, 4)}</td><td>{money(customer.costUsd, 4)}</td><td className="profit-cell">{money(customer.revenueUsd - customer.costUsd, 4)}</td><td className="right">{customer.errors ? <span className="risk-badge"><AlertTriangle size={13} />{customer.errors}</span> : <span className="clean-badge">Normal</span>}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="admin-split-grid">
        <article className="admin-panel">
          <div className="section-heading"><div><h3>{tr(locale, 'Modelos más utilizados', 'Most used models')}</h3><p>{tr(locale, 'Ordenados por facturación', 'Sorted by revenue')}</p></div><BarChart3 size={18} /></div>
          <div className="admin-ranking">{admin.models.length === 0 && <div className="empty-row"><BarChart3 size={18} />Sin consumo</div>}{admin.models.slice(0, 8).map((model, index) => <div className="admin-rank-row" key={model.model}><span className="rank-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{model.model}</strong><small>{compactNumber(model.requests)} req · {compactNumber(model.tokens)} tokens</small></div><span><strong>{money(model.revenueUsd, 4)}</strong><small>{money(model.profitUsd, 4)} margen</small></span></div>)}</div>
        </article>
        <article className="admin-panel">
          <div className="section-heading"><div><h3>Consumo sospechoso</h3><p>Errores repetidos o volumen alto</p></div><AlertTriangle size={18} /></div>
          <div className="admin-risk-list">{admin.suspicious.length === 0 && <div className="admin-all-clear"><ShieldCheck size={24} /><strong>Sin alertas</strong><span>No se detectaron patrones anormales.</span></div>}{admin.suspicious.map((customer) => <div className="admin-risk-row" key={customer.username}><span className="risk-icon"><AlertTriangle size={16} /></span><div><strong>{customer.username}</strong><small>{customer.reason}</small></div><span>{compactNumber(customer.requests)} req</span></div>)}</div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h3>Ganancia por API key</h3><p>Rentabilidad agrupada por credencial</p></div><KeyRound size={18} /></div>
        <div className="table-wrap"><table className="admin-table"><thead><tr><th>API Key</th><th>Cliente</th><th>Requests</th><th>Tokens</th><th>Facturado</th><th>Costo est.</th><th className="right">Ganancia bruta</th></tr></thead><tbody>
          {admin.keys.length === 0 && <tr><td colSpan={7}><div className="empty-row"><KeyRound size={18} />Sin consumo por API key</div></td></tr>}
          {admin.keys.slice(0, 50).map((key) => <tr key={`${key.username}-${key.key}`}><td><span className="key-title"><KeyRound size={15} />{key.key}</span></td><td>{key.username}</td><td>{compactNumber(key.requests)}</td><td>{compactNumber(key.tokens)}</td><td>{money(key.revenueUsd, 4)}</td><td>{money(key.costUsd, 4)}</td><td className="right profit-cell">{money(key.profitUsd, 4)}</td></tr>)}
        </tbody></table></div>
      </section>
    </>}
  </div>
}

function ModelsView({ data, locale }: { data: DashboardData; locale: PortalLocale }) {
  return <div className="view-stack">
    <section className="models-hero">
      <div>
        <p className="eyebrow">{tr(locale, 'Catálogo comercial', 'Commercial catalog')}</p>
        <h2>{tr(locale, 'Modelos disponibles', 'Available models')}</h2>
        <p>{tr(locale, 'Vista compacta con identidad visual real, precios y estado de venta en una sola pantalla.', 'A compact view with model identity, prices and sales status in one place.')}</p>
      </div>
      <div className="catalog-summary">
        <div><Sparkles size={20} /><span><strong>{data.models.length} {tr(locale, 'modelos', 'models')}</strong><small>{tr(locale, 'Plan Profesional', 'Professional plan')}</small></span></div>
        <div><Gauge size={20} /><span><strong>{tr(locale, 'Pago por uso', 'Pay as you go')}</strong><small>{tr(locale, 'Sin costo fijo', 'No fixed fee')}</small></span></div>
      </div>
    </section>

    <section className="model-grid">
      {data.models.map((model) => {
        const visual = getModelVisual(model.id)
        const priceLines = [
          { label: tr(locale, 'Entrada', 'Input'), value: money(model.input, model.input < 0.1 ? 4 : 3) },
          { label: tr(locale, 'Salida', 'Output'), value: money(model.output, model.output < 0.1 ? 4 : 3) },
          { label: 'Cache read', value: money(model.cacheRead, 5) },
          { label: 'Cache write', value: model.cacheWrite > 0 ? money(model.cacheWrite, 5) : '-' },
        ]
        return (
          <article className={`model-card tone-${model.accent}`} key={model.id}>
            <div className="model-card-top">
              <span className={`model-badge ${model.accent}`}><visual.Icon size={18} /></span>
              <span className="available-badge"><Check size={13} />{tr(locale, 'Disponible', 'Available')}</span>
            </div>
            <div className="model-card-head">
              <div>
                <h3>{model.label}</h3>
                <code>{model.id}</code>
              </div>
              <span className={`model-family family-${visual.family.toLowerCase()}`}>{visual.family}</span>
            </div>
            <div className="model-chip-row">
              <span className="model-chip">{model.id.includes('claude') ? 'Anthropic' : 'OpenAI'}</span>
              <span className="model-chip">{visual.mode}</span>
            </div>
            <div className="model-price-grid">
              {priceLines.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </article>
        )
      })}
    </section>
  </div>
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
  const customAmountValue = Number(customAmount)
  const minimumAmount = paymentMethod === 'crypto2328' ? MINIMUM_CRYPTO_PAYMENT_USD : 1
  const customAmountValid = customAmount.trim() !== '' && Number.isFinite(customAmountValue) && customAmountValue >= minimumAmount && customAmountValue <= 10_000 && Math.round((customAmountValue + Number.EPSILON) * 100) / 100 === customAmountValue
  async function checkout(amount: number) {
    setBusyAmount(amount); setMessage('')
    try {
      const body = await readJson(await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, provider: paymentMethod }) }))
      const paymentUrl = paymentMethod === 'crypto2328' ? body.data?.invoiceUrl : body.data?.initPoint
      if (!paymentUrl) throw new Error(paymentMethod === 'crypto2328' ? tr(locale, '2328.io no devolvió el enlace de pago.', '2328.io did not return a payment link.') : tr(locale, 'Mercado Pago no devolvió el enlace de pago.', 'Mercado Pago did not return a payment link.'))
      window.location.assign(paymentUrl)
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : tr(locale, 'Pagos no disponibles.', 'Payments are unavailable.')) }
    finally { setBusyAmount(null) }
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
    setRedeeming(true); setMessage('')
    try {
      const body = await readJson(await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode }),
      }))
      setRedeemCode('')
      setMessage(`${tr(locale, 'Código canjeado. Se acreditaron', 'Code redeemed.')} ${money(body.data.amountUsd, 2)} ${tr(locale, 'en tu cuenta.', 'was added to your account.')}`)
      await onRedeemed()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : tr(locale, 'No se pudo canjear el código.', 'Could not redeem the code.'))
    } finally {
      setRedeeming(false)
    }
  }
  const balance = data.user.quota / data.quotaPerUsd
  return <div className="view-stack">
    {paymentReturn && <section className={`payment-result ${paymentReturn}`} role="status">
      <span className="payment-result-icon">{paymentReturn === 'success' ? <Check size={20} /> : paymentReturn === 'pending' ? <Clock3 size={20} /> : <AlertTriangle size={20} />}</span>
      <div><strong>{paymentReturn === 'success' ? tr(locale, 'Pago aprobado', 'Payment approved') : paymentReturn === 'pending' ? tr(locale, 'Pago pendiente', 'Payment pending') : tr(locale, 'Pago no completado', 'Payment incomplete')}</strong><p>{paymentReturn === 'success' ? tr(locale, 'El proveedor confirmó la operación. El saldo se acredita automáticamente; actualizá el panel si todavía no aparece.', 'The provider confirmed the payment. Balance is credited automatically; refresh the panel if it does not appear yet.') : paymentReturn === 'pending' ? tr(locale, 'El proveedor todavía está procesando la operación. El saldo se acreditará cuando se confirme.', 'The provider is still processing the payment. Balance will be credited once confirmed.') : tr(locale, 'No se acreditó saldo. Podés volver a intentarlo cuando quieras.', 'No balance was credited. You can try again whenever you want.')}</p></div>
      <button className="icon-button" onClick={onDismissPayment} aria-label={tr(locale, 'Cerrar estado del pago', 'Close payment status')}><X size={17} /></button>
    </section>}
    <section className="wallet-hero">
      <div><p>{tr(locale, 'Saldo disponible', 'Available balance')}</p><strong>{money(balance, balance < 1 ? 4 : 2)}</strong><span>{tr(locale, 'Cuenta', 'Account')} {data.user.username}</span></div>
      <span className="wallet-icon"><WalletCards size={28} /></span>
    </section>
    <section className="section-block">
      <div className="section-heading"><div><h3>{tr(locale, 'Métodos de pago', 'Payment methods')}</h3><p>{tr(locale, 'Elegí cómo cargar crédito en tu cuenta', 'Choose how to add credit to your account')}</p></div></div>
      <div className="payment-method-grid">
        <button className={`payment-method ${paymentMethod === 'mercadopago' ? 'active' : ''}`} onClick={() => setPaymentMethod('mercadopago')}><span className="payment-method-icon"><CreditCard size={19} /></span><span><strong>Mercado Pago</strong><small>ARS · US$ 1.600 por dólar</small></span>{paymentMethod === 'mercadopago' ? <ShieldCheck size={17} /> : <Check size={17} />}</button>
        <button className={`payment-method crypto-method featured-payment ${paymentMethod === 'crypto2328' ? 'active' : ''}`} onClick={() => setPaymentMethod('crypto2328')}><span className="payment-method-icon crypto"><Bitcoin size={19} /></span><span><strong>Crypto · 2328.io <em className="payment-featured-badge">{tr(locale, 'Recomendado', 'Recommended')}</em></strong><small>USDT, BTC, ETH y más · {tr(locale, 'mínimo', 'minimum')} US$ 1</small></span>{paymentMethod === 'crypto2328' ? <ShieldCheck size={17} /> : <Check size={17} />}</button>
      </div>
    </section>
    <section className="section-block">
      <div className="section-heading"><div><h3>{tr(locale, 'Cargar saldo', 'Add balance')}</h3><p>{paymentMethod === 'crypto2328' ? tr(locale, 'Pago crypto seguro · mínimo US$ 1 · conversión automática a USDT', 'Secure crypto payment · US$ 1 minimum · automatic USDT conversion') : tr(locale, 'Pago seguro con Mercado Pago · mínimo US$ 1', 'Secure Mercado Pago payment · US$ 1 minimum')}</p></div></div>
      <div className="package-grid">{[1, 5, 10, 25].filter((amount) => amount >= minimumAmount).map((amount) => <button className={`package-card ${amount === 10 ? 'featured' : ''}`} key={amount} onClick={() => checkout(amount)} disabled={busyAmount !== null}><span>{amount === minimumAmount ? tr(locale, 'Recarga mínima', 'Minimum top-up') : amount === 10 ? tr(locale, 'Más elegido', 'Most popular') : tr(locale, 'Crédito API', 'API credit')}</span><strong>{money(amount)}</strong><small>{paymentMethod === 'crypto2328' ? tr(locale, 'Pago único en crypto', 'One-time crypto payment') : `AR$ ${(amount * 1600).toLocaleString('es-AR')} · ${tr(locale, 'Pago único', 'One-time payment')}`}</small><span className="package-cta">{busyAmount === amount ? tr(locale, 'Conectando...', 'Connecting...') : tr(locale, 'Pagar', 'Pay')} <ChevronRight size={16} /></span></button>)}</div>
      <div className="custom-topup">
        <div className="custom-topup-copy"><strong>{tr(locale, 'Otro importe', 'Custom amount')}</strong><small>{tr(locale, 'Recargá desde', 'Top up from')} US$ {minimumAmount}, {tr(locale, 'hasta', 'up to')} US$ 10.000.</small></div>
        <form className="custom-topup-form" onSubmit={submitCustomAmount}>
          <label className="currency-input"><span>US$</span><input type="number" min={minimumAmount} max="10000" step="0.01" inputMode="decimal" placeholder={paymentMethod === 'crypto2328' ? '1,50' : '1,50'} value={customAmount} onChange={(event) => { setCustomAmount(event.target.value); setMessage('') }} aria-label="Importe personalizado en dólares" /></label>
          <button className="primary-button" type="submit" disabled={busyAmount !== null || !customAmountValid}><CreditCard size={17} />{tr(locale, 'Continuar al pago', 'Continue to payment')}</button>
        </form>
        {customAmountValid && <small className="custom-topup-total">{paymentMethod === 'crypto2328' ? `${tr(locale, 'Total a pagar:', 'Total to pay:')} US$ ${customAmountValue.toFixed(2)} ${tr(locale, 'en crypto.', 'in crypto.')}` : `${tr(locale, 'Total a pagar:', 'Total to pay:')} AR$ ${(Math.round(customAmountValue * 1600)).toLocaleString('es-AR')}`}</small>}
        {customAmount && !customAmountValid && <small className="custom-topup-error">{tr(locale, 'Usá un importe desde', 'Use an amount from')} US$ {minimumAmount}, {tr(locale, 'con hasta 2 decimales.', 'with up to 2 decimals.')}</small>}
      </div>
      {message && <div className="payment-message"><CreditCard size={18} />{message}</div>}
    </section>
    <section className="section-block">
      <div className="section-heading"><div><h3>{tr(locale, 'Canjear código', 'Redeem code')}</h3><p>{tr(locale, 'Usá un código demo o promocional para acreditar saldo en tu cuenta.', 'Use a demo or promotional code to add credit to your account.')}</p></div><ReceiptText size={19} /></div>
      <form className="redeem-form" onSubmit={submitRedeem}>
        <label><span>{tr(locale, 'Código', 'Code')}</span><input value={redeemCode} onChange={(event) => { setRedeemCode(event.target.value.toUpperCase()); setMessage('') }} placeholder="ORB-XXXX-XXXX-XXXX" /></label>
        <button className="primary-button" disabled={redeeming || !redeemCode.trim()}>{redeeming ? <LoaderCircle className="spin" size={17} /> : <ReceiptText size={17} />}{tr(locale, 'Canjear código', 'Redeem code')}</button>
      </form>
    </section>
  </div>
}

const snippets = {
  env: (base: string, key: string) => `OPENAI_BASE_URL=${base}\nOPENAI_API_KEY=${key || 'sk-tu-api-key'}`,
  python: (base: string, key: string) => `from openai import OpenAI\n\nclient = OpenAI(\n    base_url="${base}",\n    api_key="${key || 'sk-tu-api-key'}",\n)\n\nresponse = client.chat.completions.create(\n    model="gpt-5.4-mini",\n    messages=[{"role": "user", "content": "Hola"}],\n)\n\nprint(response.choices[0].message.content)`,
  node: (base: string, key: string) => `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  baseURL: "${base}",\n  apiKey: "${key || 'sk-tu-api-key'}",\n});\n\nconst response = await client.chat.completions.create({\n  model: "gpt-5.4-mini",\n  messages: [{ role: "user", content: "Hola" }],\n});\n\nconsole.log(response.choices[0].message.content);`,
  curl: (base: string, key: string) => `curl ${base}/chat/completions \\\n  -H "Authorization: Bearer ${key || 'sk-tu-api-key'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"gpt-5.4-mini","messages":[{"role":"user","content":"Hola"}]}'`,
}

function SetupView({ data, locale }: { data: DashboardData; locale: PortalLocale }) {
  const [tab, setTab] = useState<keyof typeof snippets>('env')
  const [selectedKey, setSelectedKey] = useState('')
  const [revealed, setRevealed] = useState('')
  const [copied, setCopied] = useState(false)
  async function reveal() {
    if (!selectedKey) return setRevealed('')
    const body = await readJson(await fetch(`/api/keys/${selectedKey}/reveal`, { method: 'POST' }))
    setRevealed(body.data.key)
  }
  const code = snippets[tab](data.gatewayUrl, revealed)
  async function copy() { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800) }
  return <div className="view-stack"><section className="connection-bar"><div><span className="connection-status"><span />{tr(locale, 'API operativa', 'API operational')}</span><code>{data.gatewayUrl}</code></div><button className="icon-button" onClick={() => navigator.clipboard.writeText(data.gatewayUrl)} aria-label="Copiar Base URL"><Copy size={18} /></button></section><section className="section-block"><div className="section-heading"><div><h3>{tr(locale, 'Configuración automática', 'Automatic setup')}</h3><p>{tr(locale, 'Descargá el asistente y pegá tu key una sola vez. Configura Codex, Claude o ambos.', 'Download the assistant and paste your key once. It configures Codex, Claude or both.')}</p></div><Download size={20} /></div><div className="quick-band"><div><strong>Orbiqen para Windows</strong><small>{tr(locale, 'Incluye activador, backups y restaurador de configuración oficial.', 'Includes activator, backups and official configuration restore.')}</small></div><div className="quick-band-actions"><a className="primary-button" href="/downloads/orbiqen-windows/Orbiqen-Windows.rar" download><Download size={17} />{tr(locale, 'Descargar asistente', 'Download assistant')}</a><a className="secondary-button" href="/downloads/orbiqen-windows/LEEME-PRIMERO.txt" target="_blank" rel="noreferrer">{tr(locale, 'Leer instrucciones', 'Read instructions')}</a></div></div></section><section className="code-workspace"><div className="code-toolbar"><div className="code-tabs">{(['env', 'python', 'node', 'curl'] as const).map((item) => <button className={tab === item ? 'active' : ''} key={item} onClick={() => setTab(item)}>{item === 'env' ? '.env' : item}</button>)}</div><button className="copy-code" onClick={copy}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? tr(locale, 'Copiado', 'Copied') : tr(locale, 'Copiar', 'Copy')}</button></div><pre><code>{code}</code></pre></section><section className="key-selector"><div><KeyRound size={19} /><span><strong>{tr(locale, 'Usar una API Key', 'Use an API Key')}</strong><small>{tr(locale, 'La clave se muestra solo en este navegador', 'The key is shown only in this browser')}</small></span></div><select value={selectedKey} onChange={(event) => { setSelectedKey(event.target.value); setRevealed('') }}><option value="">{tr(locale, 'Seleccionar clave', 'Select key')}</option>{data.keys.map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</select><button className="secondary-button" onClick={reveal} disabled={!selectedKey}>{tr(locale, 'Insertar', 'Insert')}</button></section></div>
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
    const saved = window.localStorage.getItem('orbiqen-portal-locale')
    if (saved === 'es' || saved === 'en') setPortalLocale(saved)
  }, [])

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
  if (auth === 'anonymous') return <AuthScreen onAuthenticated={load} initialMode={initialMode} locale={portalLocale} />
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
