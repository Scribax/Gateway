import { Pool } from 'pg'

let pool: Pool | undefined

export function getPortalPool() {
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
