export const CURRENCIES = [
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
  { code: 'NGN', flag: '🇳🇬', name: 'Naira' },
  { code: 'GHS', flag: '🇬🇭', name: 'Cedi' },
  { code: 'KES', flag: '🇰🇪', name: 'Kenyan Shilling' },
  { code: 'ZAR', flag: '🇿🇦', name: 'Rand' },
  { code: 'SLE', flag: '🇸🇱', name: 'Leone' },
  { code: 'XOF', flag: '🌍', name: 'CFA Franc (W)' },
  { code: 'XAF', flag: '🌍', name: 'CFA Franc (C)' },
  { code: 'CAD', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'INR', flag: '🇮🇳', name: 'Rupee' },
]

const fmtCache = new Map<string, Intl.NumberFormat>()
function nf(currency: string, compact = false) {
  const key = currency + compact
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: compact ? 1 : undefined,
    })
    fmtCache.set(key, f)
  }
  return f
}

export function decimalsFor(currency: string) {
  return nf(currency).resolvedOptions().maximumFractionDigits ?? 2
}

export function toMinor(major: number, currency: string) {
  return Math.round(major * 10 ** decimalsFor(currency))
}

export function toMajor(minor: number, currency: string) {
  return minor / 10 ** decimalsFor(currency)
}

export function money(minor: number, currency: string, opts: { compact?: boolean } = {}) {
  const major = toMajor(minor, currency)
  const compact = opts.compact && Math.abs(major) >= 100_000
  return nf(currency, compact).format(major)
}

export function currencySymbol(currency: string) {
  return nf(currency).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency
}

// ---- dates (always local, never UTC) ----

export function dayKey(d: Date = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDay(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number) {
  const d = parseDay(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

export function monthKey(key: string) {
  return key.slice(0, 7)
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return dayKey(d).slice(0, 7)
}

export function monthLabel(month: string, style: 'long' | 'short' = 'long') {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: style, year: style === 'long' ? 'numeric' : undefined })
}

/** "October" — just the month's name. */
export function monthName(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long' })
}

/** Last day of a month, as a day key. */
export function monthEnd(month: string) {
  const [y, m] = month.split('-').map(Number)
  return dayKey(new Date(y, m, 0))
}

export function friendlyDay(key: string) {
  const today = dayKey()
  if (key === today) return 'Today'
  if (key === addDays(today, -1)) return 'Yesterday'
  const d = parseDay(key)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' })
}

export function partOfDay(h = new Date().getHours()): 'dawn' | 'day' | 'dusk' | 'night' {
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'dusk'
  return 'night'
}

export function greeting(h = new Date().getHours()) {
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function uid() {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
