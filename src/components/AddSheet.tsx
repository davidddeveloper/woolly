import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { ArrowLeft, CalendarDays, Delete, PencilLine, Repeat2, Sprout, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { BUCKETS, categoriesFor, INVESTMENT_HINT, KINDS, type Kind } from '../lib/buckets'
import { addDays, currencySymbol, dayKey, decimalsFor, friendlyDay, money, toMajor, toMinor } from '../lib/format'
import { XP } from '../lib/game'
import { budgetLabel, budgetStatus, counts, periodNoun, STATE_COLOR } from '../lib/budgets'
import { anchorFor, cadenceLabel, type Cadence } from '../lib/recurring'
import { parseBreakdown } from '../lib/notes'
import type { Entry } from '../db/repo'
import { useStore } from '../store'
import { Chunky, Sheet, spring } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Entry | null
  /** Open straight on a kind (and optionally an amount, in minor units), skipping the picker. */
  start?: { kind: Kind; amount?: number } | null
  onDeleted?: (e: Entry) => void
}

export function AddSheet({ open, onClose, editing, start, onDeleted }: Props) {
  return (
    <Sheet open={open} onClose={onClose} tall>
      {open && <AddFlow key={editing?.id ?? `new-${start?.kind ?? ''}`} editing={editing} start={start} onDone={onClose} onDeleted={onDeleted} />}
    </Sheet>
  )
}

function AddFlow({ editing, start, onDone, onDeleted }: { editing?: Entry | null; start?: Props['start']; onDone: () => void; onDeleted?: (e: Entry) => void }) {
  const { settings, entries, budgets, closes, goals, add, update, remove, addRecurring } = useStore()
  const cur = settings.currency
  const lastUsed = (k: Kind) => entries.find((e) => e.kind === k)?.category
  const defaultCategory = (k: Kind) => {
    const options = categoriesFor(k, settings.family, goals)
    const prev = lastUsed(k)
    return options.some((c) => c.label === prev) ? prev! : options[0]?.label ?? 'Other'
  }
  const [step, setStep] = useState<'kind' | 'amount'>(editing || start ? 'amount' : 'kind')
  const [kind, setKind] = useState<Kind>(editing?.kind ?? start?.kind ?? 'expense')
  const startMinor = editing?.amount ?? start?.amount
  const [amount, setAmount] = useState(startMinor ? trimZeros(toMajor(startMinor, cur).toFixed(decimalsFor(cur))) : '')
  const [category, setCategory] = useState(() => editing?.category ?? (start ? defaultCategory(start.kind) : ''))
  const [note, setNote] = useState(editing?.note ?? '')
  const [date, setDate] = useState(editing?.date ?? dayKey())
  const [saving, setSaving] = useState(false)
  const [scope, animate] = useAnimate()

  const cats = useMemo(() => categoriesFor(kind, settings.family, goals), [kind, settings.family, goals])
  const [repeat, setRepeat] = useState<Cadence | null>(null)

  const chooseKind = (k: Kind) => {
    setKind(k)
    setCategory(defaultCategory(k))
    setStep('amount')
  }

  /** Switch kind mid-entry, keeping the category if it still fits. */
  const switchKind = (k: Kind) => {
    setKind(k)
    if (k === 'withdrawal') setRepeat(null)
    const opts = categoriesFor(k, settings.family, goals)
    if (!opts.some((c) => c.label === category)) setCategory(defaultCategory(k))
  }

  useEffect(() => {
    if (editing) return
    // keep a valid category when the family list changes
    if (category && !cats.some((c) => c.label === category)) setCategory(cats[0]?.label ?? 'Other')
  }, [cats, category, editing])

  const decimals = decimalsFor(cur)
  const shake = () => animate('.amount', { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.35 })

  const press = (key: string) => {
    navigator.vibrate?.(8)
    setAmount((a) => {
      if (key === '⌫') return a.slice(0, -1)
      if (key === '.') {
        if (decimals === 0 || a.includes('.')) return shake(), a
        return (a || '0') + '.'
      }
      const [whole, frac] = a.split('.')
      if (frac !== undefined && frac.length >= decimals) return shake(), a
      if (frac === undefined && whole.length >= 9) return shake(), a
      if (a === '0') return key
      return a + key
    })
  }

  const minor = toMinor(Number(amount || 0), cur)
  const b = BUCKETS[kind]
  const showHint = kind === 'expense' && INVESTMENT_HINT.test(note)

  // The budget this entry would count toward (a category budget beats a whole-bucket one).
  const plan = useMemo(() => {
    const draft = { kind, category, date } as Entry
    const b = budgets.filter((x) => counts(x, draft)).sort((a, z) => Number(!!z.category) - Number(!!a.category))[0]
    return b && budgetStatus(b, editing ? entries.filter((e) => e.id !== editing.id) : entries, closes, date)
  }, [budgets, closes, entries, editing, kind, category, date])

  const save = async () => {
    if (minor <= 0 || saving) return shake()
    setSaving(true)
    const input = { kind, amount: minor, category: category || 'Other', note: note.trim(), date }
    if (editing) await update(editing.id, input)
    else {
      await add(input)
      if (repeat) await addRecurring({ kind, amount: minor, category: input.category, note: input.note, cadence: repeat }, date)
    }
    onDone()
  }

  const del = async () => {
    if (!editing) return
    const gone = await remove(editing.id)
    onDone()
    if (gone) onDeleted?.(gone)
  }

  return (
    <div ref={scope} className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        {step === 'kind' ? (
          <motion.div
            key="kind"
            className="flex flex-col gap-3 overflow-y-auto px-5 pb-6"
            initial={{ x: '-30%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-30%', opacity: 0 }}
            transition={spring}
          >
            <h2 className="px-1 text-[28px] leading-tight font-black tracking-tight">What happened?</h2>
            <p className="-mt-2 px-1 text-[15px] font-semibold text-ink/60">Pick a bucket — Penny will do the rest.</p>
            <div className="mt-1 grid grid-cols-2 gap-3">
              {KINDS.map((k, i) => (
                <KindTile key={k} kind={k} index={i} wide={k === 'buffer'} onPick={() => chooseKind(k)} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="amount"
            className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto [&>*]:shrink-0"
            initial={{ x: '30%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '30%', opacity: 0 }}
            transition={spring}
          >
            {/* header */}
            <div className="flex items-center gap-2 px-4">
              {!editing ? (
                <button aria-label="Back" onClick={() => setStep('kind')} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[var(--shadow-card)]">
                  <ArrowLeft size={20} strokeWidth={2.75} />
                </button>
              ) : (
                <div className="w-11" />
              )}
              <div className="no-scrollbar flex flex-1 justify-center gap-1.5 overflow-x-auto">
                {KINDS.map((k) => {
                  // A withdrawal lives under Saving.
                  const on = k === kind || (k === 'saving' && kind === 'withdrawal')
                  const tone = BUCKETS[on ? kind : k]
                  return (
                    <motion.button
                      key={k}
                      layout
                      onClick={() => switchKind(k)}
                      className="flex h-9 items-center gap-1 rounded-full px-2.5 text-[13px] font-extrabold whitespace-nowrap"
                      style={{ background: on ? tone.color : tone.soft, color: on ? '#fff' : tone.deep }}
                      transition={spring}
                    >
                      <span>{BUCKETS[k].emoji}</span>
                      {on && <span>{BUCKETS[k].label}</span>}
                    </motion.button>
                  )
                })}
              </div>
              {editing ? (
                <button aria-label="Delete entry" onClick={del} className="grid h-11 w-11 place-items-center rounded-full bg-white text-expense shadow-[var(--shadow-card)]">
                  <Trash2 size={20} strokeWidth={2.5} />
                </button>
              ) : (
                <div className="w-11" />
              )}
            </div>

            {/* amount */}
            <div className="amount flex flex-col items-center px-5 pt-5 pb-3">
              {kind === 'saving' || kind === 'withdrawal' ? (
                <SavingToggle kind={kind} onChange={switchKind} />
              ) : (
                <span className="text-[13px] font-extrabold tracking-[0.12em] uppercase" style={{ color: b.deep }}>
                  {b.verb}
                </span>
              )}
              <div className="num flex items-baseline font-black" style={{ color: amount ? b.deep : 'rgba(38,35,46,.25)' }}>
                <span className="mr-1 text-[30px]">{currencySymbol(cur)}</span>
                <span className="text-[56px] leading-[1.1]">
                  <AnimatePresence initial={false} mode="popLayout">
                    {groupDigits(amount || '0').split('').map((ch, i) => (
                      <motion.span
                        key={i + ch}
                        className="inline-block"
                        initial={{ y: 18, opacity: 0, scale: 0.6 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -12, opacity: 0, scale: 0.6 }}
                        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </span>
              </div>
            </div>

            {/* categories */}
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
              {cats.map((c) => {
                const on = c.label === category
                return (
                  <motion.button
                    key={c.id}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setCategory(c.label)}
                    className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3.5 text-[15px] font-bold"
                    style={{
                      background: on ? b.soft : '#fff',
                      color: on ? b.deep : 'rgba(38,35,46,.75)',
                      boxShadow: on ? `0 0 0 2px ${b.color} inset` : '0 0 0 2px var(--color-line) inset',
                    }}
                  >
                    <span className="text-[17px]">{c.emoji}</span>
                    {c.label}
                  </motion.button>
                )
              })}
            </div>

            {/* budget preview */}
            <AnimatePresence initial={false}>
              {plan && <BudgetHint key={plan.budget.id} s={plan} adding={minor} currency={cur} />}
            </AnimatePresence>

            {/* date + note */}
            <div className="flex flex-wrap gap-2 px-5 pt-3">
              <DateChip value={date} onChange={setDate} />
              {!editing && kind !== 'withdrawal' && (
                <button
                  onClick={() => setRepeat((r) => (r === null ? 'month' : r === 'month' ? 'week' : null))}
                  className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-[15px] font-bold"
                  style={repeat ? { background: 'var(--color-ink)', color: '#fff' } : { background: '#fff', color: 'rgba(38,35,46,.7)', boxShadow: '0 0 0 2px var(--color-line) inset' }}
                >
                  <Repeat2 size={16} strokeWidth={2.5} /> {repeat === 'month' ? 'Monthly' : repeat === 'week' ? 'Weekly' : 'Repeat'}
                </button>
              )}
            </div>
            <AnimatePresence initial={false}>
              {repeat && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-6 pt-2 text-[13px] font-bold text-ink/55">
                  🔁 {cadenceLabel({ cadence: repeat, anchor: anchorFor(repeat, date) })} — Penny will ask you to confirm it each time.
                </motion.p>
              )}
            </AnimatePresence>
            <NoteField
              value={note}
              onChange={setNote}
              kind={kind}
              amount={minor}
              currency={cur}
              onUseTotal={(total) => setAmount(trimZeros(total.toFixed(decimals)))}
            />
            <AnimatePresence>
              {showHint && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setKind('investment')
                    setCategory(/course|class|book|training|tuition|workshop|certif|mentor|conference/i.test(note) ? 'Education' : 'Tools & gear')
                  }}
                  className="mx-5 mt-2 flex items-center gap-2 rounded-xl bg-[#EFE8FF] px-3 py-2 text-left text-[13px] font-bold text-[#6A3AD9]"
                >
                  <Sprout size={18} />
                  <span className="flex-1">Sounds like an investment in you. Move it to Investments?</span>
                  <span className="rounded-lg bg-investment px-2 py-1 text-white">Move</span>
                </motion.button>
              )}
            </AnimatePresence>

            <div className="flex-1" />

            {/* keypad */}
            <div className="grid grid-cols-3 gap-2 px-5 pt-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', decimals ? '.' : '', '0', '⌫'].map((k, i) =>
                k ? (
                  <motion.button
                    key={k}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => press(k)}
                    onContextMenu={(e) => {
                      if (k === '⌫') {
                        e.preventDefault()
                        setAmount('')
                      }
                    }}
                    className="chunky-soft grid h-[52px] place-items-center rounded-2xl text-[24px] font-extrabold"
                  >
                    {k === '⌫' ? <Delete size={24} strokeWidth={2.5} /> : k}
                  </motion.button>
                ) : (
                  <div key={i} />
                ),
              )}
            </div>
            <div className="px-5 pt-4 pb-4">
              <Chunky color={b.color} deep={b.deep} disabled={minor <= 0 || saving} onClick={save}>
                {editing ? 'Save changes' : <>Log it <span className="rounded-lg bg-white/25 px-2 py-0.5 text-[13px]">+{XP.entry} XP</span></>}
              </Chunky>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function KindTile({ kind, index, wide, onPick }: { kind: Kind; index: number; wide?: boolean; onPick: () => void }) {
  const b = BUCKETS[kind]
  return (
    <motion.button
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay: 0.04 + index * 0.05 }}
      whileTap={{ scale: 0.94 }}
      onClick={onPick}
      className={`chunky relative flex overflow-hidden rounded-3xl p-4 text-left ${wide ? 'col-span-2 h-[104px] flex-row items-center gap-4' : 'h-[148px] flex-col justify-between'}`}
      style={{ '--btn': b.soft, '--btn-deep': `${b.color}55` } as CSSProperties}
    >
      <motion.span
        className={wide ? 'text-[44px]' : 'text-[40px]'}
        animate={{ y: [0, -4, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.3, ease: 'easeInOut' }}
      >
        {b.emoji}
      </motion.span>
      <span className="flex flex-col">
        <span className="text-[20px] font-black" style={{ color: b.deep }}>
          {kind === 'buffer' ? 'Family & giving' : b.label}
        </span>
        <span className="text-[13px] leading-snug font-bold text-ink/55">{b.blurb}</span>
      </span>
      <span className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-40" style={{ background: b.color, filter: 'blur(24px)' }} />
    </motion.button>
  )
}

function DateChip({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const today = dayKey()
  const quick = [today, addDays(today, -1)]
  return (
    <div className="flex gap-2">
      {quick.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className="h-10 rounded-xl px-3 text-[15px] font-bold"
          style={value === d ? { background: 'var(--color-ink)', color: '#fff' } : { background: '#fff', color: 'rgba(38,35,46,.7)', boxShadow: '0 0 0 2px var(--color-line) inset' }}
        >
          {friendlyDay(d)}
        </button>
      ))}
      <label
        className="relative flex h-10 items-center gap-1.5 rounded-xl px-3 text-[15px] font-bold"
        style={!quick.includes(value) ? { background: 'var(--color-ink)', color: '#fff' } : { background: '#fff', color: 'rgba(38,35,46,.7)', boxShadow: '0 0 0 2px var(--color-line) inset' }}
      >
        <CalendarDays size={16} strokeWidth={2.5} />
        {!quick.includes(value) && friendlyDay(value)}
        <input
          ref={ref}
          type="date"
          max={today}
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 opacity-0"
          aria-label="Pick a date"
        />
      </label>
    </div>
  )
}

function groupDigits(s: string) {
  const [whole, frac] = s.split('.')
  const grouped = Number(whole).toLocaleString('en-US')
  return frac === undefined ? grouped : `${grouped}.${frac}`
}

function trimZeros(s: string) {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

function BudgetHint({ s, adding, currency }: { s: ReturnType<typeof budgetStatus>; adding: number; currency: string }) {
  const after = s.remaining - adding
  const state = after < 0 ? 'over' : (s.spent + adding) / s.limit >= 0.8 ? 'warn' : 'ok'
  const tone = STATE_COLOR[state]
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-5 pt-3"
    >
      <div className="flex flex-col gap-1.5 rounded-2xl px-3 py-2.5" style={{ background: tone.soft }}>
        <div className="num flex items-center justify-between gap-2 text-[13px] font-extrabold" style={{ color: tone.deep }}>
          <span className="truncate">
            🎯 {budgetLabel(s.budget)} · {money(Math.max(0, s.remaining), currency)} left this {periodNoun(s.budget.period)}
          </span>
          {adding > 0 && <span className="shrink-0">{after >= 0 ? `→ ${money(after, currency)}` : `${money(-after, currency)} over`}</span>}
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-white/80">
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(1, s.spent / s.limit) * 100}%`, background: tone.bar }} />
          <motion.div
            className="absolute inset-y-0 rounded-full opacity-45"
            style={{ left: `${Math.min(1, s.spent / s.limit) * 100}%`, background: tone.bar }}
            animate={{ width: `${Math.max(0, Math.min(1, (s.spent + adding) / s.limit) - Math.min(1, s.spent / s.limit)) * 100}%` }}
            transition={spring}
          />
        </div>
      </div>
    </motion.div>
  )
}

/**
 * A note that can double as a breakdown: "Trotro 20, Uber 45" or one item per line.
 * When it itemises the money, Penny totals it and checks it against the amount.
 */
function NoteField({
  value,
  onChange,
  kind,
  amount,
  currency,
  onUseTotal,
}: {
  value: string
  onChange: (v: string) => void
  kind: Kind
  amount: number
  currency: string
  onUseTotal: (majorTotal: number) => void
}) {
  const [open, setOpen] = useState(!!value)
  const ref = useRef<HTMLTextAreaElement>(null)
  const { items, total } = useMemo(() => parseBreakdown(value), [value])
  const totalMinor = toMinor(total, currency)
  const diff = amount - totalMinor

  // Grow with the text, up to about six lines.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`
  }, [value, open])

  if (!open)
    return (
      <div className="px-5 pt-2">
        <button
          onClick={() => setOpen(true)}
          className="flex h-11 w-full items-center gap-2 rounded-xl bg-white px-3.5 text-left text-[15px] font-bold text-ink/45 shadow-[0_0_0_2px_var(--color-line)_inset]"
        >
          <PencilLine size={16} strokeWidth={2.5} /> Add a note or breakdown
        </button>
      </div>
    )

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="px-5 pt-2">
      <textarea
        ref={ref}
        autoFocus={!value}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder={kind === 'buffer' ? 'School fees for my sister…' : 'What was it for? Or a breakdown, e.g.\nTrotro 20, Uber 45, Fuel 250'}
        className="no-scrollbar block w-full resize-none rounded-xl bg-white px-3.5 py-2.5 text-[15px] leading-snug font-semibold outline-none shadow-[0_0_0_2px_var(--color-line)_inset] focus:shadow-[0_0_0_2px_var(--color-ink)_inset]"
      />
      <AnimatePresence initial={false}>
        {items.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="num mt-1.5 px-1 text-[13px] font-extrabold"
          >
            <div className="flex min-h-7 items-center gap-2">
              <span className="whitespace-nowrap text-ink/55">
                🧾 {items.length} items · {money(totalMinor, currency)}
              </span>
              <span className="flex-1" />
              {amount > 0 && diff === 0 ? (
                <span className="text-meadow-deep">✓ adds up</span>
              ) : (
                <button onClick={() => onUseTotal(total)} className="rounded-lg bg-ink px-2.5 py-1 whitespace-nowrap text-white">
                  Use {money(totalMinor, currency)}
                </button>
              )}
            </div>
            {amount > 0 && diff !== 0 && (
              <p className="mt-0.5 text-ink/40">{diff > 0 ? `${money(diff, currency)} of the amount isn't itemised` : `Items add up to ${money(-diff, currency)} more than the amount`}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/** Put money into savings, or log taking some back out. */
function SavingToggle({ kind, onChange }: { kind: 'saving' | 'withdrawal'; onChange: (k: Kind) => void }) {
  return (
    <div className="mb-1 flex rounded-full bg-ink/[.06] p-1">
      {(['saving', 'withdrawal'] as const).map((k) => {
        const on = k === kind
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className="relative h-8 rounded-full px-3.5 text-[13px] font-extrabold tracking-wide uppercase"
            style={{ color: on ? '#fff' : 'rgba(38,35,46,.5)' }}
          >
            {on && <motion.span layoutId="saving-toggle" className="absolute inset-0 rounded-full" style={{ background: BUCKETS[k].color }} transition={spring} />}
            <span className="relative">{k === 'saving' ? '🐷 Put in' : '🔓 Take out'}</span>
          </button>
        )
      })}
    </div>
  )
}
