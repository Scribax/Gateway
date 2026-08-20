import { randomBytes, randomUUID } from 'node:crypto'

import { QUOTA_PER_USD } from '@/lib/catalog'
import { BackendError, newApiFetch, type NewApiEnvelope } from '@/lib/new-api'
import { getPortalPool } from '@/lib/portal-db'

export type RedeemCode = {
  id: number
  code: string
  amount_usd: string
  quota_amount: string
  note: string | null
  created_by: number | null
  created_at: string
  redeemed_by: number | null
  redeemed_at: string | null
  trade_no: string | null
  status: 'active' | 'processing' | 'redeemed' | 'disabled'
}

const DEMO_AMOUNT_USD = 0.5
const MAX_CREATE_COUNT = 100

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new BackendError(`Falta configurar ${name}.`, 503)
  return value
}

export async function ensureRedeemTable() {
  await getPortalPool().query(`
    CREATE TABLE IF NOT EXISTS portal_redeem_codes (
      id BIGSERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      amount_usd NUMERIC(12, 4) NOT NULL,
      quota_amount BIGINT NOT NULL,
      note TEXT,
      created_by INTEGER,
      created_at BIGINT NOT NULL,
      redeemed_by INTEGER,
      redeemed_at BIGINT,
      trade_no TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE INDEX IF NOT EXISTS idx_portal_redeem_codes_status_created ON portal_redeem_codes(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_portal_redeem_codes_redeemed_by ON portal_redeem_codes(redeemed_by);
  `)
}

function normalizeCode(value: unknown) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '')
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(12)
  let raw = ''
  for (const byte of bytes) raw += alphabet[byte % alphabet.length]
  return `ORB-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`
}

export async function createRedeemCodes(createdBy: number, payload: { amountUsd?: unknown; count?: unknown; note?: unknown }) {
  await ensureRedeemTable()
  const amountUsd = Number(payload.amountUsd ?? DEMO_AMOUNT_USD)
  const count = Math.floor(Number(payload.count ?? 1))
  const note = String(payload.note || '').trim().slice(0, 180) || null
  if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 100) throw new BackendError('El monto del código no es válido.', 400)
  if (!Number.isInteger(count) || count < 1 || count > MAX_CREATE_COUNT) throw new BackendError(`Podés generar entre 1 y ${MAX_CREATE_COUNT} códigos por vez.`, 400)

  const now = Math.floor(Date.now() / 1000)
  const quotaAmount = Math.round(amountUsd * QUOTA_PER_USD)
  const codes: RedeemCode[] = []
  for (let index = 0; index < count; index += 1) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomCode()
      try {
        const result = await getPortalPool().query<RedeemCode>(
          `INSERT INTO portal_redeem_codes (code, amount_usd, quota_amount, note, created_by, created_at, status)
           VALUES ($1, $2::numeric, $3::bigint, $4, $5, $6, 'active')
           RETURNING *`,
          [code, amountUsd, quotaAmount, note, createdBy, now],
        )
        codes.push(result.rows[0])
        break
      } catch (error) {
        if (attempt === 4) throw error
      }
    }
  }
  return codes
}

export async function listRedeemCodes(limit = 50) {
  await ensureRedeemTable()
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)))
  const result = await getPortalPool().query<RedeemCode>(
    `SELECT * FROM portal_redeem_codes ORDER BY created_at DESC, id DESC LIMIT $1`,
    [safeLimit],
  )
  return result.rows
}

export async function redeemCodeForUser(userId: number, rawCode: unknown) {
  await ensureRedeemTable()
  const code = normalizeCode(rawCode)
  if (!code) throw new BackendError('Ingresá un código para canjear.', 400)

  const client = await getPortalPool().connect()
  const tradeNo = `orbiqen:redeem:${userId}:${randomUUID()}`
  let codeRow: RedeemCode | undefined
  try {
    await client.query('BEGIN')
    const result = await client.query<RedeemCode>(
      `SELECT * FROM portal_redeem_codes WHERE code = $1 FOR UPDATE`,
      [code],
    )
    codeRow = result.rows[0]
    if (!codeRow) throw new BackendError('El código no existe o está mal escrito.', 404)
    if (codeRow.status === 'redeemed') throw new BackendError('Este código ya fue canjeado.', 409)
    if (codeRow.status !== 'active') throw new BackendError('Este código no está disponible.', 409)

    await client.query(
      `UPDATE portal_redeem_codes
       SET status = 'processing', redeemed_by = $2, redeemed_at = $3, trade_no = $4
       WHERE code = $1`,
      [code, userId, Math.floor(Date.now() / 1000), tradeNo],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }

  try {
    const quotaAmount = Number(codeRow.quota_amount)
    const body = await newApiFetch<NewApiEnvelope<unknown>>('/api/user/manage', {
      method: 'POST',
      body: JSON.stringify({ id: userId, action: 'add_quota', mode: 'add', value: quotaAmount }),
    }, required('NEW_API_ADMIN_TOKEN'))
    if (body.success === false) throw new BackendError(body.message || 'New API rechazó la operación.', 400)
    await getPortalPool().query(`UPDATE portal_redeem_codes SET status = 'redeemed' WHERE code = $1`, [code])
    return { code, amountUsd: Number(codeRow.amount_usd) }
  } catch (error) {
    await getPortalPool().query(
      `UPDATE portal_redeem_codes
       SET status = 'active', redeemed_by = NULL, redeemed_at = NULL, trade_no = NULL
       WHERE code = $1 AND status = 'processing'`,
      [code],
    ).catch(() => undefined)
    throw error
  }
}
