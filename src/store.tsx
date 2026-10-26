import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { openDb } from './db/sqlite'
import * as repo from './db/repo'
import type { Entry, EntryInput, Settings } from './db/repo'
import { activeDays, BADGES, earnedBadges, levelInfo, streakInfo, XP, type Badge } from './lib/game'
import type { Kind } from './lib/buckets'
import { budgetEmoji, budgetLabel, budgetStatus, counts, crossed, pendingReviews, type Budget, type BudgetClose, type BudgetInput, type BudgetStatus, type Crossed } from './lib/budgets'
import { dayKey } from './lib/format'
import { goalSaved, type Goal, type GoalInput } from './lib/goals'
import { anchorFor, isDue, nextOccurrence, type Recurring, type RecurringInput } from './lib/recurring'

/** How a fresh log moved a budget it counts toward. */
export interface BudgetPing {
  status: BudgetStatus
  crossed: Crossed
  label: string
  emoji: string
}

export type ReviewOutcome = 'saved' | 'treat' | 'rollover' | 'over' | 'dismissed'

export interface Celebration {
  id: number
  kind: Kind | 'checkin' | 'budget'
  /** Overrides the default line for this kind. */
  line?: string
  xp: number
  firstToday: boolean
  streak: number
  badges: Badge[]
  levelUp: { level: number; title: string } | null
  budget: BudgetPing | null
  /** A savings goal this write completed. */
  goal?: Pick<Goal, 'name' | 'emoji'> | null
}

interface Store {
  ready: boolean
  entries: Entry[]
  checkins: string[]
  badges: Record<string, string>
  budgets: Budget[]
  closes: BudgetClose[]
  /** Budget periods that ended and haven't been reviewed yet. */
  reviews: BudgetStatus[]
  recurring: Recurring[]
  /** Recurring entries whose date has come, oldest first. */
  due: Recurring[]
  goals: Goal[]
  settings: Settings
  days: Set<string>
  streak: ReturnType<typeof streakInfo>
  xp: number
  level: ReturnType<typeof levelInfo>
  celebration: Celebration | null
  dismissCelebration: () => void
  add: (e: EntryInput) => Promise<void>
  update: (id: string, e: EntryInput) => Promise<void>
  remove: (id: string) => Promise<Entry | undefined>
  restore: (e: Entry) => Promise<void>
  checkIn: () => Promise<void>
  saveBudget: (b: BudgetInput, id?: string) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  /** `into` is the saving category leftovers go to (a goal name, or Leftovers). */
  resolveReview: (s: BudgetStatus, outcome: ReviewOutcome, into?: string) => Promise<void>
  addRecurring: (r: RecurringInput, from: string) => Promise<void>
  confirmRecurring: (r: Recurring, amount?: number) => Promise<void>
  skipRecurring: (r: Recurring) => Promise<void>
  deleteRecurring: (id: string) => Promise<void>
  saveGoal: (g: GoalInput, prev?: Goal) => Promise<void>
  deleteGoal: (g: Goal) => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>
  reload: () => void
}

const REVIEW_LINES: Record<ReviewOutcome, string> = {
  saved: 'Leftovers swept into the vault 🧺',
  treat: 'Treat yourself — you earned it! 🍦',
  rollover: 'Rolled over. More room next time 🌾',
  over: 'Fresh start. You’ve got this 💪',
  dismissed: '',
}

const Ctx = createContext<Store | null>(null)

function computeXp(entries: Entry[], days: Set<string>, badgeCount: number) {
  return entries.length * XP.entry + days.size * XP.activeDay + badgeCount * XP.badge
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [checkins, setCheckins] = useState<string[]>([])
  const [badges, setBadges] = useState<Record<string, string>>({})
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [closes, setCloses] = useState<BudgetClose[]>([])
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [settings, setSettings] = useState<Settings>(repo.DEFAULT_SETTINGS)
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  const reload = useCallback(() => {
    setEntries(repo.loadEntries())
    setCheckins(repo.loadCheckins())
    setBadges(repo.loadBadges())
    setBudgets(repo.loadBudgets())
    setCloses(repo.loadCloses())
    setRecurring(repo.loadRecurring())
    setGoals(repo.loadGoals())
    setSettings(repo.loadSettings())
  }, [])

  useEffect(() => {
    openDb().then(() => {
      reload()
      setReady(true)
    })
  }, [reload])

  const days = useMemo(() => activeDays(entries, checkins), [entries, checkins])
  const streak = useMemo(() => streakInfo(days), [days])
  const xp = computeXp(entries, days, Object.keys(badges).length)
  const level = levelInfo(xp)
  const today = dayKey()
  const reviews = useMemo(() => pendingReviews(budgets, entries, closes, today), [budgets, entries, closes, today])
  const due = useMemo(() => recurring.filter((r) => isDue(r, today)), [recurring, today])

  /** The most newsworthy budget this entry counts toward. */
  const budgetPing = useCallback(
    (e: repo.EntryInput, before: repo.Entry[], after: repo.Entry[]): BudgetPing | null => {
      const pings = budgets
        .filter((b) => counts(b, e as repo.Entry))
        .map((b) => {
          const status = budgetStatus(b, after, closes, e.date)
          return { status, crossed: crossed(budgetStatus(b, before, closes, e.date), status), label: budgetLabel(b), emoji: budgetEmoji(b, settings.family) }
        })
      const rank = (p: BudgetPing) => (p.crossed === 'over' ? 4 : p.crossed === 'warn' ? 3 : 0) + (p.status.budget.category ? 1 : 0)
      return pings.sort((a, b) => rank(b) - rank(a))[0] ?? null
    },
    [budgets, closes, settings.family],
  )

  /** After any write: unlock new badges and work out what to celebrate. */
  const afterWrite = useCallback(
    async (kind: Kind | 'checkin' | 'budget' | null, extra: Pick<Celebration, 'budget' | 'line'> = { budget: null }) => {
      const beforeDays = days
      const beforeLevel = level.level
      const nextEntries = repo.loadEntries()
      const nextCheckins = repo.loadCheckins()
      const nextDays = activeDays(nextEntries, nextCheckins)
      const nextStreak = streakInfo(nextDays)
      const now = new Date().toISOString()
      const reached = repo.loadGoals().filter((g) => !g.reached_at && goalSaved(g, nextEntries) >= g.target)
      for (const g of reached) await repo.setGoalReached(g.id, now)
      const goalsReached = repo.loadGoals().filter((g) => g.reached_at).length
      const owned = repo.loadBadges()
      const fresh = earnedBadges(nextEntries, nextCheckins, nextStreak.longest, repo.loadCloses(), goalsReached).filter((id) => !owned[id])
      await repo.unlockBadges(fresh)
      reload()
      if (!kind) return
      const nextXp = computeXp(nextEntries, nextDays, Object.keys(owned).length + fresh.length)
      const nextLevel = levelInfo(nextXp)
      const firstToday = !beforeDays.has(dayKey()) && nextDays.has(dayKey())
      setCelebration({
        id: Date.now(),
        kind,
        ...extra,
        goal: reached[0] ? { name: reached[0].name, emoji: reached[0].emoji } : null,
        xp: (kind === 'checkin' || kind === 'budget' ? 0 : XP.entry) + (firstToday ? XP.activeDay : 0) + fresh.length * XP.badge,
        firstToday,
        streak: nextStreak.current,
        badges: BADGES.filter((b) => fresh.includes(b.id)),
        levelUp: nextLevel.level > beforeLevel ? { level: nextLevel.level, title: nextLevel.title } : null,
      })
    },
    [days, level.level, reload],
  )

  const value: Store = {
    ready,
    entries,
    checkins,
    badges,
    budgets,
    closes,
    reviews,
    recurring,
    due,
    goals,
    settings,
    days,
    streak,
    xp,
    level,
    celebration,
    dismissCelebration: () => setCelebration(null),
    add: async (e) => {
      const row = await repo.addEntry(e)
      await afterWrite(e.kind, { budget: budgetPing(e, entries, [row, ...entries]) })
    },
    update: async (id, e) => {
      await repo.updateEntry(id, e)
      await afterWrite(null)
    },
    remove: async (id) => {
      const found = entries.find((x) => x.id === id)
      await repo.deleteEntry(id)
      reload()
      return found
    },
    restore: async (e) => {
      await repo.restoreEntry(e)
      reload()
    },
    checkIn: async () => {
      await repo.checkInToday()
      await afterWrite('checkin')
    },
    saveBudget: async (b, id) => {
      await repo.saveBudget(b, id)
      reload()
    },
    deleteBudget: async (id) => {
      await repo.deleteBudget(id)
      reload()
    },
    resolveReview: async (s, outcome, into = 'Leftovers') => {
      const leftover = Math.max(0, s.remaining)
      const amount = outcome === 'saved' || outcome === 'rollover' ? leftover : 0
      await repo.closeBudget({ budget_id: s.budget.id, period_start: s.range.start, limit_amount: s.limit, spent: s.spent, outcome, amount })
      if (outcome === 'saved' && leftover > 0) {
        const e = { kind: 'saving' as const, amount: leftover, category: into, note: `${budgetLabel(s.budget)} budget leftover`, date: dayKey() }
        await repo.addEntry(e)
        await afterWrite('saving', { budget: null, line: into === 'Leftovers' ? REVIEW_LINES.saved : `Leftovers dropped into ${into} 🎯` })
      } else await afterWrite(outcome === 'dismissed' ? null : 'budget', { budget: null, line: REVIEW_LINES[outcome] })
    },
    addRecurring: async (r, from) => {
      const anchor = anchorFor(r.cadence, from)
      await repo.addRecurring({ ...r, anchor, next_date: nextOccurrence(r.cadence, anchor, from) })
      reload()
    },
    confirmRecurring: async (r, amount = r.amount) => {
      // Advance first so a quick double tap can't log the same occurrence twice.
      await repo.setRecurringNext(r.id, nextOccurrence(r.cadence, r.anchor, r.next_date))
      const e = { kind: r.kind, amount, category: r.category, note: r.note, date: r.next_date }
      const row = await repo.addEntry(e)
      await afterWrite(r.kind, { budget: budgetPing(e, entries, [row, ...entries]) })
    },
    skipRecurring: async (r) => {
      await repo.setRecurringNext(r.id, nextOccurrence(r.cadence, r.anchor, r.next_date))
      reload()
    },
    deleteRecurring: async (id) => {
      await repo.deleteRecurring(id)
      reload()
    },
    saveGoal: async (g, prev) => {
      await repo.saveGoal(g, prev)
      // A raised target can un-reach a goal; a lowered one is picked up on the next save.
      if (prev?.reached_at && goalSaved(g, repo.loadEntries()) < g.target) await repo.setGoalReached(prev.id, null)
      reload()
    },
    deleteGoal: async (g) => {
      await repo.deleteGoal(g)
      reload()
    },
    saveSettings: async (patch) => {
      await repo.saveSettings(patch)
      setSettings(repo.loadSettings())
    },
    reload,
  }

  if (import.meta.env.DEV) (window as unknown as { __woolly: Store }).__woolly = value

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}
