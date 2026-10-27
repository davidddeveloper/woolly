import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, ChevronRight, Flame, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BUCKETS, OUT_KINDS, type Kind } from '../lib/buckets'
import { addMonths, dayKey, greeting, money, monthKey, monthLabel, monthName, parseDay, partOfDay } from '../lib/format'
import { monthTotals, pennyLine, pennyMood, weekDots } from '../lib/game'
import { Penny } from '../components/Penny'
import { Meadow } from '../components/Meadow'
import { EntryRow } from '../components/Nav'
import { BudgetsCard } from '../components/Budgets'
import { GoalsCard } from '../components/Goals'
import { DueCard } from '../components/Recurring'
import { VaultCard } from '../components/Vault'
import { daysLeftInMonth, promiseMonths } from '../lib/savings'
import { safeToSpend, upcomingThisMonth, type MonthMoney, type Source } from '../lib/month'
import { budgetLabel, budgetStatus, periodNoun, type Budget, type BudgetStatus } from '../lib/budgets'
import type { Goal } from '../lib/goals'
import { Card, Chunky, CountUp, Ring, SectionTitle, spring } from '../components/ui'
import type { Entry } from '../db/repo'
import { useStore } from '../store'

export function Home({
  onAdd,
  onEdit,
  onSeeAll,
  onBarn,
  onBudget,
  onGoal,
  onVault,
  onLog,
}: {
  onAdd: () => void
  onEdit: (e: Entry) => void
  onSeeAll: () => void
  onBarn: () => void
  onBudget: (b: Budget | null) => void
  onGoal: (g: Goal | null) => void
  onVault: () => void
  onLog: (kind: Kind, amount?: number, source?: Source) => void
}) {
  const { entries, settings, streak, level, days, checkIn, celebration, goals, budgets, closes, money: mm, treat } = useStore()
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100))
  const mood = pennyMood(streak)
  const stretched = useMemo(() => mostStretched(budgets.map((b) => budgetStatus(b, entries, closes))), [budgets, entries, closes])
  const nudge = stretched
    ? budgetLine(stretched, settings.name, settings.currency)
    : (promiseNudge(entries, settings.savingsPlan, settings.currency) ??
      (treat > 0 ? `${money(treat, settings.currency)} of treat money is waiting. Go do something nice 🍦` : null))
  // Every other tap, Penny mentions what needs care (never while she's asleep).
  const line = nudge && mood !== 'sleepy' && seed % 2 === 0 ? nudge : pennyLine(mood, settings.name, streak.current, seed)
  const month = monthKey(dayKey())
  const t = useMemo(() => monthTotals(entries, month), [entries, month])
  const cur = settings.currency
  const night = partOfDay() === 'night'

  return (
    <div className="pb-nav">
      <Meadow
        height={340}
        overlay={
          <div className="absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-safe">
            <div>
              <p className="text-[13px] font-extrabold tracking-wide text-ink/55 uppercase" style={night ? { color: 'rgba(255,255,255,.65)' } : undefined}>
                {greeting()}
              </p>
              <h1 className="text-[28px] leading-tight font-black tracking-tight" style={night ? { color: '#fff' } : undefined}>
                {settings.name || 'Friend'}
              </h1>
            </div>
            <div className="flex gap-2">
              <motion.div
                className="flex h-10 items-center gap-1 rounded-full bg-white/90 px-3 shadow-[var(--shadow-card)]"
                animate={streak.loggedToday ? { scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 0.5 }}
                key={String(streak.current)}
              >
                <Flame size={20} fill={streak.loggedToday ? '#FF8A1F' : 'none'} color={streak.loggedToday ? '#E8660C' : 'rgba(38,35,46,.35)'} strokeWidth={2.5} />
                <span className="num text-[17px] font-black" style={{ color: streak.loggedToday ? '#E8660C' : 'rgba(38,35,46,.45)' }}>
                  {streak.current}
                </span>
              </motion.div>
              <button onClick={onBarn} aria-label={`Level ${level.level}`} className="flex h-10 items-center gap-1 rounded-full bg-white/90 px-3 shadow-[var(--shadow-card)]">
                <Star size={18} fill="#F5A524" color="#C97F06" strokeWidth={2.5} />
                <span className="num text-[17px] font-black text-[#C97F06]">{level.level}</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="flex w-full items-end justify-center gap-1 px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={line}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={spring}
              className="relative mb-[118px] max-w-[190px] rounded-3xl rounded-br-md bg-white px-4 py-3 text-[15px] leading-snug font-extrabold shadow-[var(--shadow-float)]"
            >
              {line}
            </motion.div>
          </AnimatePresence>
          <Penny width={150} mood={mood} outfit={settings.outfit} jump={celebration?.id ?? 0} onTap={() => setSeed((s) => s + 1)} />
        </div>
      </Meadow>

      <div className="relative -mt-6 flex flex-col gap-4 rounded-t-[32px] bg-cream px-4 pt-5">
        <TodayCard onSpendTreat={() => onLog('expense', undefined, 'treat')} />

        <DueCard />

        <QuestCard logged={streak.loggedToday} streak={streak.current} days={days} onAdd={onAdd} onCheckIn={checkIn} />

        <BudgetsCard onEdit={onBudget} />

        <VaultCard onSettings={onVault} onLog={onLog} />

        <GoalsCard onEdit={onGoal} />

        {/* month flow */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-extrabold tracking-wider text-ink/50 uppercase">{monthLabel(month)} · money in</span>
            <span className="text-[20px]">🌾</span>
          </div>
          <CountUp value={t.income} currency={cur} className="mt-1 block text-[34px] leading-tight font-black" />
          <FlowBar totals={t} carried={mm.carried} />
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            {OUT_KINDS.map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: BUCKETS[k].color }} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-bold text-ink/50">{BUCKETS[k].verb}</span>
                  <span className="num truncate text-[15px] font-black">{money(t[k], cur, { compact: true })}</span>
                </span>
              </div>
            ))}
          </div>
          <Unallocated totals={t} mm={mm} currency={cur} />
        </Card>

        {/* goals */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[17px] font-black">Pay yourself first</span>
            <span className="text-[13px] font-bold text-ink/50">% of income</span>
          </div>
          <div className="grid grid-cols-3">
            {(['saving', 'investment', 'buffer'] as const).map((k) => {
              const pct = t.income ? (t[k] / t.income) * 100 : 0
              const target = settings.targets[k]
              const hit = t.income > 0 && pct >= target
              return (
                <div key={k} className="flex flex-col items-center gap-2">
                  <Ring progress={target ? pct / target : 0} color={BUCKETS[k].color} size={76} stroke={9}>
                    <motion.span
                      className="text-[26px]"
                      animate={hit ? { scale: [1, 1.25, 1], rotate: [0, -10, 10, 0] } : {}}
                      transition={{ duration: 0.8, delay: 1.2 }}
                    >
                      {hit ? '🏅' : BUCKETS[k].emoji}
                    </motion.span>
                  </Ring>
                  <span className="text-center leading-tight">
                    <span className="block text-[15px] font-black" style={{ color: BUCKETS[k].deep }}>
                      {Math.round(pct)}%
                      <span className="text-ink/35"> / {target}%</span>
                    </span>
                    <span className="text-[13px] font-bold text-ink/50">{BUCKETS[k].verb}</span>
                  </span>
                </div>
              )
            })}
          </div>
          {t.income === 0 && <p className="mt-4 text-center text-[13px] font-bold text-ink/45">Log this month's income to light up your goals.</p>}
        </Card>

        {/* recent */}
        <div className="mt-2">
          <SectionTitle
            right={
              entries.length > 0 && (
                <button onClick={onSeeAll} className="flex items-center text-[15px] font-extrabold text-meadow-deep">
                  See all <ChevronRight size={18} strokeWidth={3} />
                </button>
              )
            }
          >
            Recent
          </SectionTitle>
          {entries.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 text-center">
              <span className="text-[40px]">🐾</span>
              <p className="text-[17px] font-black">No hoofprints yet</p>
              <p className="text-[15px] font-semibold text-ink/55">Your first log earns the First Hoofprint badge.</p>
            </Card>
          ) : (
            <Card className="p-2">
              {entries.slice(0, 5).map((e, i) => (
                <EntryRow key={e.id} e={e} index={i} currency={cur} family={settings.family} goals={goals} onClick={() => onEdit(e)} />
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

const STRETCH_RANK = { over: 3, warn: 2, fast: 1, ok: 0 } as const

function mostStretched(rows: BudgetStatus[]) {
  const worst = [...rows].sort((a, b) => STRETCH_RANK[b.state] - STRETCH_RANK[a.state])[0]
  return worst && worst.state !== 'ok' ? worst : null
}

/** Late in the month with the saving promise not yet kept. */
function promiseNudge(entries: Entry[], plan: ReturnType<typeof useStore>['settings']['savingsPlan'], currency: string) {
  if (!plan) return null
  const now = promiseMonths(entries, plan).at(-1)
  const days = daysLeftInMonth()
  if (!now || now.saved >= plan.amount || days > 10) return null
  return `${money(plan.amount - now.saved, currency)} to go on this month's saving promise — ${days} day${days === 1 ? '' : 's'} left 🐷`
}

function budgetLine(s: BudgetStatus, name: string, currency: string) {
  const label = budgetLabel(s.budget)
  if (s.state === 'over') return `${label} hopped the fence this ${periodNoun(s.budget.period)}. Let's tiptoe till it resets 🐾`
  if (s.state === 'warn') return `Easy on ${label} — ${money(Math.floor(s.daily), currency)} a day keeps us inside the fence.`
  return `${label} is running ahead of plan. Slow and steady, ${name || 'friend'}!`
}

function QuestCard({ logged, streak, days, onAdd, onCheckIn }: { logged: boolean; streak: number; days: Set<string>; onAdd: () => void; onCheckIn: () => void }) {
  const dots = weekDots(days)
  return (
    <Card className="overflow-hidden">
      <div className="flex justify-between">
        {dots.map((d) => (
          <div key={d.key} className="flex flex-col items-center gap-1.5">
            <span className="text-[12px] font-extrabold" style={{ color: d.isToday ? '#E8660C' : 'rgba(38,35,46,.4)' }}>
              {parseDay(d.key).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
            <motion.span
              className="grid h-9 w-9 place-items-center rounded-full"
              style={{
                background: d.active ? '#FF8A1F' : 'transparent',
                boxShadow: d.active ? '0 3px 0 #E0660C' : d.isToday ? '0 0 0 2.5px #FF8A1F inset' : '0 0 0 2.5px var(--color-line) inset',
              }}
              initial={false}
              animate={d.active && d.isToday ? { scale: [0.6, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {d.active && <Flame size={18} fill="#fff" color="#fff" />}
            </motion.span>
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {logged ? (
          <motion.div key="done" className="mt-4 flex items-center gap-3 rounded-2xl bg-meadow-soft p-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <motion.span className="grid h-10 w-10 place-items-center rounded-full bg-meadow text-white" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={spring}>
              <Check size={22} strokeWidth={3.5} />
            </motion.span>
            <span className="flex flex-col">
              <span className="text-[15px] font-black text-meadow-deep">Today's quest complete!</span>
              <span className="text-[13px] font-bold text-ink/55">Log more anytime — every entry is +10 XP.</span>
            </span>
          </motion.div>
        ) : (
          <motion.div key="todo" className="mt-4 flex flex-col gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-[15px] font-bold text-ink/65">
              {streak > 0 ? (
                <>
                  Log one thing to keep your <b className="text-flame">{streak}-day streak</b> alive.
                </>
              ) : (
                'Log one thing today to start a streak.'
              )}
            </p>
            <Chunky onClick={onAdd}>Log money</Chunky>
            <button onClick={onCheckIn} className="h-10 text-[15px] font-extrabold text-ink/50 active:text-ink">
              Nothing to log today ✓
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function FlowBar({ totals, carried }: { totals: ReturnType<typeof monthTotals>; carried: number }) {
  const out = OUT_KINDS.reduce((s, k) => s + totals[k], 0)
  const base = Math.max(totals.income + totals.withdrawal + carried, out) || 1
  return (
    <div className="mt-4 flex h-4 w-full gap-[3px] overflow-hidden rounded-full bg-ink/[.06]">
      {OUT_KINDS.map((k, i) =>
        totals[k] > 0 ? (
          <motion.div
            key={k}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ background: BUCKETS[k].color }}
            initial={{ width: 0 }}
            animate={{ width: `${(totals[k] / base) * 100}%` }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : null,
      )}
    </div>
  )
}

function Unallocated({ totals, mm, currency }: { totals: ReturnType<typeof monthTotals>; mm: MonthMoney; currency: string }) {
  // Carried-in money and money taken back out of savings are spendable; spending paid from elsewhere isn't counted here.
  const left = mm.left
  if (!totals.income && !left && !mm.carried) return null
  const over = left < 0
  return (
    <>
      {mm.carried > 0 && (
        <div className="num mt-4 flex items-center justify-between px-3 text-[13px] font-extrabold text-ink/50">
          <span>🌾 Carried from {monthName(addMonths(mm.month, -1))}</span>
          <span>+{money(mm.carried, currency)}</span>
        </div>
      )}
      <div className={`${mm.carried > 0 ? 'mt-2' : 'mt-4'} flex items-center justify-between rounded-2xl px-3 py-2.5`} style={{ background: over ? '#FFE6E3' : '#F6F1E8' }}>
      <span className="text-[13px] font-extrabold" style={{ color: over ? '#D9443A' : 'rgba(38,35,46,.6)' }}>
        {over ? 'More out than in this month' : 'Still unassigned'}
      </span>
      <span className="num text-[15px] font-black" style={{ color: over ? '#D9443A' : 'var(--color-ink)' }}>
        {money(Math.abs(left), currency)}
      </span>
      </div>
    </>
  )
}

/**
 * The one number that matters day to day: what can go out today and still leave the
 * saving promise and the bills still to come this month untouched.
 */
function TodayCard({ onSpendTreat }: { onSpendTreat: () => void }) {
  const { entries, settings, recurring, money: mm, treat } = useStore()
  const [open, setOpen] = useState(false)
  const cur = settings.currency
  const plan = settings.savingsPlan
  const promise = plan ? Math.max(0, plan.amount - (promiseMonths(entries, plan).at(-1)?.saved ?? 0)) : 0
  const upcoming = useMemo(() => upcomingThisMonth(recurring), [recurring])
  const s = safeToSpend(mm.left, promise, upcoming.reduce((n, u) => n + u.r.amount, 0))
  const blank = mm.left === 0 && !entries.some((e) => monthKey(e.date) === mm.month)
  const sub =
    s.free > 0
      ? `${money(s.free, cur)} spare for the next ${s.days} day${s.days === 1 ? '' : 's'}`
      : mm.left < 0
        ? `This month is ${money(-mm.left, cur)} over`
        : mm.left > 0
          ? 'Everything left is already spoken for'
          : 'Log money in to see your daily number'

  return (
    <Card>
      <button onClick={() => !blank && setOpen((o) => !o)} className="flex w-full flex-col text-left" aria-expanded={open}>
        <span className="flex items-center justify-between">
          <span className="text-[13px] font-extrabold tracking-wider text-ink/50 uppercase">Safe to spend today</span>
          {!blank && (
            <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-ink/35">
              <ChevronDown size={20} strokeWidth={3} />
            </motion.span>
          )}
        </span>
        <CountUp
          value={s.perDay}
          currency={cur}
          className="mt-0.5 block text-[40px] leading-tight font-black"
          style={{ color: s.free > 0 ? 'var(--color-ink)' : 'rgba(38,35,46,.3)' }}
        />
        <span className="num text-[13px] font-bold" style={{ color: mm.left < 0 ? '#D9443A' : 'rgba(38,35,46,.5)' }}>
          {sub}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="num mt-3 flex flex-col gap-1.5 rounded-2xl bg-cream p-3 text-[13px] font-bold text-ink/60">
              <Line label="Left this month" value={money(mm.left, cur)} />
              {mm.carried > 0 && <Line label={`incl. ${monthName(addMonths(mm.month, -1))}'s leftover`} value={money(mm.carried, cur)} quiet />}
              {promise > 0 && <Line label="🐷 Saving promise still to go" value={`−${money(promise, cur)}`} />}
              {upcoming.map((u) => (
                <Line
                  key={u.r.id + u.date}
                  label={`🔁 ${u.r.category} · ${parseDay(u.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                  value={`−${money(u.r.amount, cur)}`}
                />
              ))}
              <div className="my-0.5 h-px bg-ink/10" />
              <Line label={`Spare ÷ ${s.days} day${s.days === 1 ? '' : 's'}`} value={`${money(s.perDay, cur)} a day`} strong />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {treat > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#FFE6F1] p-3">
          <span className="text-[28px]">🍦</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13px] font-extrabold text-[#C2357A]">Treat money · guilt-free</span>
            <span className="num truncate text-[19px] leading-tight font-black">{money(treat, cur)}</span>
          </span>
          <button onClick={onSpendTreat} className="h-10 shrink-0 rounded-xl bg-[#FF5FA2] px-3.5 text-[14px] font-extrabold text-white shadow-[0_3px_0_#C2357A]">
            Spend
          </button>
        </div>
      )}
    </Card>
  )
}

function Line({ label, value, quiet, strong }: { label: string; value: string; quiet?: boolean; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${quiet ? 'pl-3 text-ink/40' : ''} ${strong ? 'text-[14px] font-black text-ink' : ''}`}>
      <span className="truncate">{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  )
}
