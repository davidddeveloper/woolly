import type { Entry, Settings } from '../db/repo'
import type { BudgetClose } from './budgets'
import { addMonths, dayKey, monthEnd, monthKey } from './format'
import { nextOccurrence, type Recurring } from './recurring'
import { daysLeftInMonth } from './savings'

/** Where the money for an entry came from. Only 'month' comes out of this month's money. */
export type Source = 'month' | 'had' | 'savings' | 'treat'

export interface MonthClose {
  month: string
  leftover: number
  saved: number
  treat: number
  created_at: string
}

export const SOURCES: Record<Source, { label: string; short: string; emoji: string; hint: string }> = {
  month: { label: "This month's money", short: 'This month', emoji: '💵', hint: '' },
  had: { label: 'Money I already had', short: 'Already had', emoji: '👛', hint: "Still counts as spending, but doesn't come out of this month's money." },
  savings: { label: 'My savings', short: 'Savings', emoji: '🐷', hint: 'Comes out of your savings — the vault goes down.' },
  treat: { label: 'Treat money', short: 'Treat money', emoji: '🍦', hint: "Guilt-free. It's what you set aside to enjoy, so budgets don't count it." },
}

/** Which sources fit a kind (empty = the question doesn't apply). */
export function sourcesFor(kind: Entry['kind'], treatLeft: number): Source[] {
  if (kind === 'saving') return ['month', 'had']
  if (kind === 'expense' || kind === 'investment' || kind === 'buffer') return treatLeft > 0 ? ['month', 'had', 'savings', 'treat'] : ['month', 'had', 'savings']
  return []
}

const IN = new Set<Entry['kind']>(['income', 'withdrawal'])
export const fromMonth = (e: Entry) => !IN.has(e.kind) && (e.source ?? 'month') === 'month'

/** Money set aside to enjoy, dated by the month it was taken from. */
export function treatAllocations(closes: BudgetClose[], monthCloses: MonthClose[]) {
  const out: { date: string; amount: number }[] = []
  for (const c of closes) if (c.outcome === 'treat' && c.amount > 0) out.push({ date: dayKey(new Date(c.created_at)), amount: c.amount })
  for (const c of monthCloses) if (c.treat > 0) out.push({ date: monthEnd(c.month), amount: c.treat })
  return out
}

export function treatLeft(entries: Entry[], closes: BudgetClose[], monthCloses: MonthClose[]) {
  let t = 0
  for (const a of treatAllocations(closes, monthCloses)) t += a.amount
  for (const e of entries) if (e.source === 'treat') t -= e.amount
  return Math.max(0, t)
}

export interface MonthMoney {
  month: string
  /** Unspent money brought in from last month. */
  carried: number
  /** What's still free this month, carry included. */
  left: number
}

/**
 * This month's money: carried in + income + money taken out of savings, minus everything paid
 * from it. Whatever isn't spent rolls into the next month on its own (an overspend doesn't).
 */
export function monthMoney(
  entries: Entry[],
  closes: BudgetClose[],
  monthCloses: MonthClose[],
  since: Settings['carrySince'],
  month = monthKey(dayKey()),
): MonthMoney {
  const flow = new Map<string, number>()
  const bump = (m: string, n: number) => flow.set(m, (flow.get(m) ?? 0) + n)
  for (const e of entries) {
    if (IN.has(e.kind)) bump(monthKey(e.date), e.amount)
    else if (fromMonth(e)) bump(monthKey(e.date), -e.amount)
  }
  for (const a of treatAllocations(closes, monthCloses)) bump(monthKey(a.date), -a.amount)

  let carried = 0
  if (since && since < month) {
    for (let m = since; m < month; m = addMonths(m, 1)) carried = Math.max(0, carried + (flow.get(m) ?? 0))
  }
  return { month, carried, left: carried + (flow.get(month) ?? 0) }
}

/** Last month, if it ended with money spare and hasn't been wrapped up yet. */
export function pendingClose(entries: Entry[], closes: BudgetClose[], monthCloses: MonthClose[], since: Settings['carrySince'], today = dayKey()) {
  const prev = addMonths(monthKey(today), -1)
  if (!since || prev < since || monthCloses.some((c) => c.month === prev)) return null
  if (!entries.some((e) => monthKey(e.date) === prev)) return null
  const { left } = monthMoney(entries, closes, monthCloses, since, prev)
  return left > 0 ? { month: prev, leftover: left } : null
}

/** Repeating payments still to come before the month ends (unconfirmed ones included). */
export function upcomingThisMonth(recurring: Recurring[], today = dayKey()) {
  const end = monthEnd(monthKey(today))
  const items: { r: Recurring; date: string }[] = []
  for (const r of recurring) {
    if (r.kind === 'income' || r.kind === 'saving' || r.kind === 'withdrawal') continue
    for (let d = r.next_date, n = 0; d <= end && n < 6; d = nextOccurrence(r.cadence, r.anchor, d), n++) items.push({ r, date: d })
  }
  return items
}

export interface SafeToSpend {
  left: number
  promise: number
  upcoming: number
  free: number
  perDay: number
  days: number
}

/** What can go out each day for the rest of the month, after promises and bills already spoken for. */
export function safeToSpend(left: number, promiseToGo: number, upcoming: number, today = dayKey()): SafeToSpend {
  const days = daysLeftInMonth(today)
  const free = left - promiseToGo - upcoming
  return { left, promise: promiseToGo, upcoming, free, perDay: free > 0 ? Math.floor(free / days) : 0, days }
}
