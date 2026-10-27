import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { AddSheet } from './components/AddSheet'
import { BudgetSheet, ReviewSheet } from './components/Budgets'
import { GoalSheet } from './components/Goals'
import { VaultSheet } from './components/Vault'
import { MonthCloseSheet } from './components/MonthClose'
import { Celebration } from './components/Celebration'
import { BottomNav, type Tab } from './components/Nav'
import { Penny } from './components/Penny'
import { useToast } from './components/ui'
import type { Entry } from './db/repo'
import type { Budget } from './lib/budgets'
import type { Goal } from './lib/goals'
import type { Kind } from './lib/buckets'
import type { Source } from './lib/month'

type Start = { kind: Kind; amount?: number; source?: Source }
import { Activity } from './screens/Activity'
import { Barn } from './screens/Barn'
import { Home } from './screens/Home'
import { Insights } from './screens/Insights'
import { Onboarding } from './screens/Onboarding'
import { useStore } from './store'

const ORDER: Tab[] = ['home', 'activity', 'insights', 'barn']

export default function App() {
  const { ready, settings, streak, restore, reviews, close, celebration } = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [dir, setDir] = useState(0)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [startWith, setStartWith] = useState<Start | null>(null)
  const [vaultOpen, setVaultOpen] = useState(false)
  const [budget, setBudget] = useState<{ open: boolean; value: Budget | null }>({ open: false, value: null })
  const [goal, setGoal] = useState<{ open: boolean; value: Goal | null }>({ open: false, value: null })
  const [reviewHidden, setReviewHidden] = useState(false)
  const [closeHidden, setCloseHidden] = useState(false)
  const toast = useToast()
  const scroller = useRef<HTMLDivElement>(null)

  const go = (t: Tab) => {
    if (t === tab) return scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setDir(ORDER.indexOf(t) > ORDER.indexOf(tab) ? 1 : -1)
    setTab(t)
  }

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [tab])

  if (!ready) return <Splash />
  if (!settings.onboarded) return <Onboarding />

  const openEdit = (e: Entry) => {
    setEditing(e)
    setAdding(true)
  }
  /** Open the log sheet, optionally already on a kind (and amount). */
  const openAdd = (start: Start | null = null) => {
    setEditing(null)
    setStartWith(start)
    setAdding(true)
  }
  const onDeleted = (e: Entry) => toast.show('Entry deleted', { label: 'Undo', run: () => restore(e) })

  return (
    <div className="mx-auto h-full max-w-[480px]">
      <div ref={scroller} className="h-full overflow-x-hidden overflow-y-auto">
        {/* Enter-only transition: exit animations can stall when a screen holds a layoutId pill. */}
        <motion.main
          key={tab}
          initial={dir ? { opacity: 0, x: dir * 28 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        >
          {tab === 'home' && (
            <Home
              onAdd={() => openAdd()}
              onEdit={openEdit}
              onSeeAll={() => go('activity')}
              onBarn={() => go('barn')}
              onBudget={(b) => setBudget({ open: true, value: b })}
              onGoal={(g) => setGoal({ open: true, value: g })}
              onVault={() => setVaultOpen(true)}
              onLog={(kind, amount, source) => openAdd({ kind, amount, source })}
            />
          )}
          {tab === 'activity' && <Activity onEdit={openEdit} onAdd={() => openAdd()} />}
          {tab === 'insights' && <Insights />}
          {tab === 'barn' && <Barn toast={(t) => toast.show(t)} />}
        </motion.main>
      </div>
      <BottomNav tab={tab} onTab={go} onAdd={() => openAdd()} pulse={!streak.loggedToday} />
      <AddSheet
        open={adding}
        editing={editing}
        start={startWith}
        onClose={() => {
          setAdding(false)
          setTimeout(() => (setEditing(null), setStartWith(null)), 300)
        }}
        onDeleted={onDeleted}
      />
      <BudgetSheet open={budget.open} budget={budget.value} onClose={() => setBudget((b) => ({ ...b, open: false }))} />
      <VaultSheet open={vaultOpen} onClose={() => setVaultOpen(false)} />
      <GoalSheet open={goal.open} goal={goal.value} onClose={() => setGoal((g) => ({ ...g, open: false }))} />
      {/* On the Meadow, when nothing else is on screen: wrap up last month first, then ended budget periods one at a time. */}
      <MonthCloseSheet open={tab === 'home' && !closeHidden && !adding && !budget.open && !goal.open && !vaultOpen && !celebration} onClose={() => setCloseHidden(true)} />
      <ReviewSheet
        open={tab === 'home' && (!close || closeHidden) && !reviewHidden && !adding && !budget.open && !goal.open && !vaultOpen && !celebration}
        review={reviews[0]}
        onClose={() => setReviewHidden(true)}
      />
      <Celebration />
      {toast.node}
    </div>
  )
}

function Splash() {
  return (
    <div className="grid h-full place-items-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Penny width={140} mood="happy" />
      </motion.div>
    </div>
  )
}
