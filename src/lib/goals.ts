import type { Entry } from '../db/repo'
import { dayKey, parseDay } from './format'

/** Something to save up for. Saving entries whose category is the goal's name count toward it. */
export interface Goal {
  id: string
  name: string
  emoji: string
  target: number
  deadline: string | null
  created_at: string
  reached_at: string | null
}

export type GoalInput = Pick<Goal, 'name' | 'emoji' | 'target' | 'deadline'>

export const GOAL_EMOJI = ['🎯', '💻', '📱', '🏍️', '🚗', '✈️', '🏠', '🎓', '💍', '👶', '🛟', '🎸']

export function goalSaved(g: Pick<Goal, 'name'>, entries: Entry[]) {
  let s = 0
  for (const e of entries) if (e.kind === 'saving' && e.category === g.name) s += e.amount
  return s
}

export interface GoalStatus {
  goal: Goal
  saved: number
  progress: number
  /** Whole weeks until the deadline (at least 1), or null with no deadline. */
  weeksLeft: number | null
  /** Saving needed per week to hit the deadline. */
  perWeek: number | null
  late: boolean
}

export function goalStatus(goal: Goal, entries: Entry[], today = dayKey()): GoalStatus {
  const saved = goalSaved(goal, entries)
  const left = Math.max(0, goal.target - saved)
  if (!goal.deadline) return { goal, saved, progress: saved / goal.target, weeksLeft: null, perWeek: null, late: false }
  const days = Math.round((parseDay(goal.deadline).getTime() - parseDay(today).getTime()) / 86_400_000)
  const weeksLeft = Math.max(1, Math.ceil(days / 7))
  return { goal, saved, progress: saved / goal.target, weeksLeft, perWeek: left / weeksLeft, late: days < 0 && left > 0 }
}
