import type { Entry } from '../db/repo'
import { BUCKETS, categoryEmoji, type Kind } from './buckets'
import { addDays, dayKey, parseDay } from './format'

export type Period = 'week' | 'month'
export type BudgetKind = Extract<Kind, 'expense' | 'buffer'>

export interface Budget {
  id: string
  kind: BudgetKind
  /** Empty string = the whole bucket ("All spending"). */
  category: string
  period: Period
  amount: number
  /** What the budget covers, in the person's words. */
  note: string
  created_at: string
}

/** What happened when a budget period ended. One row per budget per period. */
export interface BudgetClose {
  budget_id: string
  period_start: string
  limit_amount: number
  spent: number
  outcome: 'saved' | 'treat' | 'rollover' | 'over' | 'dismissed'
  amount: number
  created_at: string
}

export type BudgetInput = Pick<Budget, 'kind' | 'category' | 'period' | 'amount' | 'note'>

export interface Range {
  start: string
  end: string
  days: number
  /** Days used so far, today included (1…days). */
  elapsed: number
  /** Days remaining, today included. */
  left: number
}

export function periodRange(period: Period, day = dayKey(), today = dayKey()): Range {
  let start: string
  let end: string
  if (period === 'week') {
    const dow = (parseDay(day).getDay() + 6) % 7 // Monday = 0
    start = addDays(day, -dow)
    end = addDays(start, 6)
  } else {
    const d = parseDay(day)
    start = dayKey(new Date(d.getFullYear(), d.getMonth(), 1))
    end = dayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  }
  const days = daysBetween(start, end) + 1
  const elapsed = today < start ? 0 : today > end ? days : daysBetween(start, today) + 1
  return { start, end, days, elapsed, left: days - elapsed + (elapsed > 0 && today <= end ? 1 : 0) }
}

function daysBetween(a: string, b: string) {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000)
}

export const previousStart = (b: Budget, today = dayKey()) => periodRange(b.period, addDays(periodRange(b.period, today).start, -1)).start

export function budgetLabel(b: Pick<Budget, 'kind' | 'category'>) {
  if (b.category) return b.category
  return b.kind === 'expense' ? 'All spending' : 'All giving'
}

export function budgetEmoji(b: Pick<Budget, 'kind' | 'category'>, family: string[]) {
  return b.category ? categoryEmoji(b.kind, b.category, family) : BUCKETS[b.kind].emoji
}

export const periodNoun = (p: Period) => (p === 'week' ? 'week' : 'month')

export const counts = (b: Pick<Budget, 'kind' | 'category'>, e: Entry) => e.kind === b.kind && (!b.category || e.category === b.category)

export function spentIn(b: Budget, entries: Entry[], r: Range) {
  let s = 0
  for (const e of entries) if (counts(b, e) && e.date >= r.start && e.date <= r.end) s += e.amount
  return s
}

/** Leftover the person chose to roll into this period. */
export function carryInto(b: Budget, start: string, closes: BudgetClose[]) {
  const prev = periodRange(b.period, addDays(start, -1)).start
  return closes.find((c) => c.budget_id === b.id && c.period_start === prev && c.outcome === 'rollover')?.amount ?? 0
}

export type BudgetState = 'ok' | 'fast' | 'warn' | 'over'

export interface BudgetStatus {
  budget: Budget
  range: Range
  limit: number
  carry: number
  spent: number
  remaining: number
  /** spent / limit */
  pct: number
  /** Share of the period that has passed. */
  pace: number
  /** What's left to spend per remaining day. */
  daily: number
  state: BudgetState
}

export const WARN_AT = 0.8

export function budgetStatus(b: Budget, entries: Entry[], closes: BudgetClose[], day = dayKey(), today = dayKey()): BudgetStatus {
  const range = periodRange(b.period, day, today)
  const carry = carryInto(b, range.start, closes)
  const limit = b.amount + carry
  const spent = spentIn(b, entries, range)
  const remaining = limit - spent
  const pct = limit ? spent / limit : 0
  const pace = range.elapsed / range.days
  const state: BudgetState = spent > limit ? 'over' : pct >= WARN_AT ? 'warn' : pct > pace + 0.15 && pct > 0.3 ? 'fast' : 'ok'
  return { budget: b, range, limit, carry, spent, remaining, pct, pace, daily: range.left ? Math.max(0, remaining) / range.left : 0, state }
}

export const STATE_COLOR: Record<BudgetState, { bar: string; soft: string; deep: string }> = {
  ok: { bar: '#34C17B', soft: '#DEF6E8', deep: '#1F9A5C' },
  fast: { bar: '#F5A524', soft: '#FFF1D6', deep: '#C97F06' },
  warn: { bar: '#FF8A1F', soft: '#FFE9D6', deep: '#D9660C' },
  over: { bar: '#FF6B5E', soft: '#FFE6E3', deep: '#D9443A' },
}

export type Crossed = 'warn' | 'over' | null

/** Did this change push the budget past 80% or 100%? */
export function crossed(before: BudgetStatus, after: BudgetStatus): Crossed {
  if (after.spent > after.limit && before.spent <= before.limit) return 'over'
  if (after.pct >= WARN_AT && before.pct < WARN_AT && after.spent <= after.limit) return 'warn'
  return null
}

/** Budgets whose last period ended without a review yet. */
export function pendingReviews(budgets: Budget[], entries: Entry[], closes: BudgetClose[], today = dayKey()) {
  const out: BudgetStatus[] = []
  for (const b of budgets) {
    const start = previousStart(b, today)
    const r = periodRange(b.period, start, today)
    // Only budgets that existed for (most of) that period, and only once.
    if (b.created_at.slice(0, 10) > addDays(r.start, Math.floor(r.days / 2))) continue
    if (closes.some((c) => c.budget_id === b.id && c.period_start === start)) continue
    out.push(budgetStatus(b, entries, closes, start, today))
  }
  return out
}

/** Average spend over the last few full periods, as a starting suggestion. */
export function suggestAmount(b: Pick<Budget, 'kind' | 'category' | 'period'>, entries: Entry[], today = dayKey()) {
  const n = b.period === 'week' ? 4 : 3
  let start = periodRange(b.period, today).start
  let total = 0
  let used = 0
  for (let i = 0; i < n; i++) {
    const r = periodRange(b.period, addDays(start, -1), today)
    start = r.start
    let s = 0
    for (const e of entries) if (counts(b, e) && e.date >= r.start && e.date <= r.end) s += e.amount
    if (s > 0) {
      total += s
      used++
    }
  }
  return used ? total / used : 0
}

/** Rounds a minor-unit amount up to a friendly number for suggestions. */
export function roundNice(minor: number, decimals: number) {
  const major = minor / 10 ** decimals
  const step = major >= 1000 ? 100 : major >= 100 ? 10 : 5
  return Math.ceil(major / step) * step * 10 ** decimals
}
