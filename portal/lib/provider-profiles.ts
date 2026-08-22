import { Pool } from 'pg'

import { BackendError, newApiFetch, requireSuccess, type NewApiEnvelope } from '@/lib/new-api'
import { MODEL_CATALOG } from '@/lib/catalog'
import { getSalesGroups, syncNewApiGroupRatio, syncNewApiUsableGroup } from '@/lib/sales-groups'

let pool: Pool | undefined

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.PORTAL_DATABASE_URL,
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  }
  return pool
}

type StoredProfile = {
  id: number
  name: string
  description: string
  base_url: string
  api_key: string
  target_groups: string[]
  price_multiplier: number
  enabled: boolean
  active: boolean
  created_at: number
  updated_at: number
  last_activated_at: number | null
}

export type ProviderProfile = Omit<StoredProfile, 'api_key'> & {
  keyConfigured: boolean
  maskedKey: string
}

type ChannelRow = { id: number; name: string; type: number; group: string; models: string; base_url?: string | null }

export type ProviderModelValidation = {
  models: string[]
  knownModels: string[]
  unknownModels: string[]
}

function providerMutationToken() {
  return process.env.NEW_API_ADMIN_TOKEN?.trim() || undefined
}

async function ensureTables() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS provider_profiles (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      target_groups TEXT[] NOT NULL DEFAULT '{}',
      price_multiplier NUMERIC(12, 6) NOT NULL DEFAULT 1,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      active BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      last_activated_at BIGINT
    );
    CREATE TABLE IF NOT EXISTS provider_channel_baselines (
      channel_id BIGINT PRIMARY KEY,
      base_url TEXT NOT NULL DEFAULT '',
      api_key TEXT NOT NULL DEFAULT '',
      captured_at BIGINT NOT NULL
    );
  `)
}

function maskKey(key: string) {
  const clean = key.trim()
  if (!clean) return ''
  if (clean.length <= 10) return `${clean.slice(0, 3)}...`
  return `${clean.slice(0, 7)}...${clean.slice(-4)}`
}

export async function validateProviderEndpoint(baseUrl: string, apiKey: string): Promise<ProviderModelValidation> {
  const endpoint = baseUrl.trim().replace(/\/$/, '')
  const key = apiKey.trim()
  if (!endpoint || !key) throw new BackendError('Completá la Base URL y la API key para validar.', 400)
  if (!/^https?:\/\//i.test(endpoint)) throw new BackendError('La Base URL debe comenzar con http:// o https://.', 400)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(`${endpoint}/models`, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: controller.signal,
    })
    const body = await response.json().catch(() => null) as { data?: Array<{ id?: unknown }>; error?: { message?: unknown }; message?: unknown } | null
    if (!response.ok) {
      const message = String(body?.error?.message || body?.message || `El proveedor respondió HTTP ${response.status}.`)
      throw new BackendError(`No se pudo validar el proveedor: ${message}`, response.status >= 500 ? 502 : 400)
    }
    const models = Array.isArray(body?.data)
      ? [...new Set(body.data.map((item) => String(item?.id || '').trim()).filter(Boolean))].sort()
      : []
    if (models.length === 0) throw new BackendError('El endpoint respondió, pero no devolvió modelos en data[].', 400)
    const known = new Set(MODEL_CATALOG.map((model) => model.id))
    return { models, knownModels: models.filter((model) => known.has(model)), unknownModels: models.filter((model) => !known.has(model)) }
  } catch (error) {
    if (error instanceof BackendError) throw error
    if (error instanceof Error && error.name === 'AbortError') throw new BackendError('El proveedor tardó demasiado en responder.', 504)
    throw new BackendError('No se pudo conectar con el endpoint del proveedor.', 502)
  } finally {
    clearTimeout(timeout)
  }
}

function present(profile: StoredProfile): ProviderProfile {
  return {
    ...profile,
    price_multiplier: Number(profile.price_multiplier),
    keyConfigured: Boolean(profile.api_key),
    maskedKey: maskKey(profile.api_key),
  }
}

export async function getProviderProfiles() {
  await ensureTables()
  const result = await getPool().query<StoredProfile>(`SELECT * FROM provider_profiles ORDER BY active DESC, name ASC`)
  return result.rows.map(present)
}

export async function getProviderGroups() {
  await ensureTables()
  const result = await getPool().query<{ group: string }>(`SELECT \"group\" FROM channels WHERE \"group\" IS NOT NULL AND \"group\" <> '' ORDER BY id`)
  return [...new Set(result.rows.flatMap((row) => row.group.split(',').map((group) => group.trim()).filter(Boolean)))]
}

export async function createProviderProfile(input: {
  name: string
  description?: string
  baseUrl: string
  apiKey: string
  targetGroups: string[]
  priceMultiplier?: number
}) {
  await ensureTables()
  const name = input.name.trim()
  const baseUrl = input.baseUrl.trim().replace(/\/$/, '')
  const apiKey = input.apiKey.trim()
  const groups = input.targetGroups.map((group) => group.trim()).filter(Boolean)
  const multiplier = Number(input.priceMultiplier ?? 1)
  if (!name || !baseUrl || !apiKey || groups.length === 0) throw new BackendError('Completá nombre, Base URL, API key y al menos un grupo.', 400)
  if (!/^https?:\/\//i.test(baseUrl)) throw new BackendError('La Base URL debe comenzar con http:// o https://.', 400)
  if (!Number.isFinite(multiplier) || multiplier <= 0) throw new BackendError('El multiplicador debe ser mayor que cero.', 400)
  const now = Math.floor(Date.now() / 1000)
  const result = await getPool().query<StoredProfile>(
    `INSERT INTO provider_profiles (name, description, base_url, api_key, target_groups, price_multiplier, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
    [name, input.description?.trim() || '', baseUrl, apiKey, groups, multiplier, now],
  )
  return present(result.rows[0])
}

export async function updateProviderProfile(id: number, input: {
  name?: string
  description?: string
  baseUrl?: string
  apiKey?: string
  targetGroups?: string[]
  priceMultiplier?: number
  enabled?: boolean
}) {
  await ensureTables()
  const current = await getPool().query<StoredProfile>('SELECT * FROM provider_profiles WHERE id = $1', [id])
  if (!current.rows[0]) throw new BackendError('No se encontró el perfil.', 404)
  const profile = current.rows[0]
  const baseUrl = input.baseUrl === undefined ? profile.base_url : input.baseUrl.trim().replace(/\/$/, '')
  const apiKey = input.apiKey?.trim() || profile.api_key
  const groups = input.targetGroups === undefined ? profile.target_groups : input.targetGroups.map((group) => group.trim()).filter(Boolean)
  const multiplier = input.priceMultiplier === undefined ? Number(profile.price_multiplier) : Number(input.priceMultiplier)
  if (!baseUrl || !apiKey || groups.length === 0 || !Number.isFinite(multiplier) || multiplier <= 0) throw new BackendError('La configuración del perfil no es válida.', 400)
  const now = Math.floor(Date.now() / 1000)
  const result = await getPool().query<StoredProfile>(
    `UPDATE provider_profiles SET name = $1, description = $2, base_url = $3, api_key = $4, target_groups = $5,
     price_multiplier = $6, enabled = $7, updated_at = $8 WHERE id = $9 RETURNING *`,
    [input.name?.trim() || profile.name, input.description?.trim() ?? profile.description, baseUrl, apiKey, groups, multiplier, input.enabled ?? profile.enabled, now, id],
  )
  return present(result.rows[0])
}

async function listTargetChannels(groups: string[]) {
  const result = await getPool().query<ChannelRow>(`SELECT id, name, type, \"group\", models, base_url FROM channels ORDER BY id`)
  return result.rows.filter((channel) => channel.group.split(',').map((group) => group.trim()).some((group) => groups.includes(group)))
}

async function updateChannel(channelId: number, baseUrl: string, apiKey: string, models: string[]) {
  const id = Number(channelId)
  if (!Number.isInteger(id) || id <= 0) throw new BackendError('El ID del canal no es válido.', 400)
  const body = await newApiFetch<NewApiEnvelope<unknown>>('/api/channel/', {
    method: 'PUT',
    body: JSON.stringify({ id, base_url: baseUrl, key: apiKey, models: models.join(',') }),
  }, providerMutationToken())
  requireSuccess(body)
}

async function createChannel(profile: StoredProfile, groups: string[], models: string[]) {
  const groupLabel = groups.join(', ')
  const body = await newApiFetch<NewApiEnvelope<unknown>>('/api/channel/', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'single',
      channel: {
        type: 1,
        status: 1,
        name: `${profile.name} (${groupLabel})`,
        key: profile.api_key,
        base_url: profile.base_url,
        models: models.join(','),
        group: groups.join(','),
        priority: 0,
        weight: 0,
        auto_ban: 1,
      },
    }),
  }, providerMutationToken())
  if (!body.success) throw new BackendError(body.message || 'New API rechazó la creación del canal.', 400)
}

async function syncProfileGroupRatios(groups: string[]) {
  const salesGroups = await getSalesGroups()
  for (const group of salesGroups.filter((item) => groups.includes(item.code))) {
    await syncNewApiGroupRatio(group.code, group.price_multiplier)
    if (group.published) await syncNewApiUsableGroup(group.code, group.label_es || group.label_en || group.code)
  }
}

export async function activateProviderProfile(id: number) {
  await ensureTables()
  const result = await getPool().query<StoredProfile>('SELECT * FROM provider_profiles WHERE id = $1', [id])
  const profile = result.rows[0]
  if (!profile) throw new BackendError('No se encontró el perfil.', 404)
  if (!profile.enabled) throw new BackendError('El perfil está deshabilitado.', 400)

  const validation = await validateProviderEndpoint(profile.base_url, profile.api_key)
  await syncProfileGroupRatios(profile.target_groups)

  const channels = await listTargetChannels(profile.target_groups)
  const coveredGroups = new Set(channels.flatMap((channel) => channel.group.split(',').map((group) => group.trim()).filter(Boolean)))
  const missingGroups = profile.target_groups.filter((group) => !coveredGroups.has(group))
  if (missingGroups.length > 0) {
    await createChannel(profile, missingGroups, validation.models)
  }
  const targetChannels = await listTargetChannels(profile.target_groups)
  if (targetChannels.length === 0) throw new BackendError('No se pudo crear ni encontrar un canal de New API para esos grupos.', 400)

  const now = Math.floor(Date.now() / 1000)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    for (const channel of targetChannels) {
      await client.query(
        `INSERT INTO provider_channel_baselines (channel_id, base_url, api_key, captured_at)
         SELECT id, COALESCE(base_url, ''), key, $2 FROM channels WHERE id = $1
         ON CONFLICT (channel_id) DO NOTHING`,
        [channel.id, now],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  for (const channel of targetChannels) await updateChannel(channel.id, profile.base_url, profile.api_key, validation.models)

  await getPool().query(`UPDATE provider_profiles SET active = FALSE, updated_at = $1 WHERE id <> $2 AND target_groups && $3::text[]`, [now, id, profile.target_groups])
  const updated = await getPool().query<StoredProfile>(
    `UPDATE provider_profiles SET active = TRUE, last_activated_at = $1, updated_at = $1 WHERE id = $2 RETURNING *`,
    [now, id],
  )
  return { profile: present(updated.rows[0]), channels: targetChannels.map((channel) => channel.id), createdGroups: missingGroups, validation }
}

export async function restoreProviderBaselines() {
  await ensureTables()
  const result = await getPool().query<{ channel_id: number; base_url: string; api_key: string }>(`SELECT channel_id, base_url, api_key FROM provider_channel_baselines ORDER BY channel_id`)
  if (result.rows.length === 0) throw new BackendError('No hay una configuración anterior guardada para restaurar.', 400)
  for (const baseline of result.rows) await updateChannel(baseline.channel_id, baseline.base_url, baseline.api_key, [])
  await getPool().query('DELETE FROM provider_channel_baselines')
  await getPool().query('UPDATE provider_profiles SET active = FALSE, updated_at = $1', [Math.floor(Date.now() / 1000)])
  return { restoredChannels: result.rows.map((row) => row.channel_id) }
}
