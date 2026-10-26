import type { Entry } from '../db/repo'
import { addDays, dayKey, parseDay } from './format'

export type Cadence = 'week' | 'month'

/** A money movement that repeats. It's never logged silently: when due, Penny asks. */
export interface Recurring {
  id: string
  kind: Entry['kind']
  amount: number
  category: string
  note: string
  cadence: Cadence
  /** Weekday (Mon = 0) for weekly, day of month (1–31) for monthly. */
  anchor: number
  next_date: string
  created_at: string
}

export type RecurringInput = Pick<Recurring, 'kind' | 'amount' | 'category' | 'note' | 'cadence'>

export function anchorFor(cadence: Cadence, date: string) {
  const d = parseDay(date)
  return cadence === 'week' ? (d.getDay() + 6) % 7 : d.getDate()
}

/** First matching day strictly after `after`. Day 31 means "last day" in shorter months. */
export function nextOccurrence(cadence: Cadence, anchor: number, after: string) {
  if (cadence === 'week') {
    const dow = (parseDay(after).getDay() + 6) % 7
    return addDays(after, ((anchor - dow + 6) % 7) + 1)
  }
  const d = parseDay(after)
  for (let m = 0; m < 2; m++) {
    const last = new Date(d.getFullYear(), d.getMonth() + m + 1, 0).getDate()
    const key = dayKey(new Date(d.getFullYear(), d.getMonth() + m, Math.min(anchor, last)))
    if (key > after) return key
  }
  throw new Error('unreachable')
}

export const isDue = (r: Recurring, today = dayKey()) => r.next_date <= today

export function cadenceLabel(r: Pick<Recurring, 'cadence' | 'anchor'>) {
  if (r.cadence === 'week') {
    const monday = new Date(2024, 0, 1) // a Monday
    monday.setDate(1 + r.anchor)
    return `Every ${monday.toLocaleDateString(undefined, { weekday: 'long' })}`
  }
  return `Monthly on the ${ordinal(r.anchor)}`
}

function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${s}`
}
