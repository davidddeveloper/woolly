import type { Entry, Settings } from '../db/repo'
import { addMonths, dayKey, monthKey, parseDay } from './format'

/**
 * What's in savings now. The starting balance is what was in the bank when it was set;
 * anything logged after that moves it, anything logged before is assumed to be in it.
 */
export function vaultBalance(entries: Entry[], start: Settings['savingsStart']) {
  let s = start?.amount ?? 0
  for (const e of entries) {
    if (start && e.created_at <= start.at) continue
    if (e.kind === 'saving') s += e.amount
    else if (e.kind === 'withdrawal') s -= e.amount
  }
  return s
}

export type PromiseState = 'kept' | 'partial' | 'missed' | 'open'

export interface PromiseMonth {
  month: string
  saved: number
  tapped: number
  state: PromiseState
}

/** Month by month: did you save what you promised? Deposits count; withdrawals are shown beside them. */
export function promiseMonths(entries: Entry[], plan: NonNullable<Settings['savingsPlan']>, today = dayKey(), count = 6): PromiseMonth[] {
  const now = monthKey(today)
  const first = [addMonths(now, -(count - 1)), plan.since].sort()[1]
  const out: PromiseMonth[] = []
  for (let m = first; m <= now; m = addMonths(m, 1)) {
    let saved = 0
    let tapped = 0
    for (const e of entries) {
      if (monthKey(e.date) !== m) continue
      if (e.kind === 'saving') saved += e.amount
      else if (e.kind === 'withdrawal') tapped += e.amount
    }
    const state: PromiseState = saved >= plan.amount ? 'kept' : m === now ? 'open' : saved > 0 ? 'partial' : 'missed'
    out.push({ month: m, saved, tapped, state })
  }
  return out
}

/** Months kept in a row, counting back from this month (which only counts once kept). */
export function promiseStreak(months: PromiseMonth[]) {
  let n = 0
  for (let i = months.length - 1; i >= 0; i--) {
    const m = months[i]
    if (m.state === 'open') continue
    if (m.state !== 'kept') break
    n++
  }
  return n
}

/** Longest run of kept months anywhere in the list (for the badge). */
export function bestPromiseRun(months: PromiseMonth[]) {
  let best = 0
  let run = 0
  for (const m of months) {
    run = m.state === 'kept' ? run + 1 : m.state === 'open' ? run : 0
    best = Math.max(best, run)
  }
  return best
}

/** Days left in the current month, today included. */
export function daysLeftInMonth(today = dayKey()) {
  const d = parseDay(today)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1
}
