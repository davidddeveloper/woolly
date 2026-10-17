import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Mood, OutfitId } from '../lib/game'

// Coordinates below live in the source render's pixel space (810 × 1053).
const VB_W = 810
const VB_H = 1053

interface Props {
  mood?: Mood
  outfit?: OutfitId | string
  width?: number
  /** Change this number to make Penny jump. */
  jump?: number
  onTap?: () => void
  shadow?: boolean
}

export function Penny({ mood = 'happy', outfit = 'none', width = 200, jump = 0, onTap, shadow = true }: Props) {
  const [scope, animate] = useAnimate()
  const [blink, setBlink] = useState(false)
  const [hearts, setHearts] = useState<number[]>([])
  const eyesClosed = blink || mood === 'sleepy'

  // Natural, irregular blinking.
  useEffect(() => {
    if (mood === 'sleepy') return
    let t: number
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true)
        window.setTimeout(() => setBlink(false), 130)
        if (Math.random() < 0.25) {
          window.setTimeout(() => setBlink(true), 260)
          window.setTimeout(() => setBlink(false), 390)
        }
        loop()
      }, 2200 + Math.random() * 3400)
    }
    loop()
    return () => clearTimeout(t)
  }, [mood])

  const hop = async (big: boolean) => {
    if (!scope.current) return
    const h = big ? 70 : 34
    animate(
      '.penny-body',
      { y: [0, 6, -h, 0, -h * 0.3, 0], scaleY: [1, 0.86, 1.08, 0.9, 1.03, 1], scaleX: [1, 1.1, 0.94, 1.08, 0.98, 1] },
      { duration: big ? 0.9 : 0.6, ease: 'easeOut' },
    )
    animate('.penny-shadow', { scale: [1, 1.1, 0.55, 1, 0.85, 1], opacity: [1, 1, 0.4, 1, 0.8, 1] }, { duration: big ? 0.9 : 0.6 })
  }

  const firstJump = useRef(jump)
  useEffect(() => {
    if (jump === firstJump.current) return
    hop(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump])

  const tap = () => {
    hop(false)
    setHearts((h) => [...h, Date.now()])
    onTap?.()
  }

  const height = (width * VB_H) / VB_W
  const idle =
    mood === 'sleepy'
      ? { scaleY: [1, 1.035, 1], transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' } }
      : mood === 'sad'
        ? { scaleY: [1, 1.01, 1], rotate: -3, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }
        : mood === 'waiting'
          ? { rotate: [0, 2.5, 0, -2, 0], scaleY: [1, 1.02, 1, 1.02, 1], transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }
          : { scaleY: [1, 1.025, 1], transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }

  return (
    <div ref={scope} className="relative select-none" style={{ width, height }}>
      {shadow && (
        <div
          className="penny-shadow absolute left-1/2 -translate-x-1/2 rounded-[50%]"
          style={{ bottom: -height * 0.015, width: width * 0.78, height: width * 0.12, background: 'radial-gradient(closest-side, rgba(40,60,30,.28), transparent)' }}
        />
      )}
      <motion.div className="penny-body absolute inset-0" style={{ transformOrigin: '50% 100%' }}>
        <motion.button
          type="button"
          aria-label="Penny the sheep"
          onClick={tap}
          className="absolute inset-0 block"
          style={{ transformOrigin: '50% 100%' }}
          animate={idle}
          whileTap={{ scale: 0.95 }}
        >
          <img src="/penny.webp" alt="" draggable={false} className="absolute inset-0 h-full w-full" style={{ opacity: eyesClosed ? 0 : 1 }} />
          <img src="/penny-blink.webp" alt="" draggable={false} className="absolute inset-0 h-full w-full" style={{ opacity: eyesClosed ? 1 : 0 }} />
          <Outfit id={outfit} />
        </motion.button>
      </motion.div>
      <MoodFx mood={mood} width={width} />
      <AnimatePresence>
        {hearts.map((id) => (
          <HeartBurst key={id} onDone={() => setHearts((h) => h.filter((x) => x !== id))} width={width} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      {children}
    </svg>
  )
}

function Outfit({ id }: { id: string }) {
  switch (id) {
    case 'scarf':
      return (
        <Svg>
          <path d="M300 488 Q 510 610 735 470 L 742 540 Q 510 690 292 552 Z" fill="#E8504A" />
          <path d="M300 488 Q 510 610 735 470" fill="none" stroke="#FF8A7A" strokeWidth="10" />
          <path d="M318 520 Q 510 640 738 505" fill="none" stroke="#C93A35" strokeWidth="8" strokeDasharray="22 26" />
          <path d="M360 560 L 330 760 L 420 760 L 430 585 Z" fill="#E8504A" />
          <path d="M335 735 L 425 735" stroke="#FFF2E0" strokeWidth="14" />
          <path d="M340 700 L 425 700" stroke="#FFF2E0" strokeWidth="10" />
        </Svg>
      )
    case 'flower':
      return (
        <Svg>
          <g transform="translate(300 150) rotate(-15)">
            {Array.from({ length: 8 }, (_, i) => (
              <ellipse key={i} cx="0" cy="-46" rx="22" ry="44" fill="#FFFFFF" stroke="#F1E3C8" strokeWidth="4" transform={`rotate(${i * 45})`} />
            ))}
            <circle r="30" fill="#FFC531" />
            <circle r="30" fill="none" stroke="#F0A300" strokeWidth="5" />
          </g>
          <g transform="translate(395 95) rotate(20) scale(.6)">
            {Array.from({ length: 8 }, (_, i) => (
              <ellipse key={i} cx="0" cy="-46" rx="22" ry="44" fill="#FFD6E8" transform={`rotate(${i * 45})`} />
            ))}
            <circle r="28" fill="#FFC531" />
          </g>
        </Svg>
      )
    case 'beanie':
      return (
        <Svg>
          <g transform="rotate(9 510 120)">
            <path d="M262 170 Q 270 -120 510 -130 Q 750 -120 758 170 Z" fill="#3BA7FF" />
            <path d="M330 -20 Q 510 -90 690 -20" stroke="#7CC6FF" strokeWidth="16" fill="none" />
            <path d="M290 60 Q 510 -10 730 60" stroke="#7CC6FF" strokeWidth="16" fill="none" />
            <rect x="240" y="130" width="540" height="90" rx="44" fill="#1C7FD6" />
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={266 + i * 42} y="146" width="14" height="58" rx="7" fill="#3BA7FF" />
            ))}
            <circle cx="510" cy="-150" r="62" fill="#FFF6E8" />
            <circle cx="490" cy="-170" r="22" fill="#FFFFFF" />
          </g>
        </Svg>
      )
    case 'glasses':
      return (
        <Svg>
          <g fill="rgba(255,255,255,.12)" stroke="#2A1E18" strokeWidth="14">
            <circle cx="415" cy="290" r="78" />
            <circle cx="618" cy="350" r="68" />
          </g>
          <path d="M490 300 Q 520 300 552 330" stroke="#2A1E18" strokeWidth="14" fill="none" />
          <path d="M338 270 L 300 255" stroke="#2A1E18" strokeWidth="14" />
          <path d="M684 368 L 712 380" stroke="#2A1E18" strokeWidth="14" />
          <path d="M370 245 Q 395 228 420 232" stroke="#fff" strokeOpacity=".7" strokeWidth="10" fill="none" strokeLinecap="round" />
        </Svg>
      )
    case 'bowtie':
      return (
        <Svg>
          <g transform="translate(525 560) rotate(8)">
            <path d="M0 0 L -120 -70 Q -140 0 -120 70 Z" fill="#8B5CF6" />
            <path d="M0 0 L 120 -70 Q 140 0 120 70 Z" fill="#8B5CF6" />
            <path d="M-110 -50 L -30 -8" stroke="#B49AFB" strokeWidth="10" />
            <path d="M110 -50 L 30 -8" stroke="#B49AFB" strokeWidth="10" />
            <rect x="-32" y="-34" width="64" height="68" rx="20" fill="#6A3AD9" />
          </g>
        </Svg>
      )
    case 'party':
      return (
        <Svg>
          <g transform="rotate(-14 470 60)">
            <path d="M360 80 L 470 -230 L 580 80 Z" fill="#FF5FA2" />
            <path d="M400 -30 L 540 -30 M 380 30 L 560 30 M 425 -110 L 515 -110" stroke="#FFD24A" strokeWidth="22" />
            <ellipse cx="470" cy="82" rx="122" ry="26" fill="#D93A7E" />
            <circle cx="470" cy="-240" r="38" fill="#FFD24A" />
          </g>
        </Svg>
      )
    case 'crown':
      return (
        <Svg>
          <g transform="rotate(8 510 40)">
            <path d="M360 120 L 340 -60 L 425 20 L 510 -90 L 595 20 L 680 -60 L 660 120 Z" fill="#FFC531" stroke="#E09A00" strokeWidth="10" strokeLinejoin="round" />
            <rect x="355" y="96" width="310" height="44" rx="14" fill="#F0A300" />
            <circle cx="510" cy="40" r="22" fill="#FF5FA2" />
            <circle cx="420" cy="62" r="15" fill="#3BA7FF" />
            <circle cx="600" cy="62" r="15" fill="#4CC38A" />
            <circle cx="340" cy="-62" r="14" fill="#FFE58A" />
            <circle cx="510" cy="-92" r="16" fill="#FFE58A" />
            <circle cx="680" cy="-62" r="14" fill="#FFE58A" />
            <path d="M400 0 L 420 40" stroke="#FFF1B0" strokeWidth="10" strokeLinecap="round" />
          </g>
        </Svg>
      )
    default:
      return null
  }
}

function MoodFx({ mood, width }: { mood: Mood; width: number }) {
  const s = width / 200
  if (mood === 'sleepy')
    return (
      <div className="pointer-events-none absolute" style={{ right: -6 * s, top: -4 * s }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute font-black text-ink/60"
            style={{ fontSize: (14 + i * 6) * s, right: i * 14 * s }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], y: -40 * s, x: 10 * s }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
          >
            z
          </motion.span>
        ))}
      </div>
    )
  if (mood === 'worried')
    return (
      <motion.div
        className="pointer-events-none absolute"
        style={{ right: width * 0.1, top: width * 0.2, width: 18 * s, height: 26 * s }}
        animate={{ y: [0, 10 * s, 0], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <svg viewBox="0 0 18 26">
          <path d="M9 0 C 9 0 18 13 18 17 A 9 9 0 0 1 0 17 C 0 13 9 0 9 0 Z" fill="#7CC6FF" />
          <ellipse cx="6" cy="16" rx="2.5" ry="4" fill="#fff" opacity=".8" />
        </svg>
      </motion.div>
    )
  if (mood === 'sad')
    return (
      <motion.div
        className="pointer-events-none absolute left-1/2"
        style={{ top: -width * 0.22, width: width * 0.5, marginLeft: -width * 0.25 }}
        animate={{ x: [-4 * s, 4 * s, -4 * s] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 100 70" className="w-full overflow-visible">
          <path d="M20 40 a16 16 0 0 1 8-30 a22 22 0 0 1 40 2 a14 14 0 0 1 14 28 Z" fill="#B8C4D6" />
          {[30, 50, 70].map((x, i) => (
            <motion.path
              key={x}
              d={`M${x} 46 l-3 9`}
              stroke="#7CC6FF"
              strokeWidth="4"
              strokeLinecap="round"
              animate={{ y: [0, 14], opacity: [1, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </svg>
      </motion.div>
    )
  if (mood === 'excited' || mood === 'happy') {
    const n = mood === 'excited' ? 6 : 3
    return (
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: n }, (_, i) => {
          const left = [8, 84, 18, 92, 2, 70][i]
          const top = [12, 6, 46, 40, 28, -4][i]
          return (
            <motion.span
              key={i}
              className="absolute"
              style={{ left: `${left}%`, top: `${top}%`, fontSize: 16 * s }}
              animate={{ scale: [0, 1, 0], rotate: [0, 90] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.55, repeatDelay: mood === 'excited' ? 0.2 : 1.6 }}
            >
              {mood === 'excited' && i % 2 ? '💛' : '✨'}
            </motion.span>
          )
        })}
      </div>
    )
  }
  return null
}

function HeartBurst({ onDone, width }: { onDone: () => void; width: number }) {
  const parts = useRef(Array.from({ length: 6 }, () => ({ x: (Math.random() - 0.5) * width * 0.9, r: (Math.random() - 0.5) * 60 })))
  return (
    <div className="pointer-events-none absolute left-1/2 top-[22%]">
      {parts.current.map((p, i) => (
        <motion.span
          key={i}
          className="absolute text-xl"
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: p.x, y: -width * 0.45 - Math.random() * 30, scale: 1, opacity: 0, rotate: p.r }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: i * 0.03 }}
          onAnimationComplete={i === 0 ? onDone : undefined}
        >
          {i % 3 === 0 ? '💛' : '💗'}
        </motion.span>
      ))}
    </div>
  )
}
