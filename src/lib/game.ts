import type { Entry, Settings } from '../db/repo'
import { KINDS, type Kind } from './buckets'
import { addDays, dayKey, monthKey } from './format'
import type { BudgetClose } from './budgets'

export type Totals = Record<Kind, number>
export const emptyTotals = (): Totals => ({ income: 0, expense: 0, saving: 0, investment: 0, buffer: 0, withdrawal: 0 })

export function totalsFor(entries: Entry[], predicate: (e: Entry) => boolean = () => true): Totals {
  const t = emptyTotals()
  for (const e of entries) if (predicate(e)) t[e.kind] += e.amount
  return t
}

export function monthTotals(entries: Entry[], month: string) {
  return totalsFor(entries, (e) => monthKey(e.date) === month)
}

// ---------- streaks ----------

export function activeDays(entries: Entry[], checkins: string[]) {
  const days = new Set(checkins)
  for (const e of entries) days.add(dayKey(new Date(e.created_at)))
  return days
}

export function streakInfo(days: Set<string>, today = dayKey()) {
  const loggedToday = days.has(today)
  let cursor = loggedToday ? today : addDays(today, -1)
  let current = 0
  while (days.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }
  const sorted = [...days].sort()
  let longest = 0
  let run = 0
  let prev = ''
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = d
  }
  const last = sorted[sorted.length - 1]
  const broken = current === 0 && !!last && last < addDays(today, -1)
  return { current, longest, loggedToday, broken, lastActive: last }
}

/** Last 7 days, oldest first, for the week dots. */
export function weekDots(days: Set<string>, today = dayKey()) {
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6)
    return { key, active: days.has(key), isToday: key === today }
  })
}

// ---------- XP & levels ----------

export const XP = { entry: 10, activeDay: 15, badge: 50 }

export const LEVELS = [
  'Little Lamb', 'Woolling', 'Fluffball', 'Meadow Walker', 'Flock Keeper',
  'Hill Shepherd', 'Silver Fleece', 'Golden Fleece', 'Pasture Legend', 'Ram of Riches',
]

export const xpForLevel = (n: number) => 50 * n * (n - 1)

export function levelInfo(xp: number) {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return {
    level,
    title: LEVELS[Math.min(level, LEVELS.length) - 1],
    into: xp - base,
    span: next - base,
    progress: (xp - base) / (next - base),
  }
}

// ---------- wardrobe ----------

export const OUTFITS = [
  { id: 'none', label: 'Natural', level: 1, emoji: '🐑' },
  { id: 'scarf', label: 'Cosy scarf', level: 2, emoji: '🧣' },
  { id: 'flower', label: 'Daisy', level: 3, emoji: '🌼' },
  { id: 'beanie', label: 'Beanie', level: 4, emoji: '🧶' },
  { id: 'glasses', label: 'Smart specs', level: 5, emoji: '👓' },
  { id: 'bowtie', label: 'Bow tie', level: 6, emoji: '🎀' },
  { id: 'party', label: 'Party hat', level: 7, emoji: '🥳' },
  { id: 'crown', label: 'Golden crown', level: 8, emoji: '👑' },
] as const

export type OutfitId = (typeof OUTFITS)[number]['id']

// ---------- badges ----------

export interface BadgeCtx {
  entries: Entry[]
  longest: number
  checkins: string[]
  count: Record<Kind, number>
  months: Map<string, Totals>
  closes: BudgetClose[]
  goalsReached: number
  /** Longest run of months the saving promise was kept. */
  promiseStreak: number
}

export interface Badge {
  id: string
  name: string
  emoji: string
  how: string
  test: (c: BadgeCtx) => boolean
}

export const BADGES: Badge[] = [
  { id: 'first', name: 'First Hoofprint', emoji: '🐾', how: 'Log your very first entry', test: (c) => c.entries.length >= 1 },
  { id: 'streak3', name: 'Three in a Row', emoji: '🔥', how: 'Reach a 3-day streak', test: (c) => c.longest >= 3 },
  { id: 'streak7', name: 'Week of Wool', emoji: '🧶', how: 'Reach a 7-day streak', test: (c) => c.longest >= 7 },
  { id: 'streak30', name: 'Merino Month', emoji: '🏆', how: 'Reach a 30-day streak', test: (c) => c.longest >= 30 },
  { id: 'quiet', name: 'Quiet Day', emoji: '🍃', how: 'Check in on a day with nothing to log', test: (c) => c.checkins.length >= 1 },
  { id: 'seed', name: 'Seed Planter', emoji: '🌱', how: 'Log your first investment', test: (c) => c.count.investment >= 1 },
  { id: 'vault', name: 'Wool Vault', emoji: '🐷', how: 'Put money aside 10 times', test: (c) => c.count.saving >= 10 },
  { id: 'heart', name: 'Big Heart', emoji: '💝', how: 'Give to family 5 times', test: (c) => c.count.buffer >= 5 },
  {
    id: 'tenth', name: 'Keep a Tenth', emoji: '🏺', how: 'Save + invest 10% of a month’s income',
    test: (c) => [...c.months.values()].some((t) => t.income > 0 && t.saving + t.investment >= t.income * 0.1),
  },
  {
    id: 'balanced', name: 'Balanced Bale', emoji: '⚖️', how: 'Use all five buckets in one month',
    test: (c) => [...c.months.values()].some((t) => KINDS.every((k) => t[k] > 0)),
  },
  { id: 'fence', name: 'Inside the Fence', emoji: '🌿', how: 'Finish a budget period without going over', test: (c) => c.closes.some((x) => x.spent <= x.limit_amount) },
  { id: 'leftovers', name: 'Leftover Lamb', emoji: '🧺', how: 'Sweep budget leftovers into savings 3 times', test: (c) => c.closes.filter((x) => x.outcome === 'saved').length >= 3 },
  { id: 'promise', name: 'Promise Keeper', emoji: '🤝', how: 'Keep your monthly saving promise 3 months in a row', test: (c) => c.promiseStreak >= 3 },
  { id: 'goal', name: 'Goal Getter', emoji: '🎯', how: 'Reach a savings goal', test: (c) => c.goalsReached >= 1 },
  { id: 'fifty', name: 'Fifty Hoofprints', emoji: '⭐', how: 'Log 50 entries', test: (c) => c.entries.length >= 50 },
  { id: 'century', name: 'Century Shepherd', emoji: '💯', how: 'Log 100 entries', test: (c) => c.entries.length >= 100 },
]

export function earnedBadges(
  entries: Entry[],
  checkins: string[],
  longest: number,
  extra: { closes?: BudgetClose[]; goalsReached?: number; promiseStreak?: number } = {},
) {
  const { closes = [], goalsReached = 0, promiseStreak = 0 } = extra
  const count = emptyTotals()
  const months = new Map<string, Totals>()
  for (const e of entries) {
    count[e.kind]++
    const m = monthKey(e.date)
    const t = months.get(m) ?? emptyTotals()
    t[e.kind] += e.amount
    months.set(m, t)
  }
  const ctx: BadgeCtx = { entries, longest, checkins, count, months, closes, goalsReached, promiseStreak }
  return BADGES.filter((b) => b.test(ctx)).map((b) => b.id)
}

// ---------- Penny ----------

export type Mood = 'happy' | 'excited' | 'waiting' | 'worried' | 'sleepy' | 'sad'

export function pennyMood(s: { loggedToday: boolean; current: number; broken: boolean }, hour = new Date().getHours()): Mood {
  const night = hour >= 22 || hour < 5
  if (s.loggedToday) return night ? 'sleepy' : s.current >= 7 ? 'excited' : 'happy'
  if (night) return 'sleepy'
  if (s.broken) return 'sad'
  if (hour >= 18 && s.current > 0) return 'worried'
  return 'waiting'
}

const pick = <T,>(xs: T[], seed: number) => xs[Math.abs(seed) % xs.length]

export function pennyLine(mood: Mood, name: string, streak: number, seed = new Date().getDate()) {
  const n = name || 'friend'
  const lines: Record<Mood, string[]> = {
    happy: [
      `Baa-rilliant, ${n}! Today's logged.`,
      `Every coin counted. I'm so proud of you!`,
      `${streak} day${streak === 1 ? '' : 's'} strong. My wool is extra fluffy today.`,
      `Logged and lovely. See you tomorrow?`,
    ],
    excited: [
      `${streak}-day streak!! You're a legend of the pasture!`,
      `Look at us go, ${n}! ${streak} days in a row!`,
      `My hooves are dancing — ${streak} days!`,
    ],
    waiting: [
      `Hi ${n}! Anything come in or go out today?`,
      `I've been grazing… and waiting for your first log!`,
      `A quick log keeps the worries away. Baa!`,
      `Even "nothing today" counts. Tap below!`,
    ],
    worried: [
      `Psst ${n}… your ${streak}-day streak ends at midnight!`,
      `Don't leave me hanging — one tiny log saves our streak!`,
      `The sun's going down… let's log before it does!`,
    ],
    sleepy: [
      `Zzz… oh! Hi ${n}. Log something and we can both sleep.`,
      `Yawn… even sheep count coins before bed.`,
      `Sweet dreams of compound interest…`,
    ],
    sad: [
      `I missed you, ${n}! Let's start a fresh streak today.`,
      `New day, new streak. I believe in you!`,
      `The meadow was lonely… shall we log something?`,
    ],
  }
  return pick(lines[mood], seed)
}

export const SAVE_LINES: Record<Kind, string[]> = {
  income: ['Cha-ching! The harvest is in 🌾', 'Money in! Baa-utiful.', 'Look at that grass grow!'],
  expense: ['Logged! Every coin counted.', 'Noted — awareness is a superpower.', 'Tracked. Future you says thanks.'],
  saving: ['Into the wool vault! 🐷', 'Pay yourself first — nailed it.', 'Your safety blanket just got thicker.'],
  investment: ['Seeds planted 🌱', 'Money that makes money. Smart!', 'Future you is doing a happy dance.'],
  buffer: ['Generosity looks good on you 💝', 'Your family is lucky to have you.', 'A full heart is real wealth.'],
  withdrawal: ['Noted — that’s what savings are for 🛟', 'Taken out and tracked. Awareness, not guilt.', 'Logged. We’ll refill the vault together 🐑'],
}

export function saveLine(kind: Kind) {
  return pick(SAVE_LINES[kind], Math.floor(Math.random() * 100))
}

export type { Settings }
