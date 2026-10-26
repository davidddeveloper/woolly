import { AnimatePresence, motion } from 'motion/react'
import { Repeat2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BUCKETS, categoryEmoji } from '../lib/buckets'
import { dayKey, friendlyDay, money } from '../lib/format'
import { cadenceLabel, type Recurring } from '../lib/recurring'
import { useStore } from '../store'
import { Card, SectionTitle, spring } from './ui'

/** Repeating entries whose day has come. Nothing is logged until you confirm. */
export function DueCard() {
  const { due, settings, goals, confirmRecurring, skipRecurring } = useStore()
  const [busy, setBusy] = useState<string | null>(null)
  if (!due.length) return null
  const run = async (r: Recurring, f: (r: Recurring) => Promise<void>) => {
    if (busy) return
    setBusy(r.id)
    await f(r)
    setBusy(null)
  }
  return (
    <Card className="p-3">
      <div className="mb-1 flex items-center gap-2 px-2 pt-1 text-[13px] font-extrabold tracking-wider text-ink/50 uppercase">
        <Repeat2 size={15} strokeWidth={3} /> Due {due.length > 1 && `· ${due.length}`}
      </div>
      <AnimatePresence initial={false}>
        {due.slice(0, 3).map((r) => {
          const b = BUCKETS[r.kind]
          return (
            <motion.div
              key={r.id + r.next_date}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40, height: 0 }}
              transition={spring}
              className="flex items-center gap-2.5 rounded-2xl p-2"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[22px]" style={{ background: b.soft }}>
                {categoryEmoji(r.kind, r.category, settings.family, goals)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-extrabold">{r.note || r.category}</span>
                <span className="num text-[13px] leading-tight font-bold text-ink/50">
                  <span style={{ color: b.deep }}>{money(r.amount, settings.currency)}</span> · {friendlyDay(r.next_date)}
                </span>
              </span>
              <button disabled={!!busy} onClick={() => run(r, skipRecurring)} className="h-9 rounded-xl px-1.5 text-[13px] font-extrabold text-ink/45">
                Skip
              </button>
              <button
                disabled={!!busy}
                onClick={() => run(r, (x) => confirmRecurring(x))}
                className="chunky h-9 rounded-xl px-3.5 text-[13px] font-extrabold text-white"
                style={{ '--btn': b.color, '--btn-deep': b.deep } as React.CSSProperties}
              >
                Log it
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </Card>
  )
}

/** Barn list of everything that repeats, so you can see and stop it. */
export function RepeatingCard() {
  const { recurring, settings, goals, deleteRecurring } = useStore()
  return (
    <Card>
      <SectionTitle>Repeating</SectionTitle>
      {recurring.length === 0 ? (
        <p className="-mt-1 text-[13px] font-semibold text-ink/55">
          Rent, salary, data bundles… When you log one, tap <b>Repeat</b> and Penny will remind you each time it comes round.
        </p>
      ) : (
        <div className="-mx-2 flex flex-col">
          {recurring.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl p-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[20px]" style={{ background: BUCKETS[r.kind].soft }}>
                {categoryEmoji(r.kind, r.category, settings.family, goals)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-extrabold">
                  {r.note || r.category} · <span className="num">{money(r.amount, settings.currency)}</span>
                </span>
                <span className="text-[13px] leading-snug font-bold text-ink/50">
                  {cadenceLabel(r)} · {r.next_date <= dayKey() ? 'due now' : `next ${friendlyDay(r.next_date)}`}
                </span>
              </span>
              <button
                aria-label={`Stop repeating ${r.note || r.category}`}
                onClick={() => confirm(`Stop repeating ${r.note || r.category}? Past entries stay.`) && deleteRecurring(r.id)}
                className="grid h-10 w-10 place-items-center rounded-full text-ink/35 active:text-expense"
              >
                <Trash2 size={18} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
