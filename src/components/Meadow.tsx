import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { partOfDay } from '../lib/format'

const SKY = {
  dawn: ['#FFD9B8', '#FFF1DC'],
  day: ['#BFE6FF', '#EAF7FF'],
  dusk: ['#FFB38A', '#FFDDBE'],
  night: ['#1F2547', '#3A3F6E'],
} as const

/** The living backdrop for Penny: sky follows the clock, clouds drift, grass sways. */
export function Meadow({ children, overlay, height = 300 }: { children: ReactNode; overlay?: ReactNode; height?: number }) {
  const pod = partOfDay()
  const [top, bottom] = SKY[pod]
  const night = pod === 'night'
  return (
    <div className="relative overflow-hidden" style={{ height, background: `linear-gradient(180deg, ${top}, ${bottom})` }}>
      {night ? <Stars /> : null}
      {/* sun or moon */}
      <motion.div
        className="absolute rounded-full"
        style={{
          right: 36,
          top: 'calc(var(--safe-top) + 64px)',
          width: night ? 44 : 64,
          height: night ? 44 : 64,
          background: night ? '#FFF6D8' : pod === 'day' ? '#FFD24A' : '#FFB04A',
          boxShadow: night ? '0 0 40px 8px rgba(255,246,216,.35), inset -10px -4px 0 #E9DDB5' : '0 0 60px 20px rgba(255,210,74,.45)',
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {!night && (
        <>
          <Cloud top={84} duration={70} delay={-20} scale={1} />
          <Cloud top={136} duration={95} delay={-60} scale={0.7} />
          <Cloud top={56} duration={120} delay={-90} scale={0.55} />
        </>
      )}
      {/* hills */}
      <svg className="absolute inset-x-0 bottom-0 w-full" viewBox="0 0 400 140" preserveAspectRatio="none" style={{ height: 150 }}>
        <path d="M0 70 Q 90 20 190 60 T 400 50 V140 H0 Z" fill={night ? '#2C5A48' : '#8FDDA9'} />
        <path d="M0 100 Q 120 55 230 92 T 400 84 V140 H0 Z" fill={night ? '#22493B' : '#4CC38A'} />
        <path d="M0 126 Q 200 104 400 124 V140 H0 Z" fill={night ? '#1B3D31' : '#34B377'} />
      </svg>
      <Grass night={night} />
      <div className="absolute inset-x-0 bottom-3 flex justify-center">{children}</div>
      {overlay}
    </div>
  )
}

function Cloud({ top, duration, delay, scale }: { top: number; duration: number; delay: number; scale: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ top, left: 0, scale }}
      initial={{ x: '-30vw' }}
      animate={{ x: '110vw' }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
    >
      <svg width="120" height="48" viewBox="0 0 120 48">
        <path d="M14 44 a14 14 0 0 1 6-27 a22 22 0 0 1 40-6 a18 18 0 0 1 34 8 a13 13 0 0 1 12 25 Z" fill="#fff" opacity=".92" />
      </svg>
    </motion.div>
  )
}

function Stars() {
  const stars = [
    [12, 18], [28, 40], [44, 14], [62, 32], [78, 12], [88, 44], [20, 58], [52, 52], [70, 60], [36, 26], [94, 22], [6, 40],
  ]
  return (
    <>
      {stars.map(([x, y], i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white"
          style={{ left: `${x}%`, top: `${y}%` }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </>
  )
}

function Grass({ night }: { night: boolean }) {
  const tufts = [6, 18, 31, 69, 82, 94]
  return (
    <>
      {tufts.map((x, i) => (
        <motion.svg
          key={x}
          className="absolute"
          style={{ left: `${x}%`, bottom: 10 + (i % 3) * 6, transformOrigin: '50% 100%' }}
          width="22"
          height="22"
          viewBox="0 0 22 22"
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M3 22 Q 4 10 1 4 Q 7 12 8 22 M 9 22 Q 11 6 10 0 Q 14 10 13 22 M 14 22 Q 16 12 21 6 Q 18 14 19 22" fill={night ? '#3F7A60' : '#2A9C63'} />
          {i % 2 === 0 && <circle cx="11" cy="3" r="2.6" fill={night ? '#C9C3E6' : i % 4 ? '#FFD24A' : '#FFFFFF'} />}
        </motion.svg>
      ))}
    </>
  )
}
