import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { ArrowLeft, CalendarDays, Delete, PencilLine, Sprout, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { BUCKETS, categoriesFor, INVESTMENT_HINT, KINDS, type Kind } from '../lib/buckets'
import { addDays, currencySymbol, dayKey, decimalsFor, friendlyDay, toMajor, toMinor } from '../lib/format'
import { XP } from '../lib/game'
import type { Entry } from '../db/repo'
import { useStore } from '../store'
import { Chunky, Sheet, spring } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Entry | null
  onDeleted?: (e: Entry) => void
}

export function AddSheet({ open, onClose, editing, onDeleted }: Props) {
  return (
    <Sheet open={open} onClose={onClose} tall>
      {open && <AddFlow key={editing?.id ?? 'new'} editing={editing} onDone={onClose} onDeleted={onDeleted} />}
    </Sheet>
  )
}

function AddFlow({ editing, onDone, onDeleted }: { editing?: Entry | null; onDone: () => void; onDeleted?: (e: Entry) => void }) {
  const { settings, entries, add, update, remove } = useStore()
  const cur = settings.currency
  const [step, setStep] = useState<'kind' | 'amount'>(editing ? 'amount' : 'kind')
  const [kind, setKind] = useState<Kind>(editing?.kind ?? 'expense')
  const [amount, setAmount] = useState(editing ? trimZeros(toMajor(editing.amount, cur).toFixed(decimalsFor(cur))) : '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [noteOpen, setNoteOpen] = useState(!!editing?.note)
  const [date, setDate] = useState(editing?.date ?? dayKey())
  const [saving, setSaving] = useState(false)
  const [scope, animate] = useAnimate()

  const cats = useMemo(() => categoriesFor(kind, settings.family), [kind, settings.family])
  const lastUsed = (k: Kind) => entries.find((e) => e.kind === k)?.category

  const chooseKind = (k: Kind) => {
    setKind(k)
    const options = categoriesFor(k, settings.family)
    const prev = lastUsed(k)
    setCategory(options.some((c) => c.label === prev) ? prev! : options[0]?.label ?? 'Other')
    setStep('amount')
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

  const save = async () => {
    if (minor <= 0 || saving) return shake()
    setSaving(true)
    const input = { kind, amount: minor, category: category || 'Other', note: note.trim(), date }
    if (editing) await update(editing.id, input)
    else await add(input)
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
                  const on = k === kind
                  return (
                    <motion.button
                      key={k}
                      layout
                      onClick={() => {
                        setKind(k)
                        const opts = categoriesFor(k, settings.family)
                        if (!opts.some((c) => c.label === category)) setCategory(lastUsed(k) ?? opts[0]?.label ?? 'Other')
                      }}
                      className="flex h-9 items-center gap-1 rounded-full px-2.5 text-[13px] font-extrabold whitespace-nowrap"
                      style={{ background: on ? BUCKETS[k].color : BUCKETS[k].soft, color: on ? '#fff' : BUCKETS[k].deep }}
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
              <span className="text-[13px] font-extrabold tracking-[0.12em] uppercase" style={{ color: b.deep }}>
                {b.verb}
              </span>
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

            {/* date + note */}
            <div className="flex gap-2 px-5 pt-3">
              <DateChip value={date} onChange={setDate} />
              {!noteOpen && (
                <button onClick={() => setNoteOpen(true)} className="flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-[15px] font-bold text-ink/70 shadow-[0_0_0_2px_var(--color-line)_inset]">
                  <PencilLine size={16} strokeWidth={2.5} /> Note
                </button>
              )}
            </div>
            <AnimatePresence>
              {noteOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pt-2">
                  <input
                    autoFocus={!editing}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={kind === 'buffer' ? 'School fees for my sister…' : 'What was it for?'}
                    maxLength={120}
                    className="h-11 w-full rounded-xl bg-white px-3.5 font-semibold outline-none shadow-[0_0_0_2px_var(--color-line)_inset] focus:shadow-[0_0_0_2px_var(--color-ink)_inset]"
                  />
                </motion.div>
              )}
            </AnimatePresence>
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
