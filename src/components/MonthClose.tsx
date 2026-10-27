import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { BUCKETS } from '../lib/buckets'
import { addMonths, money, monthKey, monthName } from '../lib/format'
import { shareBackup } from '../lib/backup'
import { useStore } from '../store'
import { Penny } from './Penny'
import { Chunky, CountUp, Sheet, spring } from './ui'

type Choice = 'treat' | 'save' | 'keep'

const SAVE = BUCKETS.saving

/** The first visit of a new month: applaud what was left over, then decide what it's for. */
export function MonthCloseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { close } = useStore()
  return (
    <Sheet open={open && !!close} onClose={onClose}>
      {close && <Wrap key={close.month} month={close.month} leftover={close.leftover} />}
    </Sheet>
  )
}

function Wrap({ month, leftover }: { month: string; leftover: number }) {
  const { settings, entries, goals, closeMonth } = useStore()
  const cur = settings.currency
  const name = monthName(month)
  const next = monthName(addMonths(month, 1))
  const plan = settings.savingsPlan
  const savedIn = entries.reduce((s, e) => (e.kind === 'saving' && monthKey(e.date) === month ? s + e.amount : s), 0)
  // Leftovers can still rescue last month's saving promise.
  const owed = plan && month >= plan.since ? Math.max(0, plan.amount - savedIn) : 0
  const open = goals.filter((g) => !g.reached_at)

  const [choice, setChoice] = useState<Choice | null>(owed > 0 ? 'save' : null)
  const [amount, setAmount] = useState(owed > 0 ? Math.min(owed, leftover) : leftover)
  const [into, setInto] = useState(open[0]?.name ?? 'Leftovers')
  const [busy, setBusy] = useState(false)
  const [jump, setJump] = useState(0)

  useEffect(() => {
    const colors = ['#34C17B', '#FFD24A', '#FFFFFF', '#FF8A1F']
    const t = setTimeout(() => {
      setJump(1)
      confetti({ particleCount: 60, spread: 70, startVelocity: 50, angle: 60, origin: { x: 0.05, y: 0.7 }, colors, disableForReducedMotion: true })
      confetti({ particleCount: 60, spread: 70, startVelocity: 50, angle: 120, origin: { x: 0.95, y: 0.7 }, colors, disableForReducedMotion: true })
      navigator.vibrate?.([20, 40, 20])
    }, 450)
    return () => clearTimeout(t)
  }, [])

  const pick = (c: Choice) => {
    setChoice(c)
    setAmount(c === 'save' && owed > 0 ? Math.min(owed, leftover) : leftover)
  }

  const portions: { label: string; value: number }[] =
    choice === 'keep' || !choice
      ? []
      : [
          { label: 'All of it', value: leftover },
          { label: 'Half', value: Math.floor(leftover / 2) },
          ...(choice === 'save' && owed > 0 && owed < leftover ? [{ label: `Keep the promise`, value: owed }] : []),
        ].filter((p, i, all) => p.value > 0 && all.findIndex((q) => q.value === p.value) === i)

  const used = choice === 'keep' || !choice ? 0 : amount
  const rest = leftover - used

  const confirm = async () => {
    if (!choice || busy) return
    setBusy(true)
    await closeMonth({ month, leftover, saved: choice === 'save' ? amount : 0, treat: choice === 'treat' ? amount : 0, into })
  }

  return (
    <div className="no-scrollbar flex flex-col items-center overflow-y-auto px-5 pb-5 text-center [&>*]:shrink-0">
      <span className="text-[13px] font-extrabold tracking-wider text-ink/45 uppercase">{name} wrap-up</span>

      <div className="relative my-2">
        <Penny width={118} mood="excited" outfit={settings.outfit} jump={jump} />
        {[-1, 1, 0].map((side, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute text-[26px]"
            style={{ left: `calc(50% + ${side * 64}px)`, top: 30 + i * 6 }}
            initial={{ opacity: 0, y: 10, scale: 0.4 }}
            animate={{ opacity: [0, 1, 1, 0], y: [10, -6, -18, -34], scale: [0.4, 1.15, 1, 0.9], rotate: side * 12 }}
            transition={{ duration: 1.6, delay: 0.5 + i * 0.25, repeat: 1, repeatDelay: 0.4 }}
          >
            👏
          </motion.span>
        ))}
      </div>

      <h2 className="text-[28px] leading-tight font-black tracking-tight">{name}: done 👏</h2>
      <p className="mt-1 text-[15px] font-bold text-ink/60">You finished with</p>
      <CountUp value={leftover} currency={cur} className="text-[40px] leading-tight font-black text-meadow-deep" />
      <p className="mt-1 max-w-[320px] text-[15px] font-bold text-ink/60">
        spare — money you didn't have to spend. That deserves a little applause. What should it do now?
      </p>

      <div className="mt-4 flex w-full flex-col gap-2 text-left">
        <Option
          on={choice === 'treat'}
          onClick={() => pick('treat')}
          emoji="🍦"
          title="Treat myself"
          sub="Take yourself out or get something nice. It's set aside, guilt-free."
          tone={{ color: '#FF5FA2', soft: '#FFE6F1' }}
        />
        <Option
          on={choice === 'save'}
          onClick={() => pick('save')}
          emoji="🐷"
          title={owed > 0 ? `Save it — keep the ${name} promise` : 'Save it'}
          sub={owed > 0 ? `You were ${money(owed, cur)} short of your ${money(plan!.amount, cur)} promise. This closes the gap.` : 'Straight into the vault.'}
          tone={{ color: SAVE.color, soft: SAVE.soft }}
        />
        <Option
          on={choice === 'keep'}
          onClick={() => pick('keep')}
          emoji="🌾"
          title={`Keep it for ${next}`}
          sub={`It joins what you have to spend in ${next}.`}
          tone={{ color: '#34C17B', soft: '#E3F7EC' }}
        />
      </div>

      <AnimatePresence initial={false}>
        {portions.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="w-full overflow-hidden">
            <div className="flex flex-wrap justify-center gap-2 pt-3">
              {portions.map((p) => (
                <Pill key={p.label} on={amount === p.value} onClick={() => setAmount(p.value)}>
                  {p.label} · {money(p.value, cur)}
                </Pill>
              ))}
            </div>
            {choice === 'save' && open.length > 0 && (
              <div className="no-scrollbar -mx-5 flex items-center gap-2 overflow-x-auto px-5 pt-2">
                <span className="shrink-0 text-[13px] font-extrabold text-ink/45">Into</span>
                {[...open.map((g) => [g.name, g.emoji]), ['Leftovers', '🧺']].map(([n, e]) => (
                  <Pill key={n} on={n === into} onClick={() => setInto(n)}>
                    {e} {n}
                  </Pill>
                ))}
              </div>
            )}
            {rest > 0 && (
              <p className="num pt-2 text-[13px] font-bold text-ink/50">
                The other {money(rest, cur)} carries into {next}.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 w-full">
        <Chunky disabled={!choice || busy} onClick={confirm}>
          {!choice
            ? 'Pick one'
            : choice === 'treat'
              ? `Treat myself to ${money(amount, cur)}`
              : choice === 'save'
                ? `Save ${money(amount, cur)}`
                : `Carry ${money(leftover, cur)} into ${next}`}
        </Chunky>
      </div>

      <button onClick={() => shareBackup()} className="mt-3 text-[13px] font-extrabold text-ink/40">
        💾 New month, good moment to save a backup
      </button>
    </div>
  )
}

function Option({
  on,
  onClick,
  emoji,
  title,
  sub,
  tone,
}: {
  on: boolean
  onClick: () => void
  emoji: string
  title: string
  sub: string
  tone: { color: string; soft: string }
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
      style={{ background: on ? tone.soft : '#fff', boxShadow: on ? `0 0 0 2.5px ${tone.color} inset` : '0 0 0 2px var(--color-line) inset' }}
      transition={spring}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[24px]" style={{ background: on ? '#fff' : tone.soft }}>
        {emoji}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[16px] leading-tight font-black">{title}</span>
        <span className="text-[13px] leading-snug font-bold text-ink/55">{sub}</span>
      </span>
    </motion.button>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="num flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-extrabold whitespace-nowrap"
      style={on ? { background: 'var(--color-ink)', color: '#fff' } : { background: '#fff', color: 'rgba(38,35,46,.65)', boxShadow: '0 0 0 2px var(--color-line) inset' }}
    >
      {children}
    </button>
  )
}
