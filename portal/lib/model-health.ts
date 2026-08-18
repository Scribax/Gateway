import { readFile, writeFile } from 'fs/promises'

export type ModelHealthState = Record<string, {
  ok: boolean
  statusCode: number
  checkedAt: number
  message: string
}>

const HEALTH_FILE = process.env.MODEL_HEALTH_FILE || '/tmp/orbiqen-model-health.json'
const HEALTH_TTL_SECONDS = Number(process.env.MODEL_HEALTH_TTL_SECONDS || 14400)

export async function readModelHealth(): Promise<ModelHealthState> {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ HEALTH_FILE, 'utf8')
    const parsed = JSON.parse(raw) as ModelHealthState
    const minCheckedAt = Math.floor(Date.now() / 1000) - HEALTH_TTL_SECONDS
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value.checkedAt >= minCheckedAt),
    )
  } catch {
    return {}
  }
}

export async function writeModelHealth(next: ModelHealthState) {
  await writeFile(/* turbopackIgnore: true */ HEALTH_FILE, JSON.stringify(next, null, 2), 'utf8')
}

export async function mergeModelHealth(update: ModelHealthState) {
  const current = await readModelHealth()
  const next = { ...current, ...update }
  await writeModelHealth(next)
  return next
}
