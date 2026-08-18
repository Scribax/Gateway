'use client'

import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clipboard,
  Code2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

type View = 'overview' | 'status' | 'keys' | 'models' | 'wallet' | 'setup'
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
  username: string
  display_name?: string
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

function BrandLogo({ light = false }: { light?: boolean }) {
  return <span className={`brand-logo${light ? ' brand-logo-light' : ''}`}><img src="/orbiqen-logo.png" alt="Orbiqen" /></span>
}

const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'status', label: 'Estado', icon: Server },
  { id: 'keys', label: 'API Keys', icon: KeyRound },
  { id: 'models', label: 'Modelos', icon: Sparkles },
  { id: 'wallet', label: 'Saldo', icon: WalletCards },
  { id: 'setup', label: 'Conectar', icon: Code2 },
]

const viewTitles: Record<View, { title: string; subtitle: string }> = {
  overview: { title: 'Resumen', subtitle: 'Tu actividad y saldo en un solo lugar' },
  status: { title: 'Channel Status', subtitle: 'Estado y actividad de tus canales comerciales' },
  keys: { title: 'API Keys', subtitle: 'Credenciales para tus aplicaciones' },
  models: { title: 'Modelos', subtitle: 'Precios finales por millón de tokens' },
  wallet: { title: 'Saldo', subtitle: 'Crédito disponible para tus consumos' },
  setup: { title: 'Conectar', subtitle: 'Configuración lista para tu entorno' },
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

function ModelsView({ data }: { data: DashboardData }) {
  return <div className="view-stack"><div className="catalog-summary"><div><Sparkles size={20} /><span><strong>{data.models.length} modelos</strong><small>Plan Profesional</small></span></div><div><Gauge size={20} /><span><strong>Pago por uso</strong><small>Sin costo fijo</small></span></div></div><section className="section-block"><div className="table-wrap"><table><thead><tr><th>Modelo</th><th>Entrada / 1M</th><th>Salida / 1M</th><th>Cache read / 1M</th><th>Estado</th></tr></thead><tbody>{data.models.map((model) => <tr key={model.id}><td><span className="catalog-model"><span className={`model-glyph ${model.accent}`}>{model.label.slice(-1)}</span><span><strong>{model.label}</strong><code>{model.id}</code></span></span></td><td>{money(model.input, model.input < 0.1 ? 4 : 3)}</td><td>{money(model.output, model.output < 0.1 ? 4 : 3)}</td><td>{money(model.cacheRead, 5)}</td><td><span className="available-badge"><Check size={13} />Disponible</span></td></tr>)}</tbody></table></div></section></div>
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

function WalletView({ data }: { data: DashboardData }) {
  const [message, setMessage] = useState('')
  async function checkout(amount: number) {
    try { await readJson(await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) })) }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Pagos no disponibles.') }
  }
  const balance = data.user.quota / data.quotaPerUsd
  return <div className="view-stack"><section className="wallet-hero"><div><p>Saldo disponible</p><strong>{money(balance, balance < 1 ? 4 : 2)}</strong><span>Cuenta {data.user.username}</span></div><span className="wallet-icon"><WalletCards size={28} /></span></section><section className="section-block"><div className="section-heading"><div><h3>Cargar saldo</h3><p>Crédito en dólares para todos los modelos</p></div></div><div className="package-grid">{[5, 10, 25].map((amount, index) => <button className={`package-card ${index === 1 ? 'featured' : ''}`} key={amount} onClick={() => checkout(amount)}><span>{index === 1 ? 'Más elegido' : 'Crédito API'}</span><strong>{money(amount)}</strong><small>Pago único</small><span className="package-cta">Comprar <ChevronRight size={16} /></span></button>)}</div>{message && <div className="payment-message"><CreditCard size={18} />{message}</div>}</section></div>
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

  const content = useMemo(() => {
    if (!data) return null
    if (view === 'overview') return <Overview data={data} setView={setView} />
    if (view === 'status') return <StatusView data={data} refresh={load} />
    if (view === 'keys') return <KeysView data={data} reload={load} />
    if (view === 'models') return <ModelsView data={data} />
    if (view === 'wallet') return <WalletView data={data} />
    return <SetupView data={data} />
  }, [data, view, load])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setData(null); setAuth('anonymous'); setView('overview')
  }

  if (auth === 'loading') return <LoadingScreen />
  if (auth === 'anonymous') return <AuthScreen onAuthenticated={load} />
  if (!data) return <LoadingScreen />

  const title = viewTitles[view]
  const initials = (data.user.display_name || data.user.username).slice(0, 2).toUpperCase()
  return <main className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="brand"><BrandLogo light /></div>
      <nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setSidebarOpen(false) }}><Icon size={19} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-footer"><div className="account-row"><span className="avatar">{initials}</span><span><strong>{data.user.display_name || data.user.username}</strong><small>{data.user.username}</small></span><button className="icon-button" onClick={logout} aria-label="Cerrar sesión"><LogOut size={17} /></button></div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú" />}
    <section className="main-area">
      <header className="topbar"><button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu size={21} /></button><div><h1>{title.title}</h1><p>{title.subtitle}</p></div><div className="top-actions"><button className="icon-button" onClick={load} disabled={refreshing} aria-label="Actualizar"><RefreshCw className={refreshing ? 'spin' : ''} size={18} /></button><button className="balance-pill" onClick={() => setView('wallet')}><WalletCards size={17} /><span>{money(data.user.quota / data.quotaPerUsd, 2)}</span></button></div></header>
      <div className="content-area">{error && <div className="form-error">{error}</div>}{content}</div>
      <nav className="mobile-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
    </section>
  </main>
}
