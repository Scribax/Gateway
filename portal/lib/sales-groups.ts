import { Pool } from 'pg'

import { BackendError, newApiFetch, type NewApiEnvelope } from '@/lib/new-api'

let pool: Pool | undefined

function adminMutationToken() {
  return process.env.NEW_API_ADMIN_TOKEN?.trim() || undefined
}

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

export type SalesGroup = {
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
  created_at: number
  updated_at: number
}

const DEFAULT_GROUPS = [
  ['clientes', 'ChatGPT económico', 'Economy ChatGPT', 'Grupo 0.1', 'Group 0.1', 'Menor precio para tareas comunes', 'Lowest price for common tasks', 'chatgpt', 1, true, 10],
  ['clientes_025', 'ChatGPT estable', 'Stable ChatGPT', 'Grupo 0.25', 'Group 0.25', 'Mayor disponibilidad si el económico falla', 'Higher availability if economy fails', 'chatgpt', 2.5, true, 20],
  ['claude', 'Claude', 'Claude', 'Anthropic', 'Anthropic', 'Opus, Sonnet, Haiku y Fable', 'Opus, Sonnet, Haiku and Fable', 'claude', 1, true, 30],
] as const

export async function ensureSalesGroupsTable() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS sales_groups (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      label_es TEXT NOT NULL,
      label_en TEXT NOT NULL,
      description_es TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      note_es TEXT NOT NULL DEFAULT '',
      note_en TEXT NOT NULL DEFAULT '',
      model_family TEXT NOT NULL DEFAULT 'all',
      price_multiplier NUMERIC(12, 6) NOT NULL DEFAULT 1,
      published BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 100,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `)
  const now = Math.floor(Date.now() / 1000)
  for (const group of DEFAULT_GROUPS) {
    await getPool().query(
      `INSERT INTO sales_groups (code, label_es, label_en, description_es, description_en, note_es, note_en, model_family, price_multiplier, published, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
       ON CONFLICT (code) DO NOTHING`,
      [...group, now],
    )
  }
}

function present(row: SalesGroup): SalesGroup {
  return { ...row, price_multiplier: Number(row.price_multiplier) }
}

export async function syncNewApiGroupRatio(code: string, multiplier: number) {
  const current = await getPool().query<{ value: string }>('SELECT value FROM options WHERE key = $1', ['GroupRatio'])
  let ratios: Record<string, number> = { default: 1, vip: 1, svip: 1 }
  if (current.rows[0]?.value) {
    try {
      const parsed = JSON.parse(current.rows[0].value) as Record<string, unknown>
      ratios = Object.fromEntries(
        Object.entries(parsed)
          .map(([key, value]) => [key, Number(value)] as [string, number])
          .filter(([, value]) => Number.isFinite(value) && value >= 0),
      )
    } catch {
      // Keep the safe defaults when New API has a malformed ratio option.
    }
  }
  ratios[code] = multiplier
  const body = await newApiFetch<NewApiEnvelope<unknown>>('/api/option/', {
    method: 'PUT',
    body: JSON.stringify({ key: 'GroupRatio', value: JSON.stringify(ratios) }),
  }, adminMutationToken())
  if (!body.success) throw new BackendError(body.message || 'New API rechazó la actualización del precio del grupo.', 400)
}

export async function syncNewApiUsableGroup(code: string, label: string) {
  const current = await getPool().query<{ value: string }>('SELECT value FROM options WHERE key = $1', ['UserUsableGroups'])
  let groups: Record<string, string> = { default: 'Default', clientes: 'ChatGPT económico', clientes_025: 'ChatGPT estable', claude: 'Claude' }
  if (current.rows[0]?.value) {
    try {
      const parsed = JSON.parse(current.rows[0].value) as Record<string, unknown>
      groups = Object.fromEntries(
        Object.entries(parsed)
          .map(([key, value]) => [key, String(value || key)] as [string, string])
          .filter(([key]) => key.trim()),
      )
    } catch {
      // Keep defaults if the New API option is malformed.
    }
  }
  groups[code] = label || code
  const body = await newApiFetch<NewApiEnvelope<unknown>>('/api/option/', {
    method: 'PUT',
    body: JSON.stringify({ key: 'UserUsableGroups', value: JSON.stringify(groups) }),
  }, adminMutationToken())
  if (!body.success) throw new BackendError(body.message || 'New API rechazó la actualización de permisos del grupo.', 400)
}

export async function getSalesGroups(options: { publishedOnly?: boolean } = {}) {
  await ensureSalesGroupsTable()
  const result = await getPool().query<SalesGroup>(
    `SELECT * FROM sales_groups ${options.publishedOnly ? 'WHERE published = TRUE' : ''} ORDER BY sort_order ASC, id ASC`,
  )
  return result.rows.map(present)
}

export async function upsertSalesGroup(input: Partial<SalesGroup> & { code: string }) {
  await ensureSalesGroupsTable()
  const code = input.code.trim()
  if (!/^[a-z0-9_-]{2,40}$/i.test(code)) throw new Error('El código del grupo solo puede usar letras, números, guiones y guion bajo.')
  const now = Math.floor(Date.now() / 1000)
  const result = await getPool().query<SalesGroup>(
    `INSERT INTO sales_groups (code, label_es, label_en, description_es, description_en, note_es, note_en, model_family, price_multiplier, published, sort_order, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
     ON CONFLICT (code) DO UPDATE SET
       label_es = EXCLUDED.label_es,
       label_en = EXCLUDED.label_en,
       description_es = EXCLUDED.description_es,
       description_en = EXCLUDED.description_en,
       note_es = EXCLUDED.note_es,
       note_en = EXCLUDED.note_en,
       model_family = EXCLUDED.model_family,
       price_multiplier = EXCLUDED.price_multiplier,
       published = EXCLUDED.published,
       sort_order = EXCLUDED.sort_order,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [
      code,
      input.label_es?.trim() || code,
      input.label_en?.trim() || input.label_es?.trim() || code,
      input.description_es?.trim() || '',
      input.description_en?.trim() || input.description_es?.trim() || '',
      input.note_es?.trim() || '',
      input.note_en?.trim() || input.note_es?.trim() || '',
      ['chatgpt', 'claude', 'all'].includes(String(input.model_family)) ? input.model_family : 'all',
      Number(input.price_multiplier || 1),
      input.published !== false,
      Number(input.sort_order || 100),
      now,
    ],
  )
  const group = present(result.rows[0])
  await syncNewApiGroupRatio(group.code, group.price_multiplier)
  if (group.published) await syncNewApiUsableGroup(group.code, group.label_es || group.label_en || group.code)
  return group
}

export async function deleteSalesGroup(code: string) {
  await ensureSalesGroupsTable()
  await getPool().query('DELETE FROM sales_groups WHERE code = $1 AND code NOT IN ($2, $3, $4)', [code, 'clientes', 'clientes_025', 'claude'])
}
