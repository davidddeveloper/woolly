import { motion } from 'motion/react'
import { Check, Settings2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BUCKETS, type Kind } from '../lib/buckets'
import { currencySymbol, dayKey, money, monthKey, monthLabel, toMajor, toMinor } from '../lib/format'
import { daysLeftInMonth, promiseMonths, promiseStreak, vaultBalance, type PromiseMonth } from '../lib/savings'
import { useStore } from '../store'
import { Card, Chunky, CountUp, Sheet } from './ui'

const SAVE = BUCKETS.saving
const OUT = BUCKETS.withdrawal

/** Your savings in one place: the real balance, the monthly promise, and every dip into it. */
export function VaultCard({ onSettings, onLog }: { onSettings: () => void; onLog: (kind: Kind, amount?: number) => void }) {
  const { entries, settings } = useStore()
  const cur = settings.currency
  const { savingsStart: start, savingsPlan: plan } = settings
  const balance = useMemo(() => vaultBalance(entries, start), [entries, start])
  const months = useMemo(() => (plan ? promiseMonths(entries, plan) : []), [entries, plan])
  const now = months[months.length - 1]
  const streak = promiseStreak(months)
  const fresh = !start && !plan && !entries.some((e) => e.kind === 'saving' || e.kind === 'withdrawal')

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold tracking-wider text-ink/50 uppercase">Wool vault 🐷</span>
        <button aria-label="Savings settings" onClick={onSettings} className="grid h-9 w-9 place-items-center rounded-full bg-cream text-ink/60 active:bg-wool">
          <Settings2 size={17} strokeWidth={2.5} />
        </button>
      </div>

      {fresh ? (
        <div className="mt-2 flex flex-col gap-3">
          <p className="text-[15px] leading-snug font-bold text-ink/60">
            Already have savings in the bank? Add what's there now — it shows as your balance, <b className="text-ink">not</b> as this month's saving.
          </p>
          <button onClick={onSettings} className="chunky-soft h-12 rounded-2xl text-[15px] font-extrabold">
            Set my savings &amp; monthly promise
          </button>
        </div>
      ) : (
        <>
          <CountUp value={balance} currency={cur} className="mt-1 block text-[34px] leading-tight font-black" style={{ color: balance < 0 ? '#D9443A' : undefined }} />
          <p className="text-[13px] font-bold text-ink/45">
            in savings{start ? ` · started from ${money(start.amount, cur)}` : ''}
          </p>

          {plan && now ? (
            <div className="mt-4 rounded-2xl p-3" style={{ background: SAVE.soft }}>
              <div className="flex items-center justify-between gap-2">
                <span className="num text-[15px] font-black" style={{ color: SAVE.deep }}>
                  Promise: {money(plan.amount, cur)} a month
                </span>
                {streak > 0 && (
                  <span className="num shrink-0 rounded-full bg-white px-2.5 py-1 text-[12px] font-black text-flame">
                    🔥 {streak} month{streak === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <ThisMonth m={now} amount={plan.amount} currency={cur} />
              <MonthDots months={months} currency={cur} />
            </div>
          ) : (
            <button onClick={onSettings} className="mt-3 text-[13px] font-extrabold" style={{ color: SAVE.deep }}>
              + Make a monthly saving promise
            </button>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Chunky
              color={SAVE.color}
              deep={SAVE.deep}
              className="h-12! text-[15px]!"
              onClick={() => onLog('saving', plan && now && now.saved < plan.amount ? plan.amount - now.saved : undefined)}
            >
              🐷 Save
            </Chunky>
            <button onClick={() => onLog('withdrawal')} className="chunky-soft h-12 rounded-2xl text-[15px] font-extrabold tracking-wide uppercase" style={{ color: OUT.deep }}>
              🔓 Take out
            </button>
          </div>
        </>
      )}
    </Card>
  )
}

function ThisMonth({ m, amount, currency }: { m: PromiseMonth; amount: number; currency: string }) {
  const kept = m.saved >= amount
  const days = daysLeftInMonth()
  return (
    <div className="mt-2">
      <div className="h-2.5 overflow-hidden rounded-full bg-white/80">
        <motion.div
          className="h-full rounded-full"
          style={{ background: kept ? '#34C17B' : SAVE.color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(1, m.saved / amount) * 100}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <p className="num mt-1.5 text-[13px] font-bold text-ink/55">
        {kept ? (
          <span className="text-meadow-deep">✓ Kept this month — {money(m.saved, currency)} saved</span>
        ) : (
          <>
            {money(m.saved, currency)} saved · <b className="text-ink">{money(amount - m.saved, currency)} to go</b> · {days} day{days === 1 ? '' : 's'} left
          </>
        )}
      </p>
      {m.tapped > 0 && (
        <p className="num mt-0.5 text-[13px] font-bold" style={{ color: OUT.deep }}>
          🔓 Took out {money(m.tapped, currency)} this month
        </p>
      )}
    </div>
  )
}

const DOT: Record<PromiseMonth['state'], { bg: string; fg: string; ring?: string }> = {
  kept: { bg: SAVE.color, fg: '#fff' },
  partial: { bg: '#FFE3A8', fg: '#C97F06' },
  missed: { bg: '#FFE6E3', fg: '#D9443A' },
  open: { bg: 'transparent', fg: SAVE.deep, ring: `0 0 0 2.5px ${SAVE.color} inset` },
}

function MonthDots({ months, currency }: { months: PromiseMonth[]; currency: string }) {
  if (months.length < 2) return null
  return (
    <div className="mt-3 flex justify-between gap-1">
      {months.map((m) => {
        const d = DOT[m.state]
        return (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={`${monthLabel(m.month)}: saved ${money(m.saved, currency)}`}>
            <span className="grid h-8 w-8 place-items-center rounded-full text-[13px] font-black" style={{ background: d.bg, color: d.fg, boxShadow: d.ring }}>
              {m.state === 'kept' ? <Check size={16} strokeWidth={3.5} /> : m.state === 'missed' ? <X size={15} strokeWidth={3.5} /> : m.state === 'partial' ? '½' : ''}
            </span>
            <span className="text-[11px] font-extrabold text-ink/45">{monthLabel(m.month, 'short')}</span>
            {m.tapped > 0 && <span className="h-1.5 w-1.5 rounded-full" style={{ background: OUT.color }} title={`Took out ${money(m.tapped, currency)}`} />}
          </div>
        )
      })}
    </div>
  )
}

// ---------- settings sheet ----------

export function VaultSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Sheet open={open} onClose={onClose}>{open && <VaultForm onDone={onClose} />}</Sheet>
}

function VaultForm({ onDone }: { onDone: () => void }) {
  const { entries, settings, saveSettings } = useStore()
  const cur = settings.currency
  const { savingsStart: start, savingsPlan: plan } = settings
  const shown = vaultBalance(entries, start)
  const [balance, setBalance] = useState(start ? String(toMajor(start.amount, cur)) : '')
  const [promise, setPromise] = useState(plan ? String(toMajor(plan.amount, cur)) : '')
  const parse = (v: string) => toMinor(Number(v.replace(/,/g, '')) || 0, cur)

  const save = async () => {
    const b = parse(balance)
    const p = parse(promise)
    await saveSettings({
      // Re-anchor only when the number changes, so earlier logs stay counted the same way.
      savingsStart: balance.trim() === '' ? null : start && start.amount === b ? start : { amount: b, at: new Date().toISOString() },
      savingsPlan: p > 0 ? { amount: p, since: plan?.since ?? monthKey(dayKey()) } : null,
    })
    onDone()
  }

  return (
    <div className="no-scrollbar flex flex-col gap-5 overflow-y-auto px-5 pb-5">
      <h2 className="text-[28px] leading-tight font-black tracking-tight">Your savings</h2>

      <div>
        <Label>What's in your savings right now?</Label>
        <MoneyInput value={balance} onChange={setBalance} currency={cur} placeholder="0" />
        <p className="mt-2 text-[13px] leading-snug font-bold text-ink/50">
          Your real bank balance. It becomes the vault's starting point and <b>doesn't</b> count as this month's saving. Anything you log from now on — saving more or taking
          some out — moves it.
          {start && <> Right now the vault shows {money(shown, cur)}.</>}
        </p>
      </div>

      <div>
        <Label>Monthly promise (optional)</Label>
        <MoneyInput value={promise} onChange={setPromise} currency={cur} placeholder="e.g. 5,000" />
        <p className="mt-2 text-[13px] leading-snug font-bold text-ink/50">
          How much you'll put aside every month. Penny marks each month kept ✓ or missed, and keeps a streak.
        </p>
        {plan && (
          <button onClick={() => setPromise('')} className="mt-1 text-[13px] font-extrabold text-ink/45">
            Remove promise
          </button>
        )}
      </div>

      <Chunky color={SAVE.color} deep={SAVE.deep} onClick={save}>
        Save
      </Chunky>
    </div>
  )
}

function MoneyInput({ value, onChange, currency, placeholder }: { value: string; onChange: (v: string) => void; currency: string; placeholder: string }) {
  return (
    <label className="flex h-16 items-center gap-1 rounded-2xl bg-white px-4 shadow-[0_0_0_2px_var(--color-line)_inset] focus-within:shadow-[0_0_0_2.5px_var(--color-ink)_inset]">
      <span className="num text-[24px] font-black text-ink/40">{currencySymbol(currency)}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        inputMode="decimal"
        placeholder={placeholder}
        className="num w-full bg-transparent text-[28px] font-black outline-none"
        style={{ fontSize: 28 }}
      />
    </label>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-[13px] font-extrabold tracking-wide text-ink/50 uppercase">{children}</span>
}
