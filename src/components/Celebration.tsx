import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'motion/react'
import { Flame } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BUCKETS } from '../lib/buckets'
import { periodNoun, STATE_COLOR } from '../lib/budgets'
import { money } from '../lib/format'
import { OUTFITS, saveLine } from '../lib/game'
import { useStore, type BudgetPing, type Celebration as C } from '../store'
import { Penny } from './Penny'
import { Chunky, spring } from './ui'

const BRAND = ['#34C17B', '#F5A524', '#3BA7FF', '#8B5CF6', '#FF5FA2']

/**
 * The peak moment. First log of the day / badge / level-up get a full-screen party;
 * routine logs get a lighter toast so it never gets tiresome.
 */
export function Celebration() {
  const { celebration, dismissCelebration, settings } = useStore()
  const overBudget = celebration?.budget?.crossed === 'over'
  const big = !!celebration && (celebration.firstToday || celebration.badges.length > 0 || !!celebration.levelUp || !!celebration.goal || overBudget)

  useEffect(() => {
    if (!celebration) return
    if (celebration.budget?.crossed) navigator.vibrate?.([30, 60, 30])
    const k = celebration.kind
    const colors = k === 'checkin' || k === 'budget' ? BRAND : [BUCKETS[k].color, '#FFFFFF', '#FFD24A']
    // Going over budget is news, not a party.
    if (overBudget && !celebration.badges.length && !celebration.levelUp && !celebration.goal) return
    if (big) {
      const fire = (x: number, angle: number) =>
        confetti({ particleCount: 70, spread: 70, startVelocity: 55, angle, origin: { x, y: 0.75 }, colors, scalar: 1.1, disableForReducedMotion: true })
      fire(0.1, 60)
      fire(0.9, 120)
      setTimeout(() => confetti({ particleCount: 90, spread: 110, startVelocity: 35, origin: { y: 0.35 }, colors, shapes: ['circle'], disableForReducedMotion: true }), 350)
    } else {
      confetti({ particleCount: 40, spread: 60, startVelocity: 30, origin: { y: 0.85 }, colors, scalar: 0.9, disableForReducedMotion: true })
      const t = setTimeout(dismissCelebration, celebration.budget ? 3600 : 2200)
      return () => clearTimeout(t)
    }
  }, [celebration, big, overBudget, dismissCelebration])

  return (
    <AnimatePresence>
      {celebration &&
        (big ? (
          <BigParty key={celebration.id} c={celebration} outfit={settings.outfit} currency={settings.currency} onClose={dismissCelebration} />
        ) : (
          <MiniToast key={celebration.id} c={celebration} currency={settings.currency} />
        ))}
    </AnimatePresence>
  )
}

function defaultLine(c: C) {
  return c.line ?? (c.kind === 'checkin' ? 'Checked in!' : c.kind === 'budget' ? 'Noted!' : saveLine(c.kind))
}

/** One line on how a log moved its budget. */
export function budgetNews(p: BudgetPing, currency: string) {
  const s = p.status
  const left = money(Math.max(0, s.remaining), currency)
  const noun = periodNoun(s.budget.period)
  if (s.state === 'over') return `${p.label} is ${money(-s.remaining, currency)} over this ${noun}`
  if (p.crossed === 'warn') return `${p.label} is at ${Math.floor(s.pct * 100)}% · ${left} left for ${s.range.left} day${s.range.left === 1 ? '' : 's'}`
  if (s.range.left > 1) return `${p.label}: ${left} left · ${money(Math.floor(s.daily), currency)}/day`
  return `${p.label}: ${left} left this ${noun}`
}

function MiniToast({ c, currency }: { c: C; currency: string }) {
  const line = useMemo(() => defaultLine(c), [c])
  const color = c.kind === 'checkin' || c.kind === 'budget' ? '#34C17B' : BUCKETS[c.kind].color
  const tone = c.budget ? STATE_COLOR[c.budget.status.state] : null
  return (
    <motion.div
      className="fixed inset-x-4 z-[70] mx-auto flex max-w-[440px] flex-col overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-float)]"
      style={{ top: 'calc(var(--safe-top) + 12px)' }}
      initial={{ y: -80, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={spring}
    >
      <div className="flex items-center gap-3 p-3 pr-4">
      <div className="grid h-14 w-14 shrink-0 place-items-end overflow-hidden rounded-2xl" style={{ background: `${color}22` }}>
        <motion.img src="/penny.webp" alt="" className="w-12 translate-y-2" initial={{ y: 30 }} animate={{ y: 8 }} transition={{ ...spring, delay: 0.1 }} />
      </div>
      <p className="flex-1 text-[15px] leading-snug font-extrabold">{line}</p>
      {c.xp > 0 && (
        <motion.span
          className="rounded-xl px-2.5 py-1 text-[15px] font-black text-white"
          style={{ background: '#F5A524' }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring, delay: 0.2 }}
        >
          +{c.xp} XP
        </motion.span>
      )}
      </div>
      {c.budget && tone && (
        <motion.div
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-extrabold"
          style={{ background: tone.soft, color: tone.deep }}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.25 }}
        >
          <span className="text-[15px]">{c.budget.crossed === 'warn' ? '⚠️' : c.budget.emoji}</span>
          <span className="flex-1">{budgetNews(c.budget, currency)}</span>
          <BudgetMeter pct={c.budget.status.pct} color={tone.bar} />
        </motion.div>
      )}
    </motion.div>
  )
}

function BudgetMeter({ pct, color }: { pct: number; color: string }) {
  return (
    <span className="h-2 w-12 shrink-0 overflow-hidden rounded-full bg-white/80">
      <motion.span
        className="block h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(1, pct) * 100}%` }}
        transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      />
    </span>
  )
}

function BigParty({ c, outfit, currency, onClose }: { c: C; outfit: string; currency: string; onClose: () => void }) {
  const [jump, setJump] = useState(0)
  const [shownStreak, setShownStreak] = useState(c.firstToday ? Math.max(0, c.streak - 1) : c.streak)
  const line = useMemo(() => (c.kind === 'checkin' && !c.line ? 'A quiet day still counts. Proud of you!' : defaultLine(c)), [c])
  // Over budget with nothing else to celebrate: a calm heads-up instead of a party.
  const alertOnly = c.budget?.crossed === 'over' && !c.firstToday && !c.badges.length && !c.levelUp && !c.goal
  const unlocked = c.levelUp ? OUTFITS.find((o) => o.level === c.levelUp!.level) : undefined

  useEffect(() => {
    const t1 = setTimeout(() => setJump((j) => j + 1), 250)
    const t2 = setTimeout(() => setShownStreak(c.streak), 700)
    const t3 = setTimeout(() => setJump((j) => j + 1), 1100)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [c.streak])

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center overflow-y-auto bg-cream px-6"
      style={{ paddingTop: 'calc(var(--safe-top) + 32px)', paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <motion.div
        className="pointer-events-none absolute top-[12%] h-[340px] w-[340px] rounded-full"
        style={{ background: `radial-gradient(closest-side, ${alertOnly ? '#FFD9D4' : '#FFE3A8'}, transparent)` }}
        animate={{ scale: [0.8, 1.1, 1], rotate: 360 }}
        transition={{ scale: { duration: 1 }, rotate: { duration: 30, repeat: Infinity, ease: 'linear' } }}
      />
      {c.firstToday && c.streak > 0 && (
        <motion.div
          className="relative flex flex-col items-center"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: 0.1 }}
        >
          <motion.div animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 0.6, delay: 0.7 }} className="flex items-center gap-1">
            <Flame size={44} fill="#FF8A1F" color="#E8660C" strokeWidth={2} />
            <AnimatePresence mode="popLayout">
              <motion.span
                key={shownStreak}
                className="num text-[56px] leading-none font-black text-flame"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={spring}
              >
                {shownStreak}
              </motion.span>
            </AnimatePresence>
          </motion.div>
          <span className="text-[15px] font-extrabold tracking-[0.14em] text-flame uppercase">day streak</span>
        </motion.div>
      )}

      <div className="relative mt-4">
        <Penny width={200} mood={alertOnly ? 'worried' : 'excited'} outfit={outfit} jump={alertOnly ? 0 : jump} />
      </div>

      <motion.h2
        className="relative mt-6 text-center text-[28px] leading-tight font-black tracking-tight"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        {c.goal ? `You reached ${c.goal.name}! ${c.goal.emoji}` : c.levelUp ? `Level ${c.levelUp.level}!` : alertOnly ? `${c.budget!.label} went over budget` : line}
      </motion.h2>
      {alertOnly && (
        <motion.p className="mt-2 max-w-[320px] text-center text-[17px] font-bold text-ink/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          {overBy(c.budget!, currency)} No panic — knowing is the first step. Let's go gentle on it for the rest of the {periodNoun(c.budget!.status.budget.period)}.
        </motion.p>
      )}
      {c.goal && (
        <motion.p className="mt-1 max-w-[320px] text-center text-[17px] font-bold text-ink/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          Goal complete. Every little saving added up — that's the whole trick.
          {c.levelUp && (
            <>
              <br />
              And you're now Level {c.levelUp.level}: <b className="text-ink">{c.levelUp.title}</b>
            </>
          )}
        </motion.p>
      )}
      {c.levelUp && !c.goal && (
        <motion.p className="mt-1 text-center text-[17px] font-bold text-ink/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          You're now a <b className="text-ink">{c.levelUp.title}</b>
          {unlocked && unlocked.id !== 'none' && (
            <>
              <br />
              Penny unlocked: {unlocked.emoji} {unlocked.label}
            </>
          )}
        </motion.p>
      )}

      <div className="relative mt-5 flex w-full max-w-[360px] flex-col gap-2">
        {c.xp > 0 && (
          <motion.div
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#FFF1D6] py-3 text-[17px] font-black text-[#C97F06]"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring, delay: 0.5 }}
          >
            ⭐ +{c.xp} XP
          </motion.div>
        )}
        {c.budget && (c.budget.crossed || alertOnly) && <BudgetCard p={c.budget} currency={currency} />}
        {c.badges.map((b, i) => (
          <motion.div
            key={b.id}
            className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-[var(--shadow-card)]"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...spring, delay: 0.7 + i * 0.15 }}
          >
            <motion.span
              className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FFF1D6] text-[28px]"
              animate={{ rotate: [0, -12, 12, 0] }}
              transition={{ delay: 1 + i * 0.15, duration: 0.6 }}
            >
              {b.emoji}
            </motion.span>
            <span className="flex flex-col">
              <span className="text-[13px] font-extrabold tracking-wider text-income uppercase">New badge</span>
              <span className="text-[17px] font-black">{b.name}</span>
            </span>
            <motion.span
              className="absolute inset-y-0 w-16 -skew-x-12 bg-white/70"
              initial={{ left: '-20%' }}
              animate={{ left: '120%' }}
              transition={{ delay: 1.1 + i * 0.15, duration: 0.8 }}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex-1" />
      <motion.div className="relative mt-6 w-full max-w-[360px]" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...spring, delay: 0.6 }}>
        <Chunky onClick={onClose}>{alertOnly ? 'Got it' : 'Continue'}</Chunky>
      </motion.div>
    </motion.div>
  )
}

function overBy(p: BudgetPing, currency: string) {
  const days = p.status.range.left
  return `You're ${money(-p.status.remaining, currency)} past your ${money(p.status.limit, currency)} plan${days > 1 ? ` with ${days} days to go` : ''}.`
}

function BudgetCard({ p, currency }: { p: BudgetPing; currency: string }) {
  const tone = STATE_COLOR[p.status.state]
  return (
    <motion.div
      className="flex flex-col gap-2 rounded-2xl p-3"
      style={{ background: tone.soft }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...spring, delay: 0.55 }}
    >
      <div className="flex items-center gap-2 text-[15px] font-black" style={{ color: tone.deep }}>
        <span className="text-[20px]">{p.emoji}</span>
        <span className="flex-1">{budgetNews(p, currency)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/80">
        <motion.div
          className="h-full rounded-full"
          style={{ background: tone.bar }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(1, p.status.pct) * 100}%` }}
          transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.div>
  )
}
