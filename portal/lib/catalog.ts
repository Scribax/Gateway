export type ModelPrice = {
  id: string
  label: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  accent: 'green' | 'coral' | 'blue'
}

export const MODEL_CATALOG: ModelPrice[] = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', input: 0.75, output: 3.75, cacheRead: 0.075, cacheWrite: 1, accent: 'coral' },
  { id: 'codex-auto-review', label: 'codex-auto-review', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'blue' },
  { id: 'gpt-4o-audio-preview', label: 'GPT 4o Audio Preview', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'blue' },
  { id: 'gpt-4o-realtime-preview', label: 'GPT 4o Realtime Preview', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'blue' },
  { id: 'gpt-5.2', label: 'GPT 5.2', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'blue' },
  { id: 'gpt-5.2-2025-12-11', label: 'GPT 5.2 2025-12-11', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'blue' },
  { id: 'gpt-5.2-chat-latest', label: 'GPT 5.2 Chat Latest', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'blue' },
  { id: 'gpt-5.2-pro', label: 'GPT 5.2 Pro', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'coral' },
  { id: 'gpt-5.2-pro-2025-12-11', label: 'GPT 5.2 Pro 2025-12-11', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'coral' },
  { id: 'gpt-5.3-codex-spark', label: 'GPT 5.3 Codex Spark', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'blue' },
  { id: 'gpt-5.4', label: 'GPT 5.4', input: 0.185475, output: 1.11285, cacheRead: 0.0185475, cacheWrite: 0, accent: 'blue' },
  { id: 'gpt-5.4-2026-03-05', label: 'GPT 5.4 2026-03-05', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'blue' },
  { id: 'gpt-5.4-mini', label: 'GPT 5.4 Mini', input: 0.0556425, output: 0.333855, cacheRead: 0.00556425, cacheWrite: 0, accent: 'green' },
  { id: 'gpt-5.5', label: 'GPT 5.5', input: 0.37095, output: 2.2257, cacheRead: 0.037095, cacheWrite: 0, accent: 'coral' },
  { id: 'gpt-5.6', label: 'GPT 5.6', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'coral' },
  { id: 'gpt-5.6-sol', label: 'GPT 5.6 Sol', input: 0.37095, output: 2.2257, cacheRead: 0.037095, cacheWrite: 0.4636875, accent: 'coral' },
  { id: 'gpt-5.6-terra', label: 'GPT 5.6 Terra', input: 0.14838, output: 0.89028, cacheRead: 0.014838, cacheWrite: 0.185475, accent: 'blue' },
  { id: 'gpt-image-1', label: 'GPT Image 1', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'green' },
  { id: 'gpt-image-1.5', label: 'GPT Image 1.5', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'green' },
  { id: 'gpt-image-2', label: 'GPT Image 2', input: 0, output: 0, cacheRead: 0, cacheWrite: 0, accent: 'green' },
]

export const QUOTA_PER_USD = 500_000

export function usdFromQuota(quota: number): number {
  return quota / QUOTA_PER_USD
}

export function formatUsd(value: number, digits = 2): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}
