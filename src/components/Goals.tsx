import { motion } from 'motion/react'
import { CalendarDays, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BUCKETS } from '../lib/buckets'
import { currencySymbol, dayKey, decimalsFor, money, parseDay, toMajor, toMinor } from '../lib/format'
import { GOAL_EMOJI, goalStatus, type Goal, type GoalStatus } from '../lib/goals'
import { useStore } from '../store'
import { Card, Chunky, Ring, Sheet, spring } from './ui'

const SAVE = BUCKETS.saving

export function GoalsCard({ onEdit }: { onEdit: (g: Goal | null) => void }) {
  const { goals, entries, settings } = useStore()
  const rows = useMemo(() => goals.map((g) => goalStatus(g, entries)), [goals, entries])
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[17px] font-black">Saving for</span>
        {rows.length > 0 && (
          <button onClick={() => onEdit(null)} className="flex h-8 items-center gap-1 rounded-full bg-cream px-3 text-[13px] font-extrabold text-ink/70 active:bg-wool">
            <Plus size={15} strokeWidth={3} /> New
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: SAVE.soft }}>
            <span className="text-[32px]">🎯</span>
            <p className="text-[13px] leading-snug font-bold text-ink/60">
              Got something in mind — a laptop, a trip, an emergency fund? Name it, and every saving you log toward it fills the jar.
            </p>
          </div>
          <button onClick={() => onEdit(null)} className="chunky-soft flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold">
            <Plus size={18} strokeWidth={3} /> Start a goal
          </button>
        </div>
      ) : (
        <div className="-mx-2 flex flex-col">
          {rows.map((s, i) => (
            <GoalRow key={s.goal.id} s={s} index={i} currency={settings.currency} onClick={() => onEdit(s.goal)} />
          ))}
        </div>
      )}
    </Card>
  )
}

/** Rounds up to a whole currency unit: "₵178/week", not "₵177.78/week". */
function wholeUp(minor: number, currency: string) {
  const unit = 10 ** decimalsFor(currency)
  return Math.ceil(minor / unit) * unit
}

function GoalRow({ s, index, currency, onClick }: { s: GoalStatus; index: number; currency: string; onClick: () => void }) {
  const done = !!s.goal.reached_at
  const note = done
    ? 'Reached! 🎉'
    : s.late
      ? `Deadline passed · ${money(s.goal.target - s.saved, currency)} to go`
      : s.perWeek !== null
        ? `${money(wholeUp(s.perWeek, currency), currency)}/week to make it by ${parseDay(s.goal.deadline!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
        : `${money(s.goal.target - s.saved, currency)} to go`
  return (
    <motion.button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl p-2 text-left active:bg-wool/60"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.04 }}
    >
      <Ring progress={s.progress} color={done ? '#34C17B' : SAVE.color} size={56} stroke={7}>
        <span className="text-[24px]">{done ? '🏅' : s.goal.emoji}</span>
      </Ring>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-extrabold">{s.goal.name}</span>
          <span className="num shrink-0 text-[15px] font-black" style={{ color: done ? '#1F9A5C' : SAVE.deep }}>
            {Math.min(100, Math.floor(s.progress * 100))}%
          </span>
        </span>
        <span className="num truncate text-[13px] font-bold text-ink/50">
          {money(s.saved, currency)} of {money(s.goal.target, currency)}
        </span>
        <span className="truncate text-[12px] font-extrabold" style={{ color: s.late ? '#D9443A' : done ? '#1F9A5C' : 'rgba(38,35,46,.45)' }}>
          {note}
        </span>
      </span>
    </motion.button>
  )
}

export function GoalSheet({ open, goal, onClose }: { open: boolean; goal: Goal | null; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      {open && <GoalForm key={goal?.id ?? 'new'} goal={goal} onDone={onClose} />}
    </Sheet>
  )
}

function GoalForm({ goal, onDone }: { goal: Goal | null; onDone: () => void }) {
  const { goals, settings, saveGoal, deleteGoal } = useStore()
  const cur = settings.currency
  const [name, setName] = useState(goal?.name ?? '')
  const [emoji, setEmoji] = useState(goal?.emoji ?? GOAL_EMOJI[0])
  const [amount, setAmount] = useState(goal ? String(toMajor(goal.target, cur)) : '')
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const minor = toMinor(Number(amount.replace(/,/g, '')) || 0, cur)
  const trimmed = name.trim()
  const clash = goals.some((g) => g.id !== goal?.id && g.name.toLowerCase() === trimmed.toLowerCase())
  const ok = trimmed && minor > 0 && !clash

  const save = async () => {
    if (!ok) return
    await saveGoal({ name: trimmed, emoji, target: minor, deadline: deadline || null }, goal ?? undefined)
    onDone()
  }

  return (
    <div className="no-scrollbar flex flex-col gap-5 overflow-y-auto px-5 pb-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[28px] leading-tight font-black tracking-tight">{goal ? 'Edit goal' : 'New goal'}</h2>
        {goal && (
          <button
            aria-label="Delete goal"
            onClick={async () => {
              if (!confirm(`Delete the ${goal.name} goal? The money stays in your savings.`)) return
              await deleteGoal(goal)
              onDone()
            }}
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-expense shadow-[var(--shadow-card)]"
          >
            <Trash2 size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div>
        <Label>Saving for</Label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New laptop"
          maxLength={28}
          className="h-14 w-full rounded-2xl bg-white px-4 text-[20px] font-extrabold outline-none shadow-[0_0_0_2px_var(--color-line)_inset] focus:shadow-[0_0_0_2.5px_var(--color-ink)_inset]"
          style={{ fontSize: 20 }}
        />
        {clash && <p className="mt-1 text-[13px] font-bold text-expense">You already have a goal with that name.</p>}
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {GOAL_EMOJI.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[22px]"
              style={{ background: e === emoji ? SAVE.soft : '#fff', boxShadow: e === emoji ? `0 0 0 2px ${SAVE.color} inset` : '0 0 0 2px var(--color-line) inset' }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Target</Label>
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
      </div>

      <div>
        <Label>By when? (optional)</Label>
        <label
          className="relative flex h-12 items-center gap-2 rounded-2xl px-4 text-[15px] font-bold"
          style={deadline ? { background: 'var(--color-ink)', color: '#fff' } : { background: '#fff', color: 'rgba(38,35,46,.6)', boxShadow: '0 0 0 2px var(--color-line) inset' }}
        >
          <CalendarDays size={18} strokeWidth={2.5} />
          {deadline ? parseDay(deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'No deadline'}
          <input type="date" min={dayKey()} value={deadline} onChange={(e) => setDeadline(e.target.value)} className="absolute inset-0 opacity-0" aria-label="Deadline" />
        </label>
        {deadline && (
          <button onClick={() => setDeadline('')} className="mt-1 px-1 text-[13px] font-extrabold text-ink/45">
            Clear deadline
          </button>
        )}
      </div>

      <p className="-mt-1 text-[13px] font-bold text-ink/50">
        Log a <b style={{ color: SAVE.deep }}>Saving</b> and pick <b>{emoji} {trimmed || 'this goal'}</b> as the category — it fills up from there. Budget leftovers can go straight in too.
      </p>

      <Chunky color={SAVE.color} deep={SAVE.deep} onClick={save} disabled={!ok}>
        {goal ? 'Save goal' : 'Start goal'}
      </Chunky>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-[13px] font-extrabold tracking-wide text-ink/50 uppercase">{children}</span>
}
