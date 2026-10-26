import { motion } from 'motion/react'
import { Home, PieChart, Plus, ReceiptText, Warehouse } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Entry } from '../db/repo'
import { BUCKETS, categoryEmoji, type GoalCategory } from '../lib/buckets'
import { money } from '../lib/format'
import { noteSummary } from '../lib/notes'
import { spring } from './ui'

export type Tab = 'home' | 'activity' | 'insights' | 'barn'

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Meadow', Icon: Home },
  { id: 'activity', label: 'Activity', Icon: ReceiptText },
  { id: 'insights', label: 'Insights', Icon: PieChart },
  { id: 'barn', label: 'Barn', Icon: Warehouse },
]

const INK = '#26232E'
const MUTED = 'rgba(38,35,46,.42)'

/**
 * Floating tab bar. Green is reserved for the one primary action (+); the active tab
 * reads through ink colour and a soft wool pill so the two never compete.
 */
export function BottomNav({ tab, onTab, onAdd, pulse }: { tab: Tab; onTab: (t: Tab) => void; onAdd: () => void; pulse: boolean }) {
  const left = TABS.slice(0, 2)
  const right = TABS.slice(2)
  const item = ({ id, label, Icon }: (typeof TABS)[number]) => {
    const on = tab === id
    return (
      <button
        key={id}
        onClick={() => {
          navigator.vibrate?.(6)
          onTab(id)
        }}
        className="flex h-[62px] min-w-0 flex-1 items-center justify-center"
        aria-label={label}
        aria-current={on ? 'page' : undefined}
      >
        <span className="relative flex flex-col items-center gap-0.5 px-3 py-1.5">
          {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-[16px] bg-wool" transition={spring} />}
          <motion.span className="relative" animate={{ y: on ? -1 : 0 }} transition={spring}>
            <Icon size={23} strokeWidth={on ? 2.6 : 2.2} color={on ? INK : MUTED} />
          </motion.span>
          <span className="relative text-[11px] font-extrabold whitespace-nowrap" style={{ color: on ? INK : MUTED }}>
            {label}
          </span>
        </span>
      </button>
    )
  }
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] px-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 10px)' }}>
      <div className="pointer-events-auto relative flex items-center px-1">
        {/* The frosted glass is its own empty layer. WebKit can paint animated children of a
            backdrop-filter element black (the + button pokes out above the bar), so nothing
            that moves may live inside it. */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[26px] bg-white/92 shadow-[0_14px_34px_-14px_rgba(80,52,14,.45),0_0_0_1px_rgba(240,228,210,.95)] backdrop-blur-xl"
        />
        {left.map(item)}
        <div className="relative w-[78px] shrink-0 self-stretch">
          {/* the white collar makes the button look set into the bar */}
          <div className="absolute -top-[32px] left-1/2 grid -translate-x-1/2 place-items-center rounded-full bg-white p-[5px] shadow-[0_-8px_18px_-12px_rgba(80,52,14,.5)]">
            {pulse && (
              <motion.span
                className="absolute inset-[5px] rounded-full bg-meadow"
                animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <motion.button
              aria-label="Log money"
              onClick={onAdd}
              whileTap={{ scale: 0.9 }}
              className="chunky relative grid h-[60px] w-[60px] place-items-center rounded-full text-white"
              style={{ '--btn': 'linear-gradient(180deg, #4AD891 0%, #2FB572 100%)' } as CSSProperties}
            >
              <Plus size={30} strokeWidth={3.25} />
            </motion.button>
          </div>
          <span className="absolute inset-x-0 bottom-[8px] text-center text-[11px] font-extrabold text-meadow-deep">Log</span>
        </div>
        {right.map(item)}
      </div>
    </nav>
  )
}

export function EntryRow({
  e,
  currency,
  family,
  goals,
  onClick,
  index = 0,
}: {
  e: Entry
  currency: string
  family: string[]
  goals?: GoalCategory[]
  onClick?: () => void
  index?: number
}) {
  const b = BUCKETS[e.kind]
  const sign = e.kind === 'income' ? '+' : e.kind === 'expense' ? '−' : ''
  const note = noteSummary(e.note)
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ ...spring, delay: Math.min(index, 8) * 0.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left active:bg-wool/60"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[22px]" style={{ background: b.soft }}>
        {categoryEmoji(e.kind, e.category, family, goals)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-extrabold">{note.title || e.category}</span>
        <span className="truncate text-[13px] font-bold text-ink/50">
          {note.detail ? `${note.detail} · ` : note.title ? `${e.category} · ` : ''}
          <span style={{ color: b.deep }}>{b.label}</span>
        </span>
      </span>
      <span className="num shrink-0 text-[17px] font-black" style={{ color: e.kind === 'expense' ? 'var(--color-ink)' : b.deep }}>
        {sign}
        {money(e.amount, currency)}
      </span>
    </motion.button>
  )
}
