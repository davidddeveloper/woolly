import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BUCKETS, categoryEmoji, OUT_KINDS, type Kind } from '../lib/buckets'
import { addDays, addMonths, dayKey, money, monthKey, monthLabel, parseDay } from '../lib/format'
import { monthTotals, totalsFor } from '../lib/game'
import { Card, CountUp, SectionTitle, spring } from '../components/ui'
import { budgetEmoji, budgetLabel, budgetStatus, periodRange, STATE_COLOR, type BudgetStatus } from '../lib/budgets'
import { vaultBalance } from '../lib/savings'
import { useStore } from '../store'

export function Insights() {
  const { entries, settings } = useStore()
  const cur = settings.currency
  const thisMonth = monthKey(dayKey())
  const [month, setMonth] = useState(thisMonth)
  const [dir, setDir] = useState(0)
  const t = useMemo(() => monthTotals(entries, month), [entries, month])
  const out = OUT_KINDS.reduce((s, k) => s + t[k], 0)
  const life = useMemo(() => totalsFor(entries), [entries])
  const vault = useMemo(() => vaultBalance(entries, settings.savingsStart), [entries, settings.savingsStart])

  const go = (n: number) => {
    setDir(n)
    setMonth((m) => addMonths(m, n))
  }

  const byCategory = (kind: Kind) => {
    const map = new Map<string, number>()
    for (const e of entries) if (e.kind === kind && monthKey(e.date) === month) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }
  const spend = byCategory('expense')
  const given = byCategory('buffer')

  const trend = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const m = addMonths(month, i - 5)
        const mt = monthTotals(entries, m)
        return { m, income: mt.income, out: OUT_KINDS.reduce((s, k) => s + mt[k], 0), kept: mt.saving + mt.investment }
      }),
    [entries, month],
  )
  const trendMax = Math.max(1, ...trend.flatMap((x) => [x.income, x.out]))

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-20 bg-cream/90 px-5 pb-2 backdrop-blur-xl pt-safe">
        <div className="flex h-12 items-center justify-between">
          <h1 className="text-[28px] font-black tracking-tight">Insights</h1>
          <div className="flex items-center gap-1">
            <button aria-label="Previous month" onClick={() => go(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-[var(--shadow-card)]">
              <ChevronLeft size={20} strokeWidth={3} />
            </button>
            <span className="w-[92px] text-center text-[15px] font-black">{monthLabel(month, 'short')} {month.slice(2, 4)}</span>
            <button aria-label="Next month" disabled={month >= thisMonth} onClick={() => go(1)} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-[var(--shadow-card)] disabled:opacity-30">
              <ChevronRight size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={month}
          className="flex flex-col gap-4 px-4 pt-2"
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
          transition={spring}
        >
          <Card className="flex flex-col items-center">
            <Donut totals={t} />
            <div className="-mt-[220px] flex h-[220px] w-[160px] flex-col items-center justify-center text-center">
              <span className="text-[12px] font-extrabold tracking-wider text-ink/45 uppercase">Money out</span>
              <CountUp value={out} currency={cur} className="text-[20px] leading-tight font-black" />
              <span className="text-[12px] font-bold text-ink/45">of {money(t.income, cur, { compact: true })} in</span>
            </div>
            <div className="mt-5 flex w-full flex-col gap-3">
              {OUT_KINDS.map((k, i) => {
                const pct = out ? t[k] / out : 0
                return (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[15px] font-extrabold">
                        {BUCKETS[k].emoji} {BUCKETS[k].label}
                      </span>
                      <span className="num text-[15px] font-black">
                        {money(t[k], cur)} <span className="text-ink/40">· {Math.round(pct * 100)}%</span>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full" style={{ background: BUCKETS[k].soft }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: BUCKETS[k].color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ duration: 0.9, delay: 0.2 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <BudgetHistory month={month} />

          <Breakdown title="Where spending went" kind="expense" rows={spend} currency={cur} family={settings.family} empty="No expenses this month. Frugal sheep!" />
          <Breakdown title="Family & giving" kind="buffer" rows={given} currency={cur} family={settings.family} empty="No gifts logged yet this month." />

          <Card>
            <SectionTitle>Six months</SectionTitle>
            <div className="flex h-[150px] items-end justify-between gap-2">
              {trend.map((x, i) => (
                <div key={x.m} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-[120px] w-full items-end justify-center gap-1">
                    {[
                      [x.income, BUCKETS.income.color],
                      [x.out, '#26232E22'],
                    ].map(([v, c], j) => (
                      <motion.div
                        key={j}
                        className="w-3 rounded-full"
                        style={{ background: c as string }}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(4, ((v as number) / trendMax) * 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] font-extrabold" style={{ color: x.m === month ? 'var(--color-ink)' : 'rgba(38,35,46,.4)' }}>
                    {monthLabel(x.m, 'short')}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-4 text-[13px] font-bold text-ink/55">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-income" /> In
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-ink/15" /> Out
              </span>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 px-4">
        <SectionTitle>Your wool vault · all time</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {(['saving', 'investment', 'buffer'] as const).map((k, i) => (
            <motion.div
              key={k}
              className="flex flex-col gap-1 rounded-3xl p-4"
              style={{ background: BUCKETS[k].soft }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.06 }}
            >
              <span className="text-[26px]">{BUCKETS[k].emoji}</span>
              <span className="text-[13px] font-extrabold" style={{ color: BUCKETS[k].deep }}>
                {k === 'saving' ? 'In savings' : BUCKETS[k].verb}
              </span>
              <span className="num text-[15px] font-black">{money(k === 'saving' ? vault : life[k], cur, { compact: true })}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Donut({ totals }: { totals: ReturnType<typeof monthTotals> }) {
  const size = 220
  const stroke = 26
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const out = OUT_KINDS.reduce((s, k) => s + totals[k], 0)
  const gap = out ? 6 : 0
  let acc = 0
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#26232E" strokeOpacity={0.06} strokeWidth={stroke} fill="none" />
      {OUT_KINDS.map((k, i) => {
        const frac = out ? totals[k] / out : 0
        if (!frac) return null
        const len = Math.max(0, frac * c - gap)
        const offset = -acc * c
        acc += frac
        return (
          <motion.circle
            key={k}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={BUCKETS[k].color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDashoffset={offset}
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${len} ${c}` }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
          />
        )
      })}
    </svg>
  )
}

function Breakdown({ title, kind, rows, currency, family, empty }: { title: string; kind: Kind; rows: [string, number][]; currency: string; family: string[]; empty: string }) {
  const total = rows.reduce((s, [, v]) => s + v, 0)
  const b = BUCKETS[kind]
  return (
    <Card>
      <SectionTitle right={<span className="num text-[15px] font-black" style={{ color: b.deep }}>{money(total, currency)}</span>}>{title}</SectionTitle>
      {rows.length === 0 ? (
        <p className="py-2 text-[15px] font-semibold text-ink/50">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.slice(0, 6).map(([cat, v], i) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[20px]" style={{ background: b.soft }}>
                {categoryEmoji(kind, cat, family)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex justify-between">
                  <span className="truncate text-[15px] font-extrabold">{cat}</span>
                  <span className="num text-[15px] font-black">{money(v, currency)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: b.soft }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: b.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(v / rows[0][1]) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/** How each budget did in the month on screen. Weekly budgets count the weeks that started in it. */
function BudgetHistory({ month }: { month: string }) {
  const { budgets, entries, closes, settings } = useStore()
  const cur = settings.currency
  const today = dayKey()
  const first = `${month}-01`
  const last = periodRange('month', first).end
  const rows = useMemo(
    () =>
      budgets
        .filter((b) => b.created_at.slice(0, 10) <= last && first <= today)
        .map((b) => {
          if (b.period === 'month') return { b, month: budgetStatus(b, entries, closes, first), weeks: [] as BudgetStatus[] }
          const weeks: BudgetStatus[] = []
          for (let d = periodRange('week', first).start; d <= last && d <= today; d = addDays(d, 7))
            if (d >= first) weeks.push(budgetStatus(b, entries, closes, d))
          return { b, month: null, weeks }
        }),
    [budgets, entries, closes, first, last, today],
  )
  if (!rows.length) return null
  return (
    <Card>
      <SectionTitle>Budgets</SectionTitle>
      <div className="flex flex-col gap-4">
        {rows.map(({ b, month: m, weeks }, i) => {
          const label = budgetLabel(b)
          const emoji = budgetEmoji(b, settings.family)
          if (m) {
            const tone = STATE_COLOR[m.spent > m.limit ? 'over' : m.range.left > 0 ? m.state : 'ok']
            const ended = m.range.left === 0
            return (
              <div key={b.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[15px] font-extrabold">
                    {emoji} {label}
                  </span>
                  <span className="num shrink-0 text-[13px] font-black" style={{ color: tone.deep }}>
                    {m.remaining < 0 ? `Over ${money(-m.remaining, cur)}` : ended ? `Kept ${money(m.remaining, cur)}` : `${money(m.remaining, cur)} left`}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full" style={{ background: tone.soft }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: tone.bar }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(1, m.pct) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="num mt-1 block text-[12px] font-bold text-ink/45">
                  {money(m.spent, cur)} of {money(m.limit, cur)} · monthly
                </span>
              </div>
            )
          }
          const inside = weeks.filter((w) => w.spent <= w.limit).length
          return (
            <div key={b.id}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-[15px] font-extrabold">
                  {emoji} {label}
                </span>
                <span className="num shrink-0 text-[13px] font-black text-ink/55">
                  {inside}/{weeks.length} weeks inside
                </span>
              </div>
              <div className="flex gap-1.5">
                {weeks.map((w) => {
                  const tone = STATE_COLOR[w.spent > w.limit ? 'over' : 'ok']
                  return (
                    <div key={w.range.start} className="flex flex-1 flex-col gap-1">
                      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: tone.soft }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(1, w.pct) * 100}%`, background: tone.bar }} />
                      </div>
                      <span className="text-center text-[11px] font-bold text-ink/40">
                        {parseDay(w.range.start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
