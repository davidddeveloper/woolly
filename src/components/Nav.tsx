import { motion } from 'motion/react'
import { Home, PieChart, Plus, ReceiptText, Warehouse } from 'lucide-react'
import type { Entry } from '../db/repo'
import { BUCKETS, categoryEmoji } from '../lib/buckets'
import { money } from '../lib/format'
import { spring } from './ui'

export type Tab = 'home' | 'activity' | 'insights' | 'barn'

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Meadow', Icon: Home },
  { id: 'activity', label: 'Activity', Icon: ReceiptText },
  { id: 'insights', label: 'Insights', Icon: PieChart },
  { id: 'barn', label: 'Barn', Icon: Warehouse },
]

export function BottomNav({ tab, onTab, onAdd, pulse }: { tab: Tab; onTab: (t: Tab) => void; onAdd: () => void; pulse: boolean }) {
  const left = TABS.slice(0, 2)
  const right = TABS.slice(2)
  const item = ({ id, label, Icon }: (typeof TABS)[number]) => {
    const on = tab === id
    return (
      <button key={id} onClick={() => onTab(id)} className="flex h-16 min-w-0 flex-1 items-center justify-center" aria-label={label}>
        <span className="relative flex flex-col items-center gap-0.5 px-3.5 py-1.5">
          {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-2xl bg-meadow-soft" transition={spring} />}
          <motion.span className="relative" animate={{ y: on ? -1 : 0, scale: on ? 1.08 : 1 }} transition={spring}>
            <Icon size={24} strokeWidth={on ? 2.75 : 2.25} color={on ? '#1F9A5C' : 'rgba(38,35,46,.45)'} />
          </motion.span>
          <span className="relative text-[12px] font-extrabold whitespace-nowrap" style={{ color: on ? '#1F9A5C' : 'rgba(38,35,46,.45)' }}>
            {label}
          </span>
        </span>
      </button>
    )
  }
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line/70 bg-white/85 backdrop-blur-xl"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 4px)' }}
    >
      <div className="flex items-center px-2 pt-1">
        {left.map(item)}
        <div className="relative flex w-20 justify-center">
          {pulse && (
            <motion.span
              className="absolute -top-7 h-16 w-16 rounded-full bg-meadow"
              animate={{ scale: [1, 1.45], opacity: [0.45, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <motion.button
            aria-label="Log money"
            onClick={onAdd}
            whileTap={{ scale: 0.88, rotate: 90 }}
            className="chunky absolute -top-7 grid h-16 w-16 place-items-center rounded-full text-white"
          >
            <Plus size={32} strokeWidth={3.25} />
          </motion.button>
        </div>
        {right.map(item)}
      </div>
    </nav>
  )
}

export function EntryRow({ e, currency, family, onClick, index = 0 }: { e: Entry; currency: string; family: string[]; onClick?: () => void; index?: number }) {
  const b = BUCKETS[e.kind]
  const sign = e.kind === 'income' ? '+' : e.kind === 'expense' ? '−' : ''
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
        {categoryEmoji(e.kind, e.category, family)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-extrabold">{e.note || e.category}</span>
        <span className="truncate text-[13px] font-bold text-ink/50">
          {e.note ? `${e.category} · ` : ''}
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
