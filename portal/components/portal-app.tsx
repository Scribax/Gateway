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
  Trash2,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

type View = 'overview' | 'usage' | 'status' | 'keys' | 'models' | 'wallet' | 'setup' | 'admin'
type PaymentReturn = 'success' | 'pending' | 'failure'
type PaymentMethod = 'mercadopago' | 'crypto'
const MINIMUM_CRYPTO_PAYMENT_USD = 10
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
  models: Array<AdminMetricRow & { model: string }>
  keys: Array<AdminMetricRow & { key: string; username: string }>
  suspicious: Array<AdminCustomer & { reason: string }>
  truncated: boolean
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

const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }> = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'status', label: 'Estado', icon: Server },
  { id: 'keys', label: 'API Keys', icon: KeyRound },
  { id: 'models', label: 'Modelos', icon: Sparkles },
  { id: 'wallet', label: 'Saldo', icon: WalletCards },
  { id: 'setup', label: 'Conectar', icon: Code2 },
  { id: 'admin', label: 'Administración', icon: Users, adminOnly: true },
]

const viewTitles: Record<View, { title: string; subtitle: string }> = {
  overview: { title: 'Resumen', subtitle: 'Tu actividad y saldo en un solo lugar' },
  usage: { title: 'Usage Records', subtitle: 'Uso real por cliente y por modelo' },
  status: { title: 'Channel Status', subtitle: 'Estado y actividad de tus canales comerciales' },
  keys: { title: 'API Keys', subtitle: 'Credenciales para tus aplicaciones' },
  models: { title: 'Modelos', subtitle: 'Precios finales por millón de tokens' },
  wallet: { title: 'Saldo', subtitle: 'Crédito disponible para tus consumos' },
  setup: { title: 'Conectar', subtitle: 'Configuración lista para tu entorno' },
  admin: { title: 'Administración', subtitle: 'Clientes, costos y rentabilidad del gateway' },
}

function money(value: number, digits = 2) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
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

function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
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
          <h1>Una API.<br />Todos tus modelos.</h1>
          <p>Administrá saldo, claves y consumo desde un panel hecho para trabajar.</p>
        </div>
        <div className="auth-proof"><ShieldCheck size={18} /><span>Claves aisladas y control de consumo</span></div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-mobile-brand brand"><BrandLogo /></div>
        <form className="auth-form" onSubmit={submit}>
          <div>
            <p className="eyebrow">{mode === 'login' ? 'Bienvenido' : 'Nueva cuenta'}</p>
            <h2>{mode === 'login' ? 'Ingresá a tu panel' : 'Creá tu cuenta'}</h2>
          </div>
          <label>
            Usuario
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="tu_usuario" required />
          </label>
          {mode === 'register' && <>
            <label>
              Correo electrónico
              <input value={email} onChange={(event) => { setEmail(event.target.value); setCodeSent(false); setCooldown(0) }} type="email" autoComplete="email" placeholder="vos@tuempresa.com" required />
            </label>
            <label>
              Código de verificación
              <span className="verification-field">
                <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/[^a-fA-F0-9]/g, '').toLowerCase().slice(0, 6))} inputMode="text" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} maxLength={6} placeholder="a1b2c3" pattern="[a-fA-F0-9]{6}" required />
                <button className="secondary-button verification-send" type="button" onClick={sendVerificationCode} disabled={sendingCode || cooldown > 0 || !email}>
                  {sendingCode ? <LoaderCircle className="spin" size={17} /> : <Mail size={17} />}
                  {cooldown > 0 ? `${cooldown}s` : codeSent ? 'Reenviar' : 'Enviar código'}
                </button>
              </span>
            </label>
            {codeSent && <p className="form-success">Código enviado. Revisá también la carpeta de spam.</p>}
          </>}
          <label>
            Contraseña
            <span className="password-field">
              <input value={password} onChange={(event) => setPassword(event.target.value)} type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo 8 caracteres" required />
              <button type="button" className="icon-button inline-icon" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </span>
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={18} />}{mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
          <button className="text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setCodeSent(false); setCooldown(0) }}>
            {mode === 'login' ? 'Crear una cuenta nueva' : 'Ya tengo una cuenta'}
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

function Overview({ data, setView }: { data: DashboardData; setView: (view: View) => void }) {
  const available = data.user.quota / data.quotaPerUsd
  const spent = data.user.used_quota / data.quotaPerUsd
  const activeKeys = data.keys.filter((key) => key.status === 1).length
  return (
    <div className="view-stack">
      <section className="stats-grid">
        <Stat label="Saldo disponible" value={money(available, available < 1 ? 4 : 2)} hint="Crédito actual" icon={CircleDollarSign} tone="green" />
        <Stat label="Consumo histórico" value={money(spent, spent < 1 ? 4 : 2)} hint={`${data.logTotal} operaciones`} icon={Activity} tone="coral" />
        <Stat label="Solicitudes" value={compactNumber(data.user.request_count)} hint="Procesadas correctamente" icon={Gauge} tone="blue" />
        <Stat label="Claves activas" value={String(activeKeys)} hint={`${data.keys.length} creadas`} icon={KeyRound} tone="charcoal" />
      </section>
      <section className="quick-band">
        <div><span className="quick-icon"><Server size={20} /></span><div><strong>Tu endpoint está listo</strong><code>{data.gatewayUrl}</code></div></div>
        <button className="secondary-button" onClick={() => setView('setup')}>Ver configuración <ChevronRight size={17} /></button>
      </section>
      <section className="section-block">
        <div className="section-heading"><div><h3>Actividad reciente</h3><p>Últimas solicitudes procesadas</p></div><button className="text-action" onClick={() => setView('keys')}>Gestionar claves <ArrowUpRight size={16} /></button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Modelo</th><th>API Key</th><th>Tokens</th><th className="right">Costo</th></tr></thead>
            <tbody>
              {data.logs.length === 0 && <tr><td colSpan={5}><div className="empty-row"><Activity size={20} />Todavía no hay actividad</div></td></tr>}
              {data.logs.map((log) => <tr key={log.id}><td>{formatDate(log.created_at)}</td><td><span className="model-name">{log.model_name || 'N/D'}</span></td><td>{log.token_name || 'Sin nombre'}</td><td>{(log.prompt_tokens || 0) + (log.completion_tokens || 0)}</td><td className="right strong">{money((log.quota || 0) / data.quotaPerUsd, 6)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function KeyModal({ data, onClose, onCreated }: { data: DashboardData; onClose: () => void; onCreated: (key: string) => void }) {
  const [name, setName] = useState('mi-aplicacion')
  const [quota, setQuota] = useState(Math.min(10, Math.max(1, Math.floor(data.user.quota / data.quotaPerUsd))))
  const [models, setModels] = useState<string[]>(data.models.map((model) => model.id))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleModel(id: string) {
    setModels((current) => current.includes(id) ? current.filter((model) => model !== id) : [...current, id])
  }

  async function create(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const body = await readJson(await fetch('/api/keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quotaUsd: quota, group: 'default', models }),
      }))
      onCreated(body.data.key)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear la clave.') }
    finally { setLoading(false) }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form className="modal" onSubmit={create}>
      <div className="modal-header"><div><p className="eyebrow">Nueva credencial</p><h3>Crear API Key</h3></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
      <div className="modal-body">
        <label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} required /></label>
        <label>Límite de consumo (USD)<input type="number" min="0.01" step="0.01" value={quota} onChange={(event) => setQuota(Number(event.target.value))} required /></label>
        <fieldset><legend>Modelos permitidos</legend><div className="model-check-grid">{data.models.map((model) => <label className={`check-row ${models.includes(model.id) ? 'selected' : ''}`} key={model.id}><input type="checkbox" checked={models.includes(model.id)} onChange={() => toggleModel(model.id)} /><span>{models.includes(model.id) && <Check size={14} />}</span>{model.label}</label>)}</div></fieldset>
        {error && <div className="form-error">{error}</div>}
      </div>
      <div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={loading || models.length === 0}>{loading ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}Crear clave</button></div>
    </form>
  </div>
}

function SecretModal({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copy() { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1800) }
  return <div className="modal-backdrop"><div className="modal secret-modal"><div className="modal-header"><div><p className="eyebrow">API Key</p><h3>Credencial lista</h3></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div><div className="modal-body"><div className="secret-box"><code>{secret}</code><button className="icon-button" onClick={copy} aria-label="Copiar">{copied ? <Check size={19} /> : <Copy size={19} />}</button></div><p className="security-note"><ShieldCheck size={17} />Guardala en un gestor de secretos y no la incluyas en código público.</p></div><div className="modal-footer"><button className="primary-button" onClick={onClose}>Listo</button></div></div></div>
}

function KeysView({ data, reload }: { data: DashboardData; reload: () => Promise<void> }) {
  const [creating, setCreating] = useState(false)
  const [secret, setSecret] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function reveal(id: number) {
    setBusyId(id); setError('')
    try { const body = await readJson(await fetch(`/api/keys/${id}/reveal`, { method: 'POST' })); setSecret(body.data.key) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo revelar la clave.') }
    finally { setBusyId(null) }
  }
  async function remove(id: number) {
    if (!confirm('¿Eliminar esta API Key? Las aplicaciones que la usen dejarán de funcionar.')) return
    setBusyId(id); setError('')
    try { await readJson(await fetch(`/api/keys/${id}`, { method: 'DELETE' })); await reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la clave.') }
    finally { setBusyId(null) }
  }

  return <div className="view-stack"><div className="view-actions"><div className="info-chip"><ShieldCheck size={16} />{data.keys.filter((key) => key.status === 1).length} activas</div><button className="primary-button" onClick={() => setCreating(true)}><Plus size={18} />Crear API Key</button></div>{error && <div className="form-error">{error}</div>}<section className="section-block"><div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Credencial</th><th>Modelos</th><th>Saldo</th><th>Último uso</th><th className="right">Acciones</th></tr></thead><tbody>{data.keys.length === 0 && <tr><td colSpan={6}><div className="empty-row"><KeyRound size={20} />No hay claves creadas</div></td></tr>}{data.keys.map((key) => <tr key={key.id}><td><span className="key-title"><span className={`status-dot ${key.status === 1 ? 'active' : ''}`} />{key.name}</span></td><td><code className="masked-key">{key.key}</code></td><td><span className="model-count">{key.model_limits ? key.model_limits.split(',').length : 'Todos'}</span></td><td>{money(key.remain_quota / data.quotaPerUsd, 4)}</td><td>{formatDate(key.accessed_time)}</td><td className="right"><span className="action-group"><button className="icon-button" onClick={() => reveal(key.id)} disabled={busyId === key.id} aria-label="Revelar clave">{busyId === key.id ? <LoaderCircle className="spin" size={17} /> : <Eye size={17} />}</button><button className="icon-button danger" onClick={() => remove(key.id)} disabled={busyId === key.id} aria-label="Eliminar clave"><Trash2 size={17} /></button></span></td></tr>)}</tbody></table></div></section>{creating && <KeyModal data={data} onClose={() => setCreating(false)} onCreated={async (key) => { setCreating(false); setSecret(key); await reload() }} />}{secret && <SecretModal secret={secret} onClose={() => setSecret('')} />}</div>
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

function Donut({ items, total, tone }: { items: Array<{ label: string; value: number; color: string }>; total: string; tone: string }) {
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
        <span>selección activa</span>
      </div>
    </div>
  )
}

function UsageView({ data }: { data: DashboardData }) {
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
  const logs = usage?.logs || []
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
          <h2>Uso real por cliente</h2>
          <span>Todo el consumo que ve este usuario sale de sus propios logs en New API.</span>
        </div>
        <div className="usage-hero-meta">
          <div><small>Cuenta</small><strong>{usage?.user.display_name || usage?.user.username || data.user.username}</strong></div>
          <div><small>Ventana</small><strong>{range === '24h' ? '24 horas' : range === '7d' ? '7 días' : '30 días'}</strong></div>
        </div>
      </section>

      <section className="usage-toolbar">
        <div className="usage-controls">
          <label>
            <CalendarRange size={16} />
            <select value={range} onChange={(event) => setRange(event.target.value as UsageRange)}>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>
          </label>
          <label>
            <Filter size={16} />
            <select value={granularity} onChange={(event) => setGranularity(event.target.value as UsageGranularity)}>
              <option value="hour">Por hora</option>
              <option value="day">Por día</option>
            </select>
          </label>
        </div>
        <div className="usage-toolbar-actions">
          <div className="usage-toolbar-note">
            <Clock3 size={16} />
            <span>Datos en vivo con actualización al abrir la pestaña</span>
          </div>
          <button className="secondary-button" onClick={exportCsv}><Clipboard size={16} />Export CSV</button>
        </div>
      </section>

      {loading && <section className="usage-skeleton"><LoaderCircle className="spin" size={26} /><span>Cargando uso real...</span></section>}
      {error && <div className="form-error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="usage-stats-grid">
            <UsageStat label="Total requests" value={compactNumber(totalRequests)} hint="Solicitudes del rango" icon={Activity} tone="blue" />
            <UsageStat label="Total tokens" value={compactNumber(totalTokens)} hint={`Prompt ${compactNumber(totalPrompt)} / Completion ${compactNumber(totalCompletion)}`} icon={Gauge} tone="green" />
            <UsageStat label="Total cost" value={money(totalCost, totalCost < 1 ? 4 : 2)} hint="Costo real del usuario" icon={CircleDollarSign} tone="coral" />
            <UsageStat label="Avg duration" value={formatDuration(avgDuration)} hint="Tiempo promedio por request" icon={Clock3} tone="violet" />
          </section>

          <section className="usage-chart-grid">
            <article className="usage-panel">
              <div className="usage-panel-head">
                <div>
                  <p>Model Distribution</p>
                  <h3>Por requests</h3>
                </div>
                <span>Top {modelBreakdown.length}</span>
              </div>
              <div className="usage-panel-body split">
                <Donut
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
                  <h3>Por keys</h3>
                </div>
                <span>Top {keyBreakdown.length}</span>
              </div>
              <div className="usage-panel-body split">
                <Donut
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
                <h3>Solicitudes del rango</h3>
              </div>
              <span>{series.length} puntos</span>
            </div>
            <div className="usage-bars">
              {series.length === 0 && <div className="empty-row"><Activity size={18} />Sin actividad en el rango</div>}
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
                <h3>Tabla detallada</h3>
              </div>
              <span>{filtered.length} en pantalla</span>
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
                    <th className="right">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedRows.length === 0 && <tr><td colSpan={18}><div className="empty-row"><Activity size={18} />No hay registros para ese rango</div></td></tr>}
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

function AdminView() {
  const [admin, setAdmin] = useState<AdminResponse | null>(null)
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let alive = true
    async function loadAdmin() {
      setLoading(true); setError('')
      try {
        const body = await readJson(await fetch(`/api/admin?range=${range}`, { cache: 'no-store' }))
        if (alive) setAdmin(body.data)
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

  const margin = admin?.totals.revenueUsd
    ? (admin.totals.netProfitUsd / admin.totals.revenueUsd) * 100
    : 0

  return <div className="admin-page">
    <section className="admin-command-bar">
      <div>
        <p className="eyebrow">Control financiero</p>
        <h2>Rentabilidad del gateway</h2>
        <span>Datos administrativos de New API</span>
      </div>
      <div className="admin-actions">
        <label><CalendarRange size={16} /><select value={range} onChange={(event) => setRange(event.target.value as typeof range)}><option value="7d">7 días</option><option value="30d">30 días</option><option value="90d">90 días</option><option value="all">Histórico</option></select></label>
        <button className="icon-button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} aria-label="Actualizar administración"><RefreshCw className={loading ? 'spin' : ''} size={17} /></button>
        <button className="secondary-button" onClick={exportCustomers} disabled={!admin}><Download size={17} />Exportar</button>
      </div>
    </section>

    {error && <div className="form-error">{error}</div>}
    {loading && !admin && <section className="usage-skeleton"><LoaderCircle className="spin" size={25} /><span>Cargando métricas administrativas...</span></section>}
    {admin && <>
      <section className="admin-stats-grid">
        <UsageStat label="Facturado por uso" value={money(admin.totals.revenueUsd, admin.totals.revenueUsd < 1 ? 4 : 2)} hint={`${compactNumber(admin.totals.requests)} solicitudes`} icon={ReceiptText} tone="blue" />
        <UsageStat label="Costo proveedor" value={money(admin.totals.costUsd, admin.totals.costUsd < 1 ? 4 : 2)} hint={admin.config.providerCostIsEstimate ? `Estimado al ${(admin.config.upstreamFactor * 100).toFixed(1)}%` : 'Costo conciliado'} icon={CircleDollarSign} tone="coral" />
        <UsageStat label="Ganancia neta" value={money(admin.totals.netProfitUsd, Math.abs(admin.totals.netProfitUsd) < 1 ? 4 : 2)} hint={`${margin.toFixed(1)}% de margen`} icon={TrendingUp} tone="green" />
        <UsageStat label="Clientes activos" value={`${admin.totals.activeCustomers}/${admin.totals.customers}`} hint={`${admin.totals.errors} errores en el rango`} icon={Users} tone="violet" />
      </section>

      <section className="admin-ledger-strip">
        <div><small>Tokens procesados</small><strong>{compactNumber(admin.totals.totalTokens)}</strong></div>
        <div><small>Comisiones estimadas</small><strong>{money(admin.totals.paymentFeesUsd, 4)}</strong></div>
        <div><small>Crédito asignado</small><strong>{money(admin.totals.creditedUsd, 4)}</strong></div>
        <div><small>Última actualización</small><strong>{new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(admin.generatedAt))}</strong></div>
      </section>

      {admin.truncated && <div className="admin-warning"><AlertTriangle size={17} />El rango supera 2.000 registros por categoría; las tablas muestran una muestra limitada.</div>}

      <section className="section-block">
        <div className="section-heading"><div><h3>Clientes registrados</h3><p>Saldo, consumo y rentabilidad por cuenta</p></div><span className="info-chip"><Users size={15} />{admin.customers.length} clientes</span></div>
        <div className="table-wrap"><table className="admin-table"><thead><tr><th>Cliente</th><th>Grupo</th><th>Estado</th><th>Saldo</th><th>Requests</th><th>Tokens</th><th>Facturado</th><th>Costo est.</th><th>Ganancia bruta</th><th className="right">Alertas</th></tr></thead><tbody>
          {admin.customers.length === 0 && <tr><td colSpan={10}><div className="empty-row"><Users size={18} />No hay clientes registrados</div></td></tr>}
          {admin.customers.map((customer) => <tr key={customer.username}><td><span className="admin-customer"><span className={`status-dot ${customer.status === 1 ? 'active' : ''}`} /><span><strong>{customer.displayName}</strong><small>{customer.username}</small></span></span></td><td><code>{customer.group}</code></td><td><span className={`admin-state ${customer.status === 1 ? 'active' : 'blocked'}`}>{customer.status === 1 ? 'Activo' : 'Bloqueado'}</span></td><td>{money(customer.balanceUsd, 4)}</td><td>{compactNumber(customer.requests)}</td><td>{compactNumber(customer.tokens)}</td><td>{money(customer.revenueUsd, 4)}</td><td>{money(customer.costUsd, 4)}</td><td className="profit-cell">{money(customer.revenueUsd - customer.costUsd, 4)}</td><td className="right">{customer.errors ? <span className="risk-badge"><AlertTriangle size={13} />{customer.errors}</span> : <span className="clean-badge">Normal</span>}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="admin-split-grid">
        <article className="admin-panel">
          <div className="section-heading"><div><h3>Modelos más utilizados</h3><p>Ordenados por facturación</p></div><BarChart3 size={18} /></div>
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

function ModelsView({ data }: { data: DashboardData }) {
  return <div className="view-stack">
    <section className="models-hero">
      <div>
        <p className="eyebrow">Catálogo comercial</p>
        <h2>Modelos disponibles</h2>
        <p>Vista compacta con identidad visual real, precios y estado de venta en una sola pantalla.</p>
      </div>
      <div className="catalog-summary">
        <div><Sparkles size={20} /><span><strong>{data.models.length} modelos</strong><small>Plan Profesional</small></span></div>
        <div><Gauge size={20} /><span><strong>Pago por uso</strong><small>Sin costo fijo</small></span></div>
      </div>
    </section>

    <section className="model-grid">
      {data.models.map((model) => {
        const visual = getModelVisual(model.id)
        const priceLines = [
          { label: 'Entrada', value: money(model.input, model.input < 0.1 ? 4 : 3) },
          { label: 'Salida', value: money(model.output, model.output < 0.1 ? 4 : 3) },
          { label: 'Cache read', value: money(model.cacheRead, 5) },
          { label: 'Cache write', value: model.cacheWrite > 0 ? money(model.cacheWrite, 5) : '-' },
        ]
        return (
          <article className={`model-card tone-${model.accent}`} key={model.id}>
            <div className="model-card-top">
              <span className={`model-badge ${model.accent}`}><visual.Icon size={18} /></span>
              <span className="available-badge"><Check size={13} />Disponible</span>
            </div>
            <div className="model-card-head">
              <div>
                <h3>{model.label}</h3>
                <code>{model.id}</code>
              </div>
              <span className={`model-family family-${visual.family.toLowerCase()}`}>{visual.family}</span>
            </div>
            <div className="model-chip-row">
              <span className="model-chip">OpenAI</span>
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

function StatusView({ data, refresh }: { data: DashboardData; refresh: () => Promise<void> }) {
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
          <p>Vista de disponibilidad, actividad y salud por modelo.</p>
        </div>
        <div className="status-actions">
          <div className="window-switch">
            {availableWindows.map((days) => (
              <button key={days} className={windowDays === days ? 'active' : ''} onClick={() => setWindowDays(days as 7 | 15 | 30)}>
                {days} days
              </button>
            ))}
          </div>
          <span className={`status-pill ${degraded > 0 ? 'warn' : 'ok'}`}>{degraded > 0 ? 'DEGRADED' : 'OPERATIONAL'}</span>
          <button className="icon-button" onClick={() => void refresh()} aria-label="Actualizar">
            <RefreshCw size={18} />
          </button>
          <span className="refresh-pill">
            <RefreshCw size={16} className={probing ? 'spin' : ''} />
            Auto check: 2h
          </span>
        </div>
      </section>
      {probeError && <div className="status-error">{probeError}</div>}

      <section className="status-summary">
        <div className="summary-card">
          <span>Canales</span>
          <strong>{cards.length}</strong>
          <small>Modelos habilitados</small>
        </div>
        <div className="summary-card">
          <span>Operativos</span>
          <strong>{operational}</strong>
          <small>En la ventana de {windowDays} días</small>
        </div>
        <div className="summary-card">
          <span>Disponibilidad</span>
          <strong>{avgAvailability}%</strong>
          <small>Promedio de actividad</small>
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
                <span>Dialog latency</span>
                <strong>{channel.live?.dialogLatencyMs || channel.dialogLatencyMs}ms</strong>
              </div>
              <div>
                <span>Endpoint ping</span>
                <strong>{channel.live?.endpointPingMs || channel.endpointPingMs}ms</strong>
              </div>
            </div>

            <div className="status-foot">
              <div>
                <span>Availability · {windowDays} days</span>
                <strong>{channel.availabilityValue}%</strong>
              </div>
              <div>
                <span>History ({channel.window.history.length} pts)</span>
                <strong>Next update in 50s</strong>
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
              <span>Group</span>
              <code>{channel.group}</code>
              <span>{channel.live ? `HTTP ${channel.live.statusCode || 'ERR'}` : 'Last seen'}</span>
              <strong title={channel.live?.message}>{channel.live ? formatSeen(channel.live.checkedAt) : formatSeen(channel.window.lastSeen)}</strong>
            </div>
          </article>
        ))}
      </section>
      <div className="status-footnote">Último chequeo global: {lastCheckLabel}</div>
    </div>
  )
}

function WalletView({ data, paymentReturn, onDismissPayment }: { data: DashboardData; paymentReturn: PaymentReturn | null; onDismissPayment: () => void }) {
  const [message, setMessage] = useState('')
  const [busyAmount, setBusyAmount] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercadopago')
  const [customAmount, setCustomAmount] = useState('')
  const customAmountValue = Number(customAmount)
  const minimumAmount = paymentMethod === 'crypto' ? MINIMUM_CRYPTO_PAYMENT_USD : 1
  const customAmountValid = customAmount.trim() !== '' && Number.isFinite(customAmountValue) && customAmountValue >= minimumAmount && customAmountValue <= 10_000 && Math.round((customAmountValue + Number.EPSILON) * 100) / 100 === customAmountValue
  async function checkout(amount: number) {
    setBusyAmount(amount); setMessage('')
    try {
      const body = await readJson(await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, provider: paymentMethod }) }))
      const paymentUrl = paymentMethod === 'crypto' ? body.data?.invoiceUrl : body.data?.initPoint
      if (!paymentUrl) throw new Error(paymentMethod === 'crypto' ? 'NOWPayments no devolvió el enlace de pago.' : 'Mercado Pago no devolvió el enlace de pago.')
      window.location.assign(paymentUrl)
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Pagos no disponibles.') }
    finally { setBusyAmount(null) }
  }
  function submitCustomAmount(event: FormEvent) {
    event.preventDefault()
    if (!customAmountValid) {
      setMessage(`Ingresá un importe desde US$ ${minimumAmount} y con hasta 2 decimales.`)
      return
    }
    void checkout(customAmountValue)
  }
  const balance = data.user.quota / data.quotaPerUsd
  return <div className="view-stack">
    {paymentReturn && <section className={`payment-result ${paymentReturn}`} role="status">
      <span className="payment-result-icon">{paymentReturn === 'success' ? <Check size={20} /> : paymentReturn === 'pending' ? <Clock3 size={20} /> : <AlertTriangle size={20} />}</span>
      <div><strong>{paymentReturn === 'success' ? 'Pago aprobado' : paymentReturn === 'pending' ? 'Pago pendiente' : 'Pago no completado'}</strong><p>{paymentReturn === 'success' ? 'Mercado Pago confirmó la operación. El saldo se acredita automáticamente; actualizá el panel si todavía no aparece.' : paymentReturn === 'pending' ? 'Mercado Pago todavía está procesando la operación. El saldo se acreditará cuando se confirme.' : 'No se acreditó saldo. Podés volver a intentarlo cuando quieras.'}</p></div>
      <button className="icon-button" onClick={onDismissPayment} aria-label="Cerrar estado del pago"><X size={17} /></button>
    </section>}
    <section className="wallet-hero">
      <div><p>Saldo disponible</p><strong>{money(balance, balance < 1 ? 4 : 2)}</strong><span>Cuenta {data.user.username}</span></div>
      <span className="wallet-icon"><WalletCards size={28} /></span>
    </section>
    <section className="section-block">
      <div className="section-heading"><div><h3>Métodos de pago</h3><p>Elegí cómo cargar crédito en tu cuenta</p></div></div>
      <div className="payment-method-grid">
        <button className={`payment-method ${paymentMethod === 'mercadopago' ? 'active' : ''}`} onClick={() => setPaymentMethod('mercadopago')}><span className="payment-method-icon"><CreditCard size={19} /></span><span><strong>Mercado Pago</strong><small>ARS · US$ 1.600 por dólar</small></span>{paymentMethod === 'mercadopago' ? <ShieldCheck size={17} /> : <Check size={17} />}</button>
        <button className={`payment-method crypto-method ${paymentMethod === 'crypto' ? 'active' : ''}`} onClick={() => setPaymentMethod('crypto')}><span className="payment-method-icon crypto"><Bitcoin size={19} /></span><span><strong>Crypto · NOWPayments</strong><small>BTC, USDT y más monedas · mín. US$ 10</small></span>{paymentMethod === 'crypto' ? <ShieldCheck size={17} /> : <Check size={17} />}</button>
      </div>
    </section>
    <section className="section-block">
      <div className="section-heading"><div><h3>Cargar saldo</h3><p>{paymentMethod === 'crypto' ? 'Pago crypto seguro · mínimo US$ 10 por límites de red y conversión' : 'Pago seguro con Mercado Pago · mínimo US$ 1'}</p></div></div>
      <div className="package-grid">{[1, 5, 10, 25].filter((amount) => amount >= minimumAmount).map((amount) => <button className={`package-card ${amount === 10 ? 'featured' : ''}`} key={amount} onClick={() => checkout(amount)} disabled={busyAmount !== null}><span>{amount === minimumAmount ? 'Recarga mínima' : amount === 10 ? 'Más elegido' : 'Crédito API'}</span><strong>{money(amount)}</strong><small>{paymentMethod === 'crypto' ? 'Pago único en crypto' : `AR$ ${(amount * 1600).toLocaleString('es-AR')} · Pago único`}</small><span className="package-cta">{busyAmount === amount ? 'Conectando...' : 'Pagar'} <ChevronRight size={16} /></span></button>)}</div>
      <div className="custom-topup">
        <div className="custom-topup-copy"><strong>Otro importe</strong><small>Recargá desde US$ {minimumAmount}, hasta US$ 10.000.</small></div>
        <form className="custom-topup-form" onSubmit={submitCustomAmount}>
          <label className="currency-input"><span>US$</span><input type="number" min={minimumAmount} max="10000" step="0.01" inputMode="decimal" placeholder={paymentMethod === 'crypto' ? '12,50' : '1,50'} value={customAmount} onChange={(event) => { setCustomAmount(event.target.value); setMessage('') }} aria-label="Importe personalizado en dólares" /></label>
          <button className="primary-button" type="submit" disabled={busyAmount !== null || !customAmountValid}><CreditCard size={17} />Continuar al pago</button>
        </form>
        {customAmountValid && <small className="custom-topup-total">{paymentMethod === 'crypto' ? `Total a pagar: US$ ${customAmountValue.toFixed(2)} en crypto.` : `Total a pagar: AR$ ${(Math.round(customAmountValue * 1600)).toLocaleString('es-AR')}`}</small>}
        {customAmount && !customAmountValid && <small className="custom-topup-error">Usá un importe desde US$ {minimumAmount}, con hasta 2 decimales.</small>}
      </div>
      {message && <div className="payment-message"><CreditCard size={18} />{message}</div>}
    </section>
  </div>
}

const snippets = {
  env: (base: string, key: string) => `OPENAI_BASE_URL=${base}\nOPENAI_API_KEY=${key || 'sk-tu-api-key'}`,
  python: (base: string, key: string) => `from openai import OpenAI\n\nclient = OpenAI(\n    base_url="${base}",\n    api_key="${key || 'sk-tu-api-key'}",\n)\n\nresponse = client.chat.completions.create(\n    model="gpt-5.4-mini",\n    messages=[{"role": "user", "content": "Hola"}],\n)\n\nprint(response.choices[0].message.content)`,
  node: (base: string, key: string) => `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  baseURL: "${base}",\n  apiKey: "${key || 'sk-tu-api-key'}",\n});\n\nconst response = await client.chat.completions.create({\n  model: "gpt-5.4-mini",\n  messages: [{ role: "user", content: "Hola" }],\n});\n\nconsole.log(response.choices[0].message.content);`,
  curl: (base: string, key: string) => `curl ${base}/chat/completions \\\n  -H "Authorization: Bearer ${key || 'sk-tu-api-key'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"gpt-5.4-mini","messages":[{"role":"user","content":"Hola"}]}'`,
}

function SetupView({ data }: { data: DashboardData }) {
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
  return <div className="view-stack"><section className="connection-bar"><div><span className="connection-status"><span />API operativa</span><code>{data.gatewayUrl}</code></div><button className="icon-button" onClick={() => navigator.clipboard.writeText(data.gatewayUrl)} aria-label="Copiar Base URL"><Copy size={18} /></button></section><section className="code-workspace"><div className="code-toolbar"><div className="code-tabs">{(['env', 'python', 'node', 'curl'] as const).map((item) => <button className={tab === item ? 'active' : ''} key={item} onClick={() => setTab(item)}>{item === 'env' ? '.env' : item}</button>)}</div><button className="copy-code" onClick={copy}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? 'Copiado' : 'Copiar'}</button></div><pre><code>{code}</code></pre></section><section className="key-selector"><div><KeyRound size={19} /><span><strong>Usar una API Key</strong><small>La clave se muestra solo en este navegador</small></span></div><select value={selectedKey} onChange={(event) => { setSelectedKey(event.target.value); setRevealed('') }}><option value="">Seleccionar clave</option>{data.keys.map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</select><button className="secondary-button" onClick={reveal} disabled={!selectedKey}>Insertar</button></section></div>
}

function LoadingScreen() {
  return <main className="loading-screen"><div className="brand"><BrandLogo /></div><LoaderCircle className="spin" size={25} /></main>
}

export function PortalApp() {
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
      const response = await fetch('/api/portal', { cache: 'no-store' })
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
    const payment = new URLSearchParams(window.location.search).get('payment')
    if (payment !== 'success' && payment !== 'pending' && payment !== 'failure') return
    setPaymentReturn(payment)
    setView('wallet')
    window.history.replaceState({}, document.title, window.location.pathname)
  }, [])

  const content = useMemo(() => {
    if (!data) return null
    if (view === 'overview') return <Overview data={data} setView={setView} />
    if (view === 'usage') return <UsageView data={data} />
    if (view === 'admin') return <AdminView />
    if (view === 'status') return <StatusView data={data} refresh={load} />
    if (view === 'keys') return <KeysView data={data} reload={load} />
    if (view === 'models') return <ModelsView data={data} />
    if (view === 'wallet') return <WalletView data={data} paymentReturn={paymentReturn} onDismissPayment={() => setPaymentReturn(null)} />
    return <SetupView data={data} />
  }, [data, view, load, paymentReturn])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setData(null); setAuth('anonymous'); setView('overview'); setPaymentReturn(null)
  }

  if (auth === 'loading') return <LoadingScreen />
  if (auth === 'anonymous') return <AuthScreen onAuthenticated={load} />
  if (!data) return <LoadingScreen />

  const title = viewTitles[view]
  const visibleNav = navItems.filter((item) => !item.adminOnly || Number(data.user.role || 0) >= 10)
  const initials = (data.user.display_name || data.user.username).slice(0, 2).toUpperCase()
  return <main className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="brand"><BrandLogo light /></div>
      <nav>{visibleNav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setSidebarOpen(false) }}><Icon size={19} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-footer"><div className="account-row"><span className="avatar">{initials}</span><span><strong>{data.user.display_name || data.user.username}</strong><small>{data.user.username}</small></span><button className="icon-button" onClick={logout} aria-label="Cerrar sesión"><LogOut size={17} /></button></div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú" />}
    <section className="main-area">
      <header className="topbar"><button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu size={21} /></button><div><h1>{title.title}</h1><p>{title.subtitle}</p></div><div className="top-actions"><button className="icon-button" onClick={load} disabled={refreshing} aria-label="Actualizar"><RefreshCw className={refreshing ? 'spin' : ''} size={18} /></button><button className="balance-pill" onClick={() => setView('wallet')}><WalletCards size={17} /><span>{money(data.user.quota / data.quotaPerUsd, 2)}</span></button></div></header>
      <div className="content-area">{error && <div className="form-error">{error}</div>}{content}</div>
      <nav className="mobile-nav">{visibleNav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
    </section>
  </main>
}
