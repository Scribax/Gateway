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
  { id: 'gpt-5.6-sol', label: 'GPT 5.6 Sol', input: 0.37095, output: 2.2257, cacheRead: 0.037095, cacheWrite: 0.4636875, accent: 'coral' },
  { id: 'gpt-5.5', label: 'GPT 5.5', input: 0.37095, output: 2.2257, cacheRead: 0.037095, cacheWrite: 0, accent: 'coral' },
  { id: 'gpt-5.4', label: 'GPT 5.4', input: 0.185475, output: 1.11285, cacheRead: 0.0185475, cacheWrite: 0, accent: 'blue' },
  { id: 'gpt-5.6-terra', label: 'GPT 5.6 Terra', input: 0.14838, output: 0.89028, cacheRead: 0.014838, cacheWrite: 0.185475, accent: 'blue' },
  { id: 'gpt-5.4-mini', label: 'GPT 5.4 Mini', input: 0.0556425, output: 0.333855, cacheRead: 0.00556425, cacheWrite: 0, accent: 'green' },
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
