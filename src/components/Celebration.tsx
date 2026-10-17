import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'motion/react'
import { Flame } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BUCKETS } from '../lib/buckets'
import { OUTFITS, saveLine } from '../lib/game'
import { useStore, type Celebration as C } from '../store'
import { Penny } from './Penny'
import { Chunky, spring } from './ui'

const BRAND = ['#34C17B', '#F5A524', '#3BA7FF', '#8B5CF6', '#FF5FA2']

/**
 * The peak moment. First log of the day / badge / level-up get a full-screen party;
 * routine logs get a lighter toast so it never gets tiresome.
 */
export function Celebration() {
  const { celebration, dismissCelebration, settings } = useStore()
  const big = !!celebration && (celebration.firstToday || celebration.badges.length > 0 || !!celebration.levelUp)

  useEffect(() => {
    if (!celebration) return
    const colors = celebration.kind === 'checkin' ? BRAND : [BUCKETS[celebration.kind].color, '#FFFFFF', '#FFD24A']
    if (big) {
      const fire = (x: number, angle: number) =>
        confetti({ particleCount: 70, spread: 70, startVelocity: 55, angle, origin: { x, y: 0.75 }, colors, scalar: 1.1, disableForReducedMotion: true })
      fire(0.1, 60)
      fire(0.9, 120)
      setTimeout(() => confetti({ particleCount: 90, spread: 110, startVelocity: 35, origin: { y: 0.35 }, colors, shapes: ['circle'], disableForReducedMotion: true }), 350)
    } else {
      confetti({ particleCount: 40, spread: 60, startVelocity: 30, origin: { y: 0.85 }, colors, scalar: 0.9, disableForReducedMotion: true })
      const t = setTimeout(dismissCelebration, 2200)
      return () => clearTimeout(t)
    }
  }, [celebration, big, dismissCelebration])

  return (
    <AnimatePresence>
      {celebration && (big ? <BigParty key={celebration.id} c={celebration} outfit={settings.outfit} onClose={dismissCelebration} /> : <MiniToast key={celebration.id} c={celebration} />)}
    </AnimatePresence>
  )
}

function MiniToast({ c }: { c: C }) {
  const line = useMemo(() => (c.kind === 'checkin' ? 'Checked in!' : saveLine(c.kind)), [c])
  const color = c.kind === 'checkin' ? '#34C17B' : BUCKETS[c.kind].color
  return (
    <motion.div
      className="fixed inset-x-4 z-[70] mx-auto flex max-w-[440px] items-center gap-3 rounded-3xl bg-white p-3 pr-4 shadow-[var(--shadow-float)]"
      style={{ top: 'calc(var(--safe-top) + 12px)' }}
      initial={{ y: -80, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={spring}
    >
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
    </motion.div>
  )
}

function BigParty({ c, outfit, onClose }: { c: C; outfit: string; onClose: () => void }) {
  const [jump, setJump] = useState(0)
  const [shownStreak, setShownStreak] = useState(c.firstToday ? Math.max(0, c.streak - 1) : c.streak)
  const line = useMemo(() => (c.kind === 'checkin' ? 'A quiet day still counts. Proud of you!' : saveLine(c.kind)), [c])
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
        style={{ background: 'radial-gradient(closest-side, #FFE3A8, transparent)' }}
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
        <Penny width={200} mood="excited" outfit={outfit} jump={jump} />
      </div>

      <motion.h2
        className="relative mt-6 text-center text-[28px] leading-tight font-black tracking-tight"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.3 }}
      >
        {c.levelUp ? `Level ${c.levelUp.level}!` : line}
      </motion.h2>
      {c.levelUp && (
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
        <Chunky onClick={onClose}>Continue</Chunky>
      </motion.div>
    </motion.div>
  )
}
