import { animate, AnimatePresence, motion, useDragControls, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { money } from '../lib/format'

export const spring = { type: 'spring', stiffness: 520, damping: 34 } as const
export const softSpring = { type: 'spring', stiffness: 260, damping: 26 } as const

/** Animates from the previous value to the new one. */
export function CountUp({ value, currency, className, style }: { value: number; currency: string; className?: string; style?: CSSProperties }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => money(Math.round(v), currency))
  const first = useRef(true)
  useEffect(() => {
    const c = animate(mv, value, { duration: first.current ? 1.1 : 0.6, ease: [0.16, 1, 0.3, 1] })
    first.current = false
    return c.stop
  }, [value, mv])
  return (
    <motion.span className={`num ${className ?? ''}`} style={style}>
      {text}
    </motion.span>
  )
}

export function Ring({ progress, color, size = 64, stroke = 8, children }: { progress: number; color: string; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, progress))
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeOpacity={0.14} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - p) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ${className}`} style={style}>
      {children}
    </div>
  )
}

export function Chunky({
  children,
  onClick,
  color,
  deep,
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  color?: string
  deep?: string
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`chunky flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[17px] font-extrabold uppercase tracking-wide text-white ${className}`}
      style={{ '--btn': color, '--btn-deep': deep } as CSSProperties}
    >
      {children}
    </button>
  )
}

/** Bottom sheet with drag-to-dismiss. */
export function Sheet({ open, onClose, children, tall }: { open: boolean; onClose: () => void; children: ReactNode; tall?: boolean }) {
  const controls = useDragControls()
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose()
  }
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[480px] flex-col rounded-t-[32px] bg-cream"
            style={{ maxHeight: tall ? 'calc(100dvh - var(--safe-top) - 12px)' : '88dvh', paddingBottom: 'var(--safe-bottom)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div className="flex touch-none justify-center pt-3 pb-3" onPointerDown={(e) => controls.start(e)}>
              <div className="h-1.5 w-10 rounded-full bg-ink/15" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ id: number; text: string; action?: { label: string; run: () => void } } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])
  const node = (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className="fixed inset-x-4 z-[60] mx-auto flex max-w-[440px] items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-[var(--shadow-float)]"
          style={{ bottom: 'calc(var(--nav-gap) + 104px)' }}
          initial={{ y: 40, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={spring}
        >
          <span className="flex-1 text-[15px] font-bold">{toast.text}</span>
          {toast.action && (
            <button
              className="rounded-xl bg-white/15 px-3 py-1.5 text-[15px] font-extrabold text-meadow"
              onClick={() => {
                toast.action?.run()
                setToast(null)
              }}
            >
              {toast.action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
  return { node, show: (text: string, action?: { label: string; run: () => void }) => setToast({ id: Date.now(), text, action }) }
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between px-1">
      <h2 className="text-[20px] font-black tracking-tight">{children}</h2>
      {right}
    </div>
  )
}
