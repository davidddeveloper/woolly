export type Kind = 'income' | 'expense' | 'saving' | 'investment' | 'buffer' | 'withdrawal'

export interface Category {
  id: string
  label: string
  emoji: string
}

export interface Bucket {
  kind: Kind
  label: string
  verb: string
  blurb: string
  emoji: string
  color: string
  soft: string
  deep: string
  categories: Category[]
}

const c = (label: string, emoji: string): Category => ({ id: label.toLowerCase().replace(/\W+/g, '-'), label, emoji })

export const BUCKETS: Record<Kind, Bucket> = {
  income: {
    kind: 'income',
    label: 'Income',
    verb: 'Money in',
    blurb: 'Salary, gigs, gifts — the harvest',
    emoji: '🌾',
    color: '#F5A524',
    soft: '#FFF1D6',
    deep: '#C97F06',
    categories: [c('Salary', '💼'), c('Freelance', '💻'), c('Business', '🏪'), c('Bonus', '🎉'), c('Gift', '🎁'), c('Refund', '↩️'), c('Other', '✨')],
  },
  expense: {
    kind: 'expense',
    label: 'Expense',
    verb: 'Spent',
    blurb: 'Day-to-day costs of living',
    emoji: '🛍️',
    color: '#FF6B5E',
    soft: '#FFE6E3',
    deep: '#D9443A',
    categories: [
      c('Food', '🍲'), c('Transport', '🚌'), c('Bills', '🧾'), c('Rent', '🏠'), c('Data & Phone', '📱'),
      c('Shopping', '🛒'), c('Fun', '🎬'), c('Health', '💊'), c('Personal', '🧴'), c('Other', '✨'),
    ],
  },
  saving: {
    kind: 'saving',
    label: 'Saving',
    verb: 'Put aside',
    blurb: 'Your wool vault — safe and growing',
    emoji: '🐷',
    color: '#3BA7FF',
    soft: '#E2F2FF',
    deep: '#1C7FD6',
    categories: [c('Emergency fund', '🛟'), c('Goal', '🎯'), c('Rainy day', '☔'), c('Big purchase', '🏍️'), c('Leftovers', '🧺'), c('Other', '✨')],
  },
  investment: {
    kind: 'investment',
    label: 'Investment',
    verb: 'Planted',
    blurb: 'Money that grows money — incl. in you',
    emoji: '🌱',
    color: '#8B5CF6',
    soft: '#EFE8FF',
    deep: '#6A3AD9',
    categories: [
      c('Stocks', '📈'), c('Crypto', '🪙'), c('Business', '🏗️'), c('Education', '🎓'), c('Tools & gear', '🛠️'),
      c('Real estate', '🏡'), c('Other', '✨'),
    ],
  },
  buffer: {
    kind: 'buffer',
    label: 'Buffer',
    verb: 'Given',
    blurb: 'Generosity to family & loved ones',
    emoji: '💝',
    color: '#FF5FA2',
    soft: '#FFE4F0',
    deep: '#D93A7E',
    categories: [], // built from the person's family list in settings
  },
  // Not a bucket of its own: money taken back out of savings. Reached from the Saving flow.
  withdrawal: {
    kind: 'withdrawal',
    label: 'Withdrawal',
    verb: 'Took out',
    blurb: 'Money taken back out of savings',
    emoji: '🔓',
    color: '#14B8A6',
    soft: '#DDF7F3',
    deep: '#0E8C7E',
    categories: [c('Emergency', '🚨'), c('Bills', '🧾'), c('Family', '💛'), c('Big purchase', '🛍️'), c('Opportunity', '✨'), c('Other', '❓')],
  },
}

/** The five buckets you pick from. Withdrawals sit under Saving. */
export const KINDS: Kind[] = ['income', 'expense', 'saving', 'investment', 'buffer']
export const ALL_KINDS: Kind[] = [...KINDS, 'withdrawal']
export const OUT_KINDS: Kind[] = ['expense', 'saving', 'investment', 'buffer']

export const DEFAULT_FAMILY = ['Mum', 'Dad', 'Siblings', 'Kids', 'Relatives', 'Friends', 'Charity']

const FAMILY_EMOJI: Record<string, string> = {
  mum: '👩', mom: '👩', mother: '👩', dad: '👨', father: '👨', siblings: '🧑‍🤝‍🧑', brother: '👦', sister: '👧',
  kids: '🧒', children: '🧒', relatives: '👪', friends: '🫶', charity: '🤲', church: '⛪', grandma: '👵', grandpa: '👴',
}

/** Savings goals show up as saving categories, first in line. */
export type GoalCategory = { name: string; emoji: string; reached_at?: string | null }

export function categoriesFor(kind: Kind, family: string[], goals: GoalCategory[] = []): Category[] {
  if (kind === 'saving') {
    const own = goals.filter((g) => !g.reached_at).map((g) => c(g.name, g.emoji))
    return [...own, ...BUCKETS.saving.categories.filter((x) => !own.some((g) => g.label === x.label))]
  }
  // Taking money from a goal (reached or not) lowers it, so goals come first.
  if (kind === 'withdrawal') {
    const own = goals.map((g) => c(g.name, g.emoji))
    return [...own, ...BUCKETS.withdrawal.categories.filter((x) => !own.some((g) => g.label === x.label))]
  }
  if (kind !== 'buffer') return BUCKETS[kind].categories
  return [...family.map((name) => c(name, FAMILY_EMOJI[name.toLowerCase()] ?? '💛')), c('Other', '✨')]
}

export function categoryEmoji(kind: Kind, label: string, family: string[], goals: GoalCategory[] = []) {
  if (kind === 'saving' || kind === 'withdrawal') {
    const g = goals.find((x) => x.name === label)
    if (g) return g.emoji
  }
  return categoriesFor(kind, family).find((x) => x.label === label)?.emoji ?? BUCKETS[kind].emoji
}

/** Words in a note that suggest an "expense" is really an investment in disguise. */
export const INVESTMENT_HINT = /\b(course|class|book|training|laptop|camera|tool|equipment|certif|tuition|workshop|conference|mentor|software|stock|shares)/i
