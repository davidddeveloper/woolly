import { motion } from 'motion/react'
import { Download, Lock, Share, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Penny } from '../components/Penny'
import { Outfit } from '../components/Outfits'
import { RepeatingCard } from '../components/Recurring'
import { Card, SectionTitle, spring } from '../components/ui'
import { importFile, wipe } from '../db/sqlite'
import { shareBackup } from '../lib/backup'
import { CURRENCIES } from '../lib/format'
import { BADGES, LEVELS, OUTFITS, pennyMood, xpForLevel } from '../lib/game'
import { BUCKETS } from '../lib/buckets'
import { useStore } from '../store'

export function Barn({ toast }: { toast: (t: string) => void }) {
  const store = useStore()
  const { settings, level, xp, streak, entries, badges, saveSettings, reload } = store
  const [jump, setJump] = useState(0)
  const [version, setVersion] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone)

  const wear = (id: string, need: number) => {
    if (level.level < need) return toast(`Reach level ${need} (${LEVELS[need - 1]}) to unlock`)
    saveSettings({ outfit: id })
    setJump((j) => j + 1)
  }

  const backup = shareBackup

  const restore = async (f: File | undefined) => {
    if (!f) return
    if (!confirm('Replace everything in Woolly with this backup?')) return
    try {
      await importFile(new Uint8Array(await f.arrayBuffer()))
      reload()
      setVersion((v) => v + 1)
      toast('Backup restored 🐑')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const erase = async () => {
    if (!confirm('Erase ALL entries, badges and settings? This cannot be undone.')) return
    await wipe()
    reload()
  }

  return (
    <div className="pb-nav">
      <header className="px-5 pt-safe">
        <h1 className="flex h-12 items-center text-[28px] font-black tracking-tight">Barn</h1>
      </header>

      <div className="flex flex-col gap-4 px-4">
        {/* level hero */}
        <Card className="relative overflow-hidden">
          <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-[#FFE3A8] opacity-70 blur-2xl" />
          <div className="relative flex items-end gap-3">
            <Penny width={120} mood={pennyMood(streak)} outfit={settings.outfit} jump={jump} />
            <div className="flex-1 pb-2">
              <span className="text-[13px] font-extrabold tracking-wider text-income uppercase">Level {level.level}</span>
              <h2 className="text-[20px] leading-tight font-black">{level.title}</h2>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#FFF1D6]">
                <motion.div
                  className="h-full rounded-full bg-income"
                  initial={{ width: 0 }}
                  animate={{ width: `${level.progress * 100}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                />
              </div>
              <p className="num mt-1.5 text-[13px] font-bold text-ink/50">
                {level.into} / {level.span} XP to level {level.level + 1}
              </p>
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {[
              ['🔥', streak.current, 'Streak'],
              ['🏔️', streak.longest, 'Best streak'],
              ['⭐', xp, 'Total XP'],
            ].map(([e, v, l]) => (
              <div key={l} className="rounded-2xl bg-cream px-3 py-2.5">
                <span className="num block text-[17px] font-black">
                  {e} {v}
                </span>
                <span className="text-[12px] font-bold text-ink/50">{l}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* wardrobe */}
        <Card>
          <SectionTitle>Penny's wardrobe</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {OUTFITS.map((o) => {
              const locked = level.level < o.level
              const on = settings.outfit === o.id
              return (
                <motion.button
                  key={o.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => wear(o.id, o.level)}
                  className="relative flex flex-col items-center gap-1 rounded-2xl p-1 pb-1.5"
                  style={{ background: on ? '#DEF6E8' : '#FFF8EE', boxShadow: on ? '0 0 0 2.5px #34C17B inset' : undefined }}
                >
                  <WardrobeThumb id={o.id} locked={locked} />
                  <span className="text-[11px] leading-tight font-extrabold whitespace-nowrap text-ink/60">{locked ? `Lv ${o.level}` : o.label}</span>
                  {locked && (
                    <span className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 shadow-[var(--shadow-card)]">
                      <Lock size={12} className="text-ink/50" strokeWidth={3} />
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </Card>

        {/* badges */}
        <Card>
          <SectionTitle right={<span className="text-[15px] font-black text-ink/45">{Object.keys(badges).length}/{BADGES.length}</span>}>Badges</SectionTitle>
          <div className="grid grid-cols-3 gap-x-2 gap-y-4">
            {BADGES.map((b, i) => {
              const got = !!badges[b.id]
              return (
                <motion.button
                  key={b.id}
                  onClick={() => toast(got ? `${b.name} — earned ${new Date(badges[b.id]).toLocaleDateString()}` : b.how)}
                  className="flex flex-col items-center gap-1.5 text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...spring, delay: i * 0.03 }}
                  whileTap={{ scale: 0.92 }}
                >
                  <span
                    className="grid h-16 w-16 place-items-center rounded-[22px] text-[30px]"
                    style={
                      got
                        ? { background: 'linear-gradient(160deg,#FFE7A6,#FFC774)', boxShadow: '0 4px 0 #E0A040, inset 0 2px 0 rgba(255,255,255,.6)' }
                        : { background: '#F3EDE3', filter: 'grayscale(1)', opacity: 0.45 }
                    }
                  >
                    {b.emoji}
                  </span>
                  <span className="text-[12px] leading-tight font-extrabold" style={{ color: got ? 'var(--color-ink)' : 'rgba(38,35,46,.4)' }}>
                    {b.name}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </Card>

        {/* settings */}
        <Card key={version} className="flex flex-col gap-4">
          <SectionTitle>Settings</SectionTitle>
          <Field label="Your name">
            <input
              defaultValue={settings.name}
              onBlur={(e) => saveSettings({ name: e.target.value.trim() })}
              className="h-11 w-full rounded-xl bg-cream px-3.5 font-bold outline-none focus:shadow-[0_0_0_2px_var(--color-ink)_inset]"
            />
          </Field>
          <Field label="Currency">
            <select
              value={settings.currency}
              onChange={(e) => saveSettings({ currency: e.target.value })}
              className="h-11 w-full rounded-xl bg-cream px-3 font-bold outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} — {c.name}
                </option>
              ))}
            </select>
            {entries.length > 0 && <p className="mt-1 text-[12px] font-bold text-ink/45">Changing currency relabels amounts; it doesn't convert them.</p>}
          </Field>
          <Field label="Monthly targets (% of income)">
            <div className="grid grid-cols-3 gap-2">
              {(['saving', 'investment', 'buffer'] as const).map((k) => (
                <label key={k} className="flex flex-col gap-1 rounded-xl px-3 py-2" style={{ background: BUCKETS[k].soft }}>
                  <span className="text-[12px] font-extrabold" style={{ color: BUCKETS[k].deep }}>
                    {BUCKETS[k].emoji} {BUCKETS[k].label}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    defaultValue={settings.targets[k]}
                    onBlur={(e) => saveSettings({ targets: { ...settings.targets, [k]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } })}
                    className="num w-full bg-transparent text-[20px] font-black outline-none"
                  />
                </label>
              ))}
            </div>
          </Field>
          <Field label="Family & giving — who do you support?">
            <input
              defaultValue={settings.family.join(', ')}
              onBlur={(e) => {
                const list = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                if (list.length) saveSettings({ family: [...new Set(list)] })
              }}
              className="h-11 w-full rounded-xl bg-cream px-3.5 font-bold outline-none focus:shadow-[0_0_0_2px_var(--color-ink)_inset]"
            />
            <p className="mt-1 text-[12px] font-bold text-ink/45">Comma separated. These become Buffer categories.</p>
          </Field>
        </Card>

        <RepeatingCard />

        {/* data */}
        <Card className="flex flex-col gap-2">
          <SectionTitle>Your data</SectionTitle>
          <p className="-mt-2 mb-1 text-[13px] font-semibold text-ink/55">
            Everything lives in a SQLite database on this phone — nothing is uploaded. Back it up now and then.
          </p>
          <button onClick={backup} className="chunky-soft flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold">
            {'canShare' in navigator ? <Share size={18} strokeWidth={2.75} /> : <Download size={18} strokeWidth={2.75} />} Back up (.sqlite)
          </button>
          <button onClick={() => fileRef.current?.click()} className="chunky-soft flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold">
            <Upload size={18} strokeWidth={2.75} /> Restore from backup
          </button>
          <input ref={fileRef} type="file" accept=".sqlite,.db,application/octet-stream,application/vnd.sqlite3" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
          <button onClick={erase} className="mt-1 h-10 text-[13px] font-extrabold text-expense">
            Erase everything
          </button>
        </Card>

        {!standalone && (
          <Card className="flex items-center gap-3 bg-meadow-soft">
            <span className="text-[32px]">📲</span>
            <p className="text-[13px] font-bold text-ink/70">
              Install Woolly: in Safari tap <b>Share</b> → <b>Add to Home Screen</b>. It'll open full-screen and work offline.
            </p>
          </Card>
        )}

        <p className="pb-2 text-center text-[12px] font-bold text-ink/35">
          Woolly v1 · {entries.length} entries · next level at {xpForLevel(level.level + 1)} XP
        </p>
      </div>
    </div>
  )
}

/** Crop windows [x, y, size] in the render's pixel space, framing Penny's head plus the item. */
const THUMB_CROP: Record<string, [number, number, number]> = {
  scarf: [80, 40, 720],
  bowtie: [80, 40, 720],
  beanie: [100, -200, 720],
  crown: [100, -150, 700],
  party: [80, -290, 800],
}

/** Penny wearing an item, so you see the look before you pick it. */
function WardrobeThumb({ id, locked }: { id: string; locked: boolean }) {
  const [x, y, size] = THUMB_CROP[id] ?? [110, -60, 680]
  return (
    <span className="relative block aspect-square w-full overflow-hidden rounded-xl" style={{ filter: locked ? 'grayscale(1) opacity(.4)' : undefined }}>
      <span className="absolute block" style={{ width: `${(810 / size) * 100}%`, aspectRatio: '810 / 1053', left: `${(-x / size) * 100}%`, top: `${(-y / size) * 100}%` }}>
        <img src="/penny.webp" alt="" draggable={false} className="absolute inset-0 h-full w-full" />
        <Outfit id={id} />
      </span>
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-extrabold text-ink/55">{label}</span>
      {children}
    </div>
  )
}
