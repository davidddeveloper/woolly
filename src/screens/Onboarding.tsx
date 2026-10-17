import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Penny } from '../components/Penny'
import { Chunky, spring } from '../components/ui'
import { BUCKETS, KINDS } from '../lib/buckets'
import { CURRENCIES } from '../lib/format'
import { useStore } from '../store'

function guessCurrency() {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region
    const map: Record<string, string> = { US: 'USD', GB: 'GBP', NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', SL: 'SLE', CA: 'CAD', IN: 'INR', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR' }
    return (region && map[region]) || 'USD'
  } catch {
    return 'USD'
  }
}

export function Onboarding() {
  const { saveSettings } = useStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState(guessCurrency)
  const [jump, setJump] = useState(0)
  const steps = 4

  const next = () => {
    setJump((j) => j + 1)
    if (step < steps - 1) setStep(step + 1)
    else saveSettings({ onboarded: true, name: name.trim(), currency })
  }

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col px-5" style={{ paddingTop: 'calc(var(--safe-top) + 12px)', paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}>
      <div className="flex h-12 items-center gap-3">
        <button aria-label="Back" onClick={() => setStep(Math.max(0, step - 1))} className="grid h-10 w-10 place-items-center rounded-full" style={{ visibility: step ? 'visible' : 'hidden' }}>
          <ArrowLeft size={22} strokeWidth={2.75} />
        </button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-ink/[.08]">
          <motion.div className="relative h-full rounded-full bg-meadow" animate={{ width: `${((step + 1) / steps) * 100}%` }} transition={spring}>
            <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/40" />
          </motion.div>
        </div>
        <div className="w-10" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={spring}
        >
          {step === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <motion.div
                className="absolute h-72 w-72 rounded-full"
                style={{ background: 'radial-gradient(closest-side, #FFE3A8, transparent)' }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div initial={{ y: 120, scale: 0.6 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}>
                <Penny width={220} mood="excited" jump={jump} />
              </motion.div>
              <motion.h1 className="relative mt-8 text-[34px] leading-tight font-black tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                Baa! I'm Penny.
              </motion.h1>
              <motion.p className="relative mt-2 max-w-[300px] text-[17px] font-semibold text-ink/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                Welcome to <b className="text-ink">Woolly</b>. I'll help you shepherd every coin — one tiny log a day.
              </motion.p>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-1 flex-col pt-8">
              <div className="flex items-end gap-3">
                <Penny width={96} mood="happy" shadow={false} />
                <div className="mb-8 rounded-3xl rounded-bl-md bg-white px-4 py-3 text-[17px] font-extrabold shadow-[var(--shadow-card)]">What should I call you?</div>
              </div>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && next()}
                placeholder="Your name"
                maxLength={24}
                className="mt-8 h-16 w-full rounded-2xl bg-white px-5 text-[20px] font-extrabold outline-none shadow-[0_0_0_2px_var(--color-line)_inset] focus:shadow-[0_0_0_2.5px_var(--color-meadow)_inset]"
                style={{ fontSize: 20 }}
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex min-h-0 flex-1 flex-col pt-8">
              <div className="flex items-end gap-3">
                <Penny width={96} mood="happy" shadow={false} />
                <div className="mb-8 rounded-3xl rounded-bl-md bg-white px-4 py-3 text-[17px] font-extrabold shadow-[var(--shadow-card)]">
                  {name.trim() ? `Nice to meet you, ${name.trim()}! ` : ''}Which currency do you use?
                </div>
              </div>
              <div className="no-scrollbar mt-6 grid min-h-0 grid-cols-2 gap-2 overflow-y-auto pb-2">
                {CURRENCIES.map((c, i) => {
                  const on = currency === c.code
                  return (
                    <motion.button
                      key={c.code}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: i * 0.025 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrency(c.code)}
                      className="flex h-16 items-center gap-2.5 rounded-2xl px-3 text-left"
                      style={{
                        background: on ? '#DEF6E8' : '#fff',
                        boxShadow: on ? '0 0 0 2.5px #34C17B inset, 0 3px 0 #1F9A5C' : '0 0 0 2px var(--color-line) inset, 0 3px 0 var(--color-line)',
                      }}
                    >
                      <span className="text-[24px]">{c.flag}</span>
                      <span className="flex flex-col leading-tight">
                        <span className="text-[15px] font-black">{c.code}</span>
                        <span className="text-[12px] font-bold text-ink/50">{c.name}</span>
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex min-h-0 flex-1 flex-col pt-6">
              <h2 className="text-[28px] leading-tight font-black tracking-tight">Five buckets. Every coin has a home.</h2>
              <p className="mt-2 text-[15px] font-semibold text-ink/60">Some "expenses" are really investments — and generosity deserves its own place.</p>
              <div className="no-scrollbar mt-5 flex min-h-0 flex-col gap-2 overflow-y-auto">
                {KINDS.map((k, i) => (
                  <motion.div
                    key={k}
                    className="flex items-center gap-3 rounded-2xl p-3"
                    style={{ background: BUCKETS[k].soft }}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: 0.1 + i * 0.09 }}
                  >
                    <motion.span className="text-[30px]" animate={{ rotate: [0, -12, 12, 0] }} transition={{ delay: 0.5 + i * 0.09, duration: 0.6 }}>
                      {BUCKETS[k].emoji}
                    </motion.span>
                    <span className="flex flex-col">
                      <span className="text-[17px] font-black" style={{ color: BUCKETS[k].deep }}>
                        {k === 'buffer' ? 'Buffer · Family & giving' : BUCKETS[k].label}
                      </span>
                      <span className="text-[13px] font-bold text-ink/55">{BUCKETS[k].blurb}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="pt-4">
        <Chunky onClick={next} disabled={step === 1 && !name.trim()}>
          {step === 0 ? 'Hi Penny!' : step === steps - 1 ? "Let's go" : 'Continue'}
        </Chunky>
      </div>
    </div>
  )
}
