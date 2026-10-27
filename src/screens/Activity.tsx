import { AnimatePresence, motion } from 'motion/react'
import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ALL_KINDS, BUCKETS, type Kind } from '../lib/buckets'
import { friendlyDay, money } from '../lib/format'
import { EntryRow } from '../components/Nav'
import { Penny } from '../components/Penny'
import { Card, spring } from '../components/ui'
import type { Entry } from '../db/repo'
import { useStore } from '../store'

export function Activity({ onEdit, onAdd }: { onEdit: (e: Entry) => void; onAdd: () => void }) {
  const { entries, settings, goals } = useStore()
  const [filter, setFilter] = useState<Kind | 'all'>('all')
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = entries.filter(
      (e) => (filter === 'all' || e.kind === filter) && (!needle || `${e.note} ${e.category} ${BUCKETS[e.kind].label}`.toLowerCase().includes(needle)),
    )
    const map = new Map<string, Entry[]>()
    for (const e of list) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return [...map.entries()]
  }, [entries, filter, q])

  const filteredTotal = groups.reduce((s, [, es]) => s + es.reduce((a, e) => a + e.amount, 0), 0)

  return (
    <div className="pb-nav">
      <header className="sticky top-0 z-20 bg-cream/90 px-4 pb-3 backdrop-blur-xl pt-safe">
        <div className="flex h-12 items-center justify-between px-1">
          <AnimatePresence mode="wait" initial={false}>
            {searching ? (
              <motion.div key="s" className="flex flex-1 items-center gap-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search notes & categories"
                  className="h-11 flex-1 rounded-2xl bg-white px-4 font-semibold outline-none shadow-[0_0_0_2px_var(--color-line)_inset]"
                />
                <button aria-label="Close search" onClick={() => (setQ(''), setSearching(false))} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[var(--shadow-card)]">
                  <X size={20} strokeWidth={2.75} />
                </button>
              </motion.div>
            ) : (
              <motion.div key="t" className="flex flex-1 items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-[28px] font-black tracking-tight">Activity</h1>
                <button aria-label="Search" onClick={() => setSearching(true)} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[var(--shadow-card)]">
                  <Search size={20} strokeWidth={2.75} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          {(['all', ...ALL_KINDS] as const).map((k) => {
            const on = filter === k
            const b = k === 'all' ? null : BUCKETS[k]
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className="relative flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-extrabold"
                style={{ color: on ? '#fff' : b?.deep ?? 'var(--color-ink)' }}
              >
                {on && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full" style={{ background: b?.color ?? 'var(--color-ink)' }} transition={spring} />}
                {!on && <span className="absolute inset-0 rounded-full" style={{ background: b?.soft ?? '#fff', boxShadow: b ? undefined : '0 0 0 2px var(--color-line) inset' }} />}
                <span className="relative">{b ? `${b.emoji} ${b.label}` : 'All'}</span>
              </button>
            )
          })}
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4">
        {filter !== 'all' && groups.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: BUCKETS[filter].soft }}>
            <span className="text-[15px] font-extrabold" style={{ color: BUCKETS[filter].deep }}>
              All-time {BUCKETS[filter].verb.toLowerCase()}
            </span>
            <span className="num text-[17px] font-black" style={{ color: BUCKETS[filter].deep }}>
              {money(filteredTotal, settings.currency)}
            </span>
          </motion.div>
        )}

        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-10 text-center">
            <Penny width={130} mood={q ? 'waiting' : 'happy'} outfit={settings.outfit} />
            <p className="mt-2 text-[20px] font-black">{q ? 'Nothing matches that' : 'Nothing here yet'}</p>
            <p className="max-w-[260px] text-[15px] font-semibold text-ink/55">
              {q ? 'Try a different word, Penny searched every pasture.' : 'Every coin you log shows up here, grouped by day.'}
            </p>
            {!q && (
              <button onClick={onAdd} className="chunky mt-2 h-12 rounded-2xl px-6 text-[15px] font-extrabold tracking-wide text-white uppercase">
                Log your first
              </button>
            )}
          </div>
        ) : (
          groups.map(([date, list]) => {
            const net = list.reduce((s, e) => s + (e.kind === 'income' ? e.amount : -e.amount), 0)
            return (
              <section key={date}>
                <div className="mb-1 flex items-baseline justify-between px-2">
                  <h3 className="text-[15px] font-black text-ink/70">{friendlyDay(date)}</h3>
                  <span className="num text-[13px] font-extrabold text-ink/45">
                    {net >= 0 ? '+' : '−'}
                    {money(Math.abs(net), settings.currency)}
                  </span>
                </div>
                <Card className="p-2">
                  <AnimatePresence initial={false}>
                    {list.map((e, i) => (
                      <EntryRow key={e.id} e={e} index={i} currency={settings.currency} family={settings.family} goals={goals} onClick={() => onEdit(e)} />
                    ))}
                  </AnimatePresence>
                </Card>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
