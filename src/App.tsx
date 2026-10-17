import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { AddSheet } from './components/AddSheet'
import { Celebration } from './components/Celebration'
import { BottomNav, type Tab } from './components/Nav'
import { Penny } from './components/Penny'
import { useToast } from './components/ui'
import type { Entry } from './db/repo'
import { Activity } from './screens/Activity'
import { Barn } from './screens/Barn'
import { Home } from './screens/Home'
import { Insights } from './screens/Insights'
import { Onboarding } from './screens/Onboarding'
import { useStore } from './store'

const ORDER: Tab[] = ['home', 'activity', 'insights', 'barn']

export default function App() {
  const { ready, settings, streak, restore } = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [dir, setDir] = useState(0)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)
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
          {tab === 'home' && <Home onAdd={() => setAdding(true)} onEdit={openEdit} onSeeAll={() => go('activity')} onBarn={() => go('barn')} />}
          {tab === 'activity' && <Activity onEdit={openEdit} onAdd={() => setAdding(true)} />}
          {tab === 'insights' && <Insights />}
          {tab === 'barn' && <Barn toast={(t) => toast.show(t)} />}
        </motion.main>
      </div>
      <BottomNav tab={tab} onTab={go} onAdd={() => (setEditing(null), setAdding(true))} pulse={!streak.loggedToday} />
      <AddSheet
        open={adding}
        editing={editing}
        onClose={() => {
          setAdding(false)
          setTimeout(() => setEditing(null), 300)
        }}
        onDeleted={onDeleted}
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
