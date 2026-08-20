import { QUOTA_PER_USD } from '@/lib/catalog'
import { getPortalPool } from '@/lib/portal-db'

export type PendingTopUp = {
  user_id: number
  amount: number
  money: number
  trade_no: string
  status: string
}

export async function insertPendingTopUp(userId: number, amountUsd: number, tradeNo: string, method: string, provider: string) {
  const quotaAmount = Math.round(amountUsd * QUOTA_PER_USD)
  await getPortalPool().query(
    `INSERT INTO top_ups
      (user_id, amount, money, trade_no, payment_method, payment_provider, create_time, complete_time, status)
     VALUES ($1, $2::bigint, $3::numeric, $4, $5, $6, $7, 0, 'pending')`,
    [userId, quotaAmount, amountUsd, tradeNo, method, provider, Math.floor(Date.now() / 1000)],
  )
}

export async function deletePendingTopUp(tradeNo: string) {
  await getPortalPool().query(`DELETE FROM top_ups WHERE trade_no = $1 AND status = 'pending'`, [tradeNo])
}

export async function getPendingTopUp(tradeNo: string) {
  const result = await getPortalPool().query<PendingTopUp>(
    `SELECT user_id, amount, money, trade_no, status FROM top_ups WHERE trade_no = $1 LIMIT 1`,
    [tradeNo],
  )
  return result.rows[0]
}
