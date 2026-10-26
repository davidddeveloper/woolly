import { AnimatePresence, motion } from 'motion/react'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BUCKETS, categoriesFor } from '../lib/buckets'
import {
  budgetEmoji,
  budgetLabel,
  budgetStatus,
  periodNoun,
  roundNice,
  STATE_COLOR,
  suggestAmount,
  type Budget,
  type BudgetKind,
  type BudgetStatus,
  type Period,
} from '../lib/budgets'
import { currencySymbol, decimalsFor, monthLabel, money, parseDay, toMajor, toMinor } from '../lib/format'
import { useStore, type ReviewOutcome } from '../store'
import { Penny } from './Penny'
import { Card, Chunky, Sheet, spring } from './ui'

// ---------- Home card ----------

export function BudgetsCard({ onEdit }: { onEdit: (b: Budget | null) => void }) {
  const { budgets, entries, closes, settings } = useStore()
  const rows = useMemo(() => budgets.map((b) => budgetStatus(b, entries, closes)), [budgets, entries, closes])
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[17px] font-black">Budgets</span>
        {rows.length > 0 && (
          <button onClick={() => onEdit(null)} className="flex h-8 items-center gap-1 rounded-full bg-cream px-3 text-[13px] font-extrabold text-ink/70 active:bg-wool">
            <Plus size={15} strokeWidth={3} /> New
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-cream p-3">
            <span className="text-[32px]">🎯</span>
            <p className="text-[13px] leading-snug font-bold text-ink/60">
              Plan ahead: give Transport, Food or family a weekly or monthly budget. Log small as you go — Penny keeps watch and cheers what you don't spend.
            </p>
          </div>
          <button onClick={() => onEdit(null)} className="chunky-soft flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold">
            <Plus size={18} strokeWidth={3} /> Set a budget
          </button>
        </div>
      ) : (
        <div className="-mx-2 flex flex-col">
          {rows.map((s, i) => (
            <BudgetRow key={s.budget.id} s={s} index={i} currency={settings.currency} family={settings.family} onClick={() => onEdit(s.budget)} />
          ))}
        </div>
      )}
    </Card>
  )
}

function BudgetRow({ s, index, currency, family, onClick }: { s: BudgetStatus; index: number; currency: string; family: string[]; onClick: () => void }) {
  const tone = STATE_COLOR[s.state]
  const b = BUCKETS[s.budget.kind]
  const days = s.range.left
  const note =
    s.state === 'over'
      ? `Over by ${money(-s.remaining, currency)} · ${days} day${days === 1 ? '' : 's'} left`
      : s.state === 'warn'
        ? `Almost there — ${money(Math.floor(s.daily), currency)}/day keeps you inside`
        : s.state === 'fast'
          ? `Spending a bit faster than planned`
          : days > 1
            ? `${money(Math.floor(s.daily), currency)}/day for ${days} days`
            : 'Last day — nearly there!'
  return (
    <motion.button
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-2xl p-2 text-left active:bg-wool/60"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.04 }}
    >
      <div className="flex w-full items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[22px]" style={{ background: b.soft }}>
          {budgetEmoji(s.budget, family)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[15px] font-extrabold">{budgetLabel(s.budget)}</span>
            <span className="num shrink-0 text-[15px] font-black" style={{ color: s.state === 'ok' ? 'var(--color-ink)' : tone.deep }}>
              {s.remaining >= 0 ? `${money(s.remaining, currency)} left` : `−${money(-s.remaining, currency)}`}
            </span>
          </span>
          <span className="num truncate text-[13px] font-bold text-ink/50">
            {money(s.spent, currency)} of {money(s.limit, currency)} · this {periodNoun(s.budget.period)}
            {s.carry > 0 && ' (incl. rollover)'}
          </span>
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full" style={{ background: tone.soft }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: tone.bar }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(1, s.pct) * 100}%` }}
          transition={{ duration: 0.9, delay: 0.15 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* where you "should" be by today */}
        {s.pace < 1 && (
          <span
            className="absolute -top-[3px] h-[18px] w-[3px] -translate-x-1/2 rounded-full bg-ink/25"
            style={{ left: `${s.pace * 100}%` }}
            aria-hidden
          />
        )}
      </div>
      <span className="text-[12px] font-extrabold" style={{ color: s.state === 'ok' ? 'rgba(38,35,46,.45)' : tone.deep }}>
        {note}
      </span>
    </motion.button>
  )
}

// ---------- create / edit ----------

export function BudgetSheet({ open, budget, onClose }: { open: boolean; budget: Budget | null; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      {open && <BudgetForm key={budget?.id ?? 'new'} budget={budget} onDone={onClose} />}
    </Sheet>
  )
}

function BudgetForm({ budget, onDone }: { budget: Budget | null; onDone: () => void }) {
  const { budgets, entries, settings, saveBudget, deleteBudget } = useStore()
  const cur = settings.currency
  const decimals = decimalsFor(cur)
  const [kind, setKind] = useState<BudgetKind>(budget?.kind ?? 'expense')
  const [period, setPeriod] = useState<Period>(budget?.period ?? 'month')
  const taken = (k: BudgetKind, c: string, p: Period) => budgets.some((x) => x.id !== budget?.id && x.kind === k && x.category === c && x.period === p)
  const firstFree = (k: BudgetKind, p: Period) => ['', ...categoriesFor(k, settings.family).map((c) => c.label)].find((c) => !taken(k, c, p)) ?? ''
  const [category, setCategory] = useState(budget?.category ?? firstFree('expense', 'month'))
  const [amount, setAmount] = useState(budget ? String(toMajor(budget.amount, cur)) : '')
  const b = BUCKETS[kind]

  const cats = [{ id: '*', label: '', emoji: b.emoji }, ...categoriesFor(kind, settings.family)]
  const suggestion = useMemo(() => roundNice(suggestAmount({ kind, category, period }, entries), decimals), [kind, category, period, entries, decimals])
  const minor = toMinor(Number(amount.replace(/,/g, '')) || 0, cur)
  const perDay = minor / (period === 'week' ? 7 : 30)
  const clash = taken(kind, category, period)

  const pickKind = (k: BudgetKind) => {
    setKind(k)
    setCategory(firstFree(k, period))
  }

  const save = async () => {
    if (minor <= 0 || clash) return
    await saveBudget({ kind, category, period, amount: minor }, budget?.id)
    onDone()
  }

  return (
    <div className="no-scrollbar flex flex-col gap-5 overflow-y-auto px-5 pb-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[28px] leading-tight font-black tracking-tight">{budget ? 'Edit budget' : 'New budget'}</h2>
        {budget && (
          <button
            aria-label="Delete budget"
            onClick={async () => {
              if (!confirm(`Delete the ${budgetLabel(budget)} budget?`)) return
              await deleteBudget(budget.id)
              onDone()
            }}
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-expense shadow-[var(--shadow-card)]"
          >
            <Trash2 size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <Segment
        value={kind}
        onChange={pickKind}
        options={[
          ['expense', `${BUCKETS.expense.emoji} Spending`],
          ['buffer', `${BUCKETS.buffer.emoji} Family & giving`],
        ]}
      />

      <div>
        <Label>What for?</Label>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => {
            const on = c.label === category
            const off = !on && taken(kind, c.label, period)
            return (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.92 }}
                disabled={off}
                onClick={() => setCategory(c.label)}
                className="flex h-10 items-center gap-1.5 rounded-2xl px-3 text-[15px] font-bold disabled:opacity-35"
                style={{
                  background: on ? b.soft : '#fff',
                  color: on ? b.deep : 'rgba(38,35,46,.75)',
                  boxShadow: on ? `0 0 0 2px ${b.color} inset` : '0 0 0 2px var(--color-line) inset',
                }}
              >
                <span>{c.emoji}</span>
                {c.label || (kind === 'expense' ? 'All spending' : 'All giving')}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div>
        <Label>Every</Label>
        <Segment
          value={period}
          onChange={setPeriod}
          options={[
            ['week', 'Week'],
            ['month', 'Month'],
          ]}
        />
      </div>

      <div>
        <Label>How much?</Label>
        <label className="flex h-16 items-center gap-1 rounded-2xl bg-white px-4 shadow-[0_0_0_2px_var(--color-line)_inset] focus-within:shadow-[0_0_0_2.5px_var(--color-ink)_inset]">
          <span className="num text-[24px] font-black text-ink/40">{currencySymbol(cur)}</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            inputMode="decimal"
            placeholder="0"
            className="num w-full bg-transparent text-[28px] font-black outline-none"
            style={{ fontSize: 28 }}
          />
        </label>
        <div className="mt-2 flex min-h-8 flex-wrap items-center gap-2">
          {suggestion > 0 && (
            <button
              onClick={() => setAmount(String(toMajor(suggestion, cur)))}
              className="flex h-8 items-center gap-1 rounded-full bg-meadow-soft px-3 text-[13px] font-extrabold text-meadow-deep"
            >
              Usually ~{money(suggestion, cur)} · use it
            </button>
          )}
          {minor > 0 && <span className="num text-[13px] font-bold text-ink/50">≈ {money(Math.round(perDay), cur)} a day</span>}
        </div>
      </div>

      {clash && <p className="-mt-2 text-[13px] font-bold text-expense">You already have this budget — tap it on the Meadow to edit.</p>}

      <Chunky onClick={save} disabled={minor <= 0 || clash}>
        {budget ? 'Save budget' : 'Start budget'}
      </Chunky>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-[13px] font-extrabold tracking-wide text-ink/50 uppercase">{children}</span>
}

function Segment<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  const id = useMemo(() => Math.random().toString(36).slice(2), [])
  return (
    <div className="flex rounded-2xl bg-ink/[.06] p-1">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className="relative h-10 flex-1 rounded-xl text-[15px] font-extrabold" style={{ color: v === value ? 'var(--color-ink)' : 'rgba(38,35,46,.5)' }}>
          {v === value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_6px_-2px_rgba(60,40,10,.25)]" transition={spring} />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  )
}

// ---------- end-of-period review ----------

function periodName(s: BudgetStatus) {
  if (s.budget.period === 'month') return monthLabel(s.range.start.slice(0, 7), 'long').split(' ')[0]
  return `the week of ${parseDay(s.range.start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
}

export function ReviewSheet({ open, review, onClose }: { open: boolean; review: BudgetStatus | undefined; onClose: () => void }) {
  return (
    <Sheet open={open && !!review} onClose={onClose}>
      <AnimatePresence mode="wait">{review && <Review key={review.budget.id + review.range.start} s={review} />}</AnimatePresence>
    </Sheet>
  )
}

function Review({ s }: { s: BudgetStatus }) {
  const { settings, goals, resolveReview, saveBudget } = useStore()
  const [busy, setBusy] = useState(false)
  const open = goals.filter((g) => !g.reached_at)
  const [into, setInto] = useState(open[0]?.name ?? 'Leftovers')
  const cur = settings.currency
  const label = budgetLabel(s.budget)
  const kept = s.remaining
  const under = kept >= 0
  const noun = periodNoun(s.budget.period)
  const raise = roundNice(s.spent, decimalsFor(cur))

  const act = async (o: ReviewOutcome, then?: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    await then?.()
    await resolveReview(s, o, into)
  }

  return (
    <motion.div
      className="flex flex-col items-center px-5 pb-5 text-center"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={spring}
    >
      <span className="text-[13px] font-extrabold tracking-wider text-ink/45 uppercase">
        {budgetEmoji(s.budget, settings.family)} {label} · {periodName(s)} wrap-up
      </span>
      <div className="my-3">
        <Penny width={120} mood={under ? 'excited' : 'happy'} outfit={settings.outfit} />
      </div>
      {under ? (
        <>
          <h2 className="text-[28px] leading-tight font-black tracking-tight">{kept > 0 ? `You kept ${money(kept, cur)}!` : 'Right on the money!'}</h2>
          <p className="mt-1 max-w-[320px] text-[15px] font-bold text-ink/60">
            You spent {money(s.spent, cur)} of your {money(s.limit, cur)} {label} plan. {kept > 0 ? 'What should we do with the spare?' : 'Not a coin over. Perfect shepherding.'}
          </p>
          <div className="mt-5 flex w-full flex-col gap-2">
            {kept > 0 ? (
              <>
                {open.length > 0 && (
                  <div className="no-scrollbar -mx-5 mb-1 flex items-center gap-2 overflow-x-auto px-5">
                    <span className="shrink-0 text-[13px] font-extrabold text-ink/45">Into</span>
                    {[...open.map((g) => [g.name, g.emoji]), ['Leftovers', '🧺']].map(([n, e]) => (
                      <button
                        key={n}
                        onClick={() => setInto(n)}
                        className="flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-extrabold"
                        style={
                          n === into
                            ? { background: BUCKETS.saving.soft, color: BUCKETS.saving.deep, boxShadow: `0 0 0 2px ${BUCKETS.saving.color} inset` }
                            : { background: '#fff', color: 'rgba(38,35,46,.6)', boxShadow: '0 0 0 2px var(--color-line) inset' }
                        }
                      >
                        {e} {n}
                      </button>
                    ))}
                  </div>
                )}
                <Chunky color={BUCKETS.saving.color} deep={BUCKETS.saving.deep} disabled={busy} onClick={() => act('saved')}>
                  🐷 Save it{into !== 'Leftovers' && ` to ${into}`}
                </Chunky>
                <div className="grid grid-cols-2 gap-2">
                  <Choice onClick={() => act('treat')} disabled={busy} emoji="🍦" title="Treat myself" sub={`Up to ${money(kept, cur)}, guilt-free`} />
                  <Choice onClick={() => act('rollover')} disabled={busy} emoji="🌾" title="Roll it over" sub={`Next ${noun} gets ${money(s.budget.amount + kept, cur)}`} />
                </div>
              </>
            ) : (
              <Chunky disabled={busy} onClick={() => act('treat')}>
                Baa-rilliant
              </Chunky>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-[28px] leading-tight font-black tracking-tight">Went {money(-kept, cur)} over</h2>
          <p className="mt-1 max-w-[320px] text-[15px] font-bold text-ink/60">
            {label} came to {money(s.spent, cur)} against a {money(s.limit, cur)} plan. That happens! Want to make the plan more realistic, or try again?
          </p>
          <div className="mt-5 flex w-full flex-col gap-2">
            <Chunky disabled={busy} onClick={() => act('over')}>
              Try {money(s.budget.amount, cur)} again
            </Chunky>
            {raise > s.budget.amount && (
              <button
                disabled={busy}
                onClick={() => act('over', () => saveBudget({ kind: s.budget.kind, category: s.budget.category, period: s.budget.period, amount: raise }, s.budget.id))}
                className="chunky-soft h-12 rounded-2xl text-[15px] font-extrabold"
              >
                Raise it to {money(raise, cur)}
              </button>
            )}
          </div>
        </>
      )}
      <button disabled={busy} onClick={() => act('dismissed')} className="mt-2 h-10 text-[13px] font-extrabold text-ink/40">
        Skip
      </button>
    </motion.div>
  )
}

function Choice({ emoji, title, sub, onClick, disabled }: { emoji: string; title: string; sub: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="chunky-soft flex flex-col items-center gap-0.5 rounded-2xl px-2 py-3"
    >
      <span className="text-[24px]">{emoji}</span>
      <span className="text-[15px] font-black">{title}</span>
      <span className="num text-[12px] font-bold text-ink/50">{sub}</span>
    </button>
  )
}
