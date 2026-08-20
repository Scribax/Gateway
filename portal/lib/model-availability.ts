import { Pool } from 'pg'

import { MODEL_CATALOG, type ModelPrice } from '@/lib/catalog'

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

export type ModelAvailability = {
  modelId: string
  group: 'clientes' | 'claude'
  enabled: boolean
}

const DEFAULT_DISABLED_MODELS = new Set([
  'claude-fable-5',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-6',
  'claude-opus-4-7',
  'claude-opus-5',
  'claude-sonnet-4-6',
  'claude-sonnet-5',
])

function groupForModel(modelId: string): ModelAvailability['group'] {
  return modelId.includes('claude') ? 'claude' : 'clientes'
}

async function ensureTable() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS model_availability (
      model_id TEXT PRIMARY KEY,
      model_group TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at BIGINT NOT NULL
    )
  `)
  await getPool().query(
    `INSERT INTO model_availability (model_id, model_group, enabled, updated_at)
     SELECT model_id, model_group, enabled, $4
     FROM unnest($1::text[], $2::text[], $3::boolean[]) AS defaults(model_id, model_group, enabled)
     ON CONFLICT (model_id) DO NOTHING`,
    [
      MODEL_CATALOG.map((model) => model.id),
      MODEL_CATALOG.map((model) => groupForModel(model.id)),
      MODEL_CATALOG.map((model) => !DEFAULT_DISABLED_MODELS.has(model.id)),
      Math.floor(Date.now() / 1000),
    ],
  )
}

export async function getModelAvailability(): Promise<ModelAvailability[]> {
  await ensureTable()
  const result = await getPool().query<ModelAvailability>(
    `SELECT model_id AS "modelId", model_group AS "group", enabled
     FROM model_availability ORDER BY model_group, model_id`,
  )
  const known = new Set(MODEL_CATALOG.map((model) => model.id))
  return result.rows.filter((row) => known.has(row.modelId))
}

export async function getEnabledModelCatalog(): Promise<ModelPrice[]> {
  const availability = await getModelAvailability()
  const enabled = new Set(availability.filter((row) => row.enabled).map((row) => row.modelId))
  return MODEL_CATALOG.filter((model) => enabled.has(model.id))
}

export async function setModelAvailability(updates: Array<{ modelId: string; enabled: boolean }>) {
  await ensureTable()
  const known = new Set(MODEL_CATALOG.map((model) => model.id))
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    for (const update of updates) {
      if (!known.has(update.modelId)) continue
      await client.query(
        `UPDATE model_availability SET enabled = $1, updated_at = $2 WHERE model_id = $3`,
        [Boolean(update.enabled), Math.floor(Date.now() / 1000), update.modelId],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  return getModelAvailability()
}
