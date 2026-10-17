import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { openDb } from './db/sqlite'
import * as repo from './db/repo'
import type { Entry, EntryInput, Settings } from './db/repo'
import { activeDays, BADGES, earnedBadges, levelInfo, streakInfo, XP, type Badge } from './lib/game'
import type { Kind } from './lib/buckets'
import { dayKey } from './lib/format'

export interface Celebration {
  id: number
  kind: Kind | 'checkin'
  xp: number
  firstToday: boolean
  streak: number
  badges: Badge[]
  levelUp: { level: number; title: string } | null
}

interface Store {
  ready: boolean
  entries: Entry[]
  checkins: string[]
  badges: Record<string, string>
  settings: Settings
  days: Set<string>
  streak: ReturnType<typeof streakInfo>
  xp: number
  level: ReturnType<typeof levelInfo>
  celebration: Celebration | null
  dismissCelebration: () => void
  add: (e: EntryInput) => Promise<void>
  update: (id: string, e: EntryInput) => Promise<void>
  remove: (id: string) => Promise<Entry | undefined>
  restore: (e: Entry) => Promise<void>
  checkIn: () => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>
  reload: () => void
}

const Ctx = createContext<Store | null>(null)

function computeXp(entries: Entry[], days: Set<string>, badgeCount: number) {
  return entries.length * XP.entry + days.size * XP.activeDay + badgeCount * XP.badge
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [checkins, setCheckins] = useState<string[]>([])
  const [badges, setBadges] = useState<Record<string, string>>({})
  const [settings, setSettings] = useState<Settings>(repo.DEFAULT_SETTINGS)
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  const reload = useCallback(() => {
    setEntries(repo.loadEntries())
    setCheckins(repo.loadCheckins())
    setBadges(repo.loadBadges())
    setSettings(repo.loadSettings())
  }, [])

  useEffect(() => {
    openDb().then(() => {
      reload()
      setReady(true)
    })
  }, [reload])

  const days = useMemo(() => activeDays(entries, checkins), [entries, checkins])
  const streak = useMemo(() => streakInfo(days), [days])
  const xp = computeXp(entries, days, Object.keys(badges).length)
  const level = levelInfo(xp)

  /** After any write: unlock new badges and work out what to celebrate. */
  const afterWrite = useCallback(
    async (kind: Kind | 'checkin' | null) => {
      const beforeDays = days
      const beforeLevel = level.level
      const nextEntries = repo.loadEntries()
      const nextCheckins = repo.loadCheckins()
      const nextDays = activeDays(nextEntries, nextCheckins)
      const nextStreak = streakInfo(nextDays)
      const owned = repo.loadBadges()
      const fresh = earnedBadges(nextEntries, nextCheckins, nextStreak.longest).filter((id) => !owned[id])
      await repo.unlockBadges(fresh)
      reload()
      if (!kind) return
      const nextXp = computeXp(nextEntries, nextDays, Object.keys(owned).length + fresh.length)
      const nextLevel = levelInfo(nextXp)
      const firstToday = !beforeDays.has(dayKey()) && nextDays.has(dayKey())
      setCelebration({
        id: Date.now(),
        kind,
        xp: (kind === 'checkin' ? 0 : XP.entry) + (firstToday ? XP.activeDay : 0) + fresh.length * XP.badge,
        firstToday,
        streak: nextStreak.current,
        badges: BADGES.filter((b) => fresh.includes(b.id)),
        levelUp: nextLevel.level > beforeLevel ? { level: nextLevel.level, title: nextLevel.title } : null,
      })
    },
    [days, level.level, reload],
  )

  const value: Store = {
    ready,
    entries,
    checkins,
    badges,
    settings,
    days,
    streak,
    xp,
    level,
    celebration,
    dismissCelebration: () => setCelebration(null),
    add: async (e) => {
      await repo.addEntry(e)
      await afterWrite(e.kind)
    },
    update: async (id, e) => {
      await repo.updateEntry(id, e)
      await afterWrite(null)
    },
    remove: async (id) => {
      const found = entries.find((x) => x.id === id)
      await repo.deleteEntry(id)
      reload()
      return found
    },
    restore: async (e) => {
      await repo.restoreEntry(e)
      reload()
    },
    checkIn: async () => {
      await repo.checkInToday()
      await afterWrite('checkin')
    },
    saveSettings: async (patch) => {
      await repo.saveSettings(patch)
      setSettings(repo.loadSettings())
    },
    reload,
  }

  if (import.meta.env.DEV) (window as unknown as { __woolly: Store }).__woolly = value

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}
