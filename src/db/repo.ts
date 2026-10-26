import { all, run, runMany } from './sqlite'
import type { Kind } from '../lib/buckets'
import { DEFAULT_FAMILY } from '../lib/buckets'
import { dayKey, uid } from '../lib/format'
import type { Budget, BudgetClose, BudgetInput } from '../lib/budgets'
import type { Goal, GoalInput } from '../lib/goals'
import type { Recurring } from '../lib/recurring'

export interface Entry {
  id: string
  kind: Kind
  amount: number
  category: string
  note: string
  date: string
  created_at: string
}

export interface Settings {
  onboarded: boolean
  name: string
  currency: string
  family: string[]
  /** Monthly targets as % of income. */
  targets: { saving: number; investment: number; buffer: number }
  outfit: string
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  name: '',
  currency: 'USD',
  family: DEFAULT_FAMILY,
  targets: { saving: 10, investment: 10, buffer: 5 },
  outfit: 'none',
}

export function loadEntries(): Entry[] {
  return all<Entry>('SELECT id, kind, amount, category, note, date, created_at FROM entries ORDER BY date DESC, created_at DESC')
}

export function loadCheckins(): string[] {
  return all<{ date: string }>('SELECT date FROM checkins ORDER BY date').map((r) => r.date)
}

export function loadBadges(): Record<string, string> {
  return Object.fromEntries(all<{ id: string; unlocked_at: string }>('SELECT * FROM badges').map((r) => [r.id, r.unlocked_at]))
}

export function loadSettings(): Settings {
  const rows = all<{ key: string; value: string }>('SELECT key, value FROM settings')
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const { key, value } of rows) {
    try {
      s[key] = JSON.parse(value)
    } catch {
      /* ignore a corrupt value and keep the default */
    }
  }
  return s as unknown as Settings
}

export async function saveSettings(patch: Partial<Settings>) {
  await runMany(
    Object.entries(patch).map(([k, v]) => [
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [k, JSON.stringify(v)],
    ]),
  )
}

export type EntryInput = Pick<Entry, 'kind' | 'amount' | 'category' | 'note' | 'date'>

export async function addEntry(e: EntryInput): Promise<Entry> {
  const row: Entry = { ...e, id: uid(), created_at: new Date().toISOString() }
  await run('INSERT INTO entries (id, kind, amount, category, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    row.id, row.kind, row.amount, row.category, row.note, row.date, row.created_at,
  ])
  return row
}

export async function updateEntry(id: string, e: EntryInput) {
  await run('UPDATE entries SET kind = ?, amount = ?, category = ?, note = ?, date = ? WHERE id = ?', [
    e.kind, e.amount, e.category, e.note, e.date, id,
  ])
}

export async function deleteEntry(id: string) {
  await run('DELETE FROM entries WHERE id = ?', [id])
}

export async function restoreEntry(e: Entry) {
  await run('INSERT OR REPLACE INTO entries (id, kind, amount, category, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    e.id, e.kind, e.amount, e.category, e.note, e.date, e.created_at,
  ])
}

export async function checkInToday() {
  await run('INSERT OR IGNORE INTO checkins (date, created_at) VALUES (?, ?)', [dayKey(), new Date().toISOString()])
}

export function loadBudgets(): Budget[] {
  return all<Budget>('SELECT id, kind, category, period, amount, note, created_at FROM budgets ORDER BY created_at')
}

export function loadCloses(): BudgetClose[] {
  return all<BudgetClose>('SELECT * FROM budget_closes ORDER BY period_start')
}

export async function saveBudget(b: BudgetInput, id?: string) {
  if (id) await run('UPDATE budgets SET kind = ?, category = ?, period = ?, amount = ?, note = ? WHERE id = ?', [b.kind, b.category, b.period, b.amount, b.note ?? '', id])
  else
    await run('INSERT INTO budgets (id, kind, category, period, amount, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      uid(), b.kind, b.category, b.period, b.amount, b.note ?? '', new Date().toISOString(),
    ])
}

export async function deleteBudget(id: string) {
  await runMany([
    ['DELETE FROM budget_closes WHERE budget_id = ?', [id]],
    ['DELETE FROM budgets WHERE id = ?', [id]],
  ])
}

export async function closeBudget(c: Omit<BudgetClose, 'created_at'>) {
  await run(
    'INSERT OR REPLACE INTO budget_closes (budget_id, period_start, limit_amount, spent, outcome, amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [c.budget_id, c.period_start, c.limit_amount, c.spent, c.outcome, c.amount, new Date().toISOString()],
  )
}

export function loadRecurring(): Recurring[] {
  return all<Recurring>('SELECT * FROM recurring ORDER BY next_date, created_at')
}

export async function addRecurring(r: Omit<Recurring, 'id' | 'created_at'>) {
  await run('INSERT INTO recurring (id, kind, amount, category, note, cadence, anchor, next_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    uid(), r.kind, r.amount, r.category, r.note, r.cadence, r.anchor, r.next_date, new Date().toISOString(),
  ])
}

export async function setRecurringNext(id: string, next: string) {
  await run('UPDATE recurring SET next_date = ? WHERE id = ?', [next, id])
}

export async function deleteRecurring(id: string) {
  await run('DELETE FROM recurring WHERE id = ?', [id])
}

export function loadGoals(): Goal[] {
  return all<Goal>('SELECT * FROM goals ORDER BY reached_at IS NOT NULL, created_at')
}

/** Renaming a goal carries its saving entries along, since they're linked by category. */
export async function saveGoal(g: GoalInput, prev?: Goal) {
  if (!prev) {
    await run('INSERT INTO goals (id, name, emoji, target, deadline, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      uid(), g.name, g.emoji, g.target, g.deadline, new Date().toISOString(),
    ])
    return
  }
  await runMany([
    ['UPDATE goals SET name = ?, emoji = ?, target = ?, deadline = ? WHERE id = ?', [g.name, g.emoji, g.target, g.deadline, prev.id]],
    ["UPDATE entries SET category = ? WHERE kind = 'saving' AND category = ?", [g.name, prev.name]],
  ])
}

export async function setGoalReached(id: string, at: string | null) {
  await run('UPDATE goals SET reached_at = ? WHERE id = ?', [at, id])
}

/** The money stays saved; its entries just fall back to the generic "Goal" category. */
export async function deleteGoal(g: Goal) {
  await runMany([
    ["UPDATE entries SET category = 'Goal' WHERE kind = 'saving' AND category = ?", [g.name]],
    ['DELETE FROM goals WHERE id = ?', [g.id]],
  ])
}

export async function unlockBadges(ids: string[]) {
  if (!ids.length) return
  const now = new Date().toISOString()
  await runMany(ids.map((id) => ['INSERT OR IGNORE INTO badges (id, unlocked_at) VALUES (?, ?)', [id, now]]))
}
