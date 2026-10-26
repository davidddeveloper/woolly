/** One line of a note that ends (or starts) with an amount, e.g. "Uber to work 45". */
export interface BreakdownItem {
  label: string
  /** Major units, as typed. */
  amount: number
}

// Commas separate items, except the thousands comma in "1,450".
const SPLIT = /\n|;|,(?!\d{3}(?!\d))/
const LAST_NUMBER = /(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?!.*\d)/

/** Reads "Trotro 20, Uber 45" or one item per line into items with amounts. */
export function parseBreakdown(note: string): { items: BreakdownItem[]; total: number } {
  const items: BreakdownItem[] = []
  for (const raw of note.split(SPLIT)) {
    const part = raw.trim()
    const m = part.match(LAST_NUMBER)
    if (!m) continue
    const amount = Number(m[1].replace(/,/g, '') + (m[2] ?? ''))
    // Drop the amount plus any currency sign or separator left hanging: "Uber ₵45" → "Uber".
    const label = part.replace(m[0], '').replace(/[^\p{L}\p{N})]+$/u, '').replace(/^[^\p{L}\p{N}(]+/u, '').trim() || 'Item'
    if (amount > 0) items.push({ label, amount })
  }
  return { items, total: items.reduce((s, x) => s + x.amount, 0) }
}

/** What to show as a row's title and subtitle for an entry note. */
export function noteSummary(note: string) {
  const { items } = parseBreakdown(note)
  if (items.length >= 2) return { title: null, detail: `🧾 ${items.map((x) => x.label).join(' · ')}` }
  const first = note.split('\n')[0].trim()
  return { title: first || null, detail: null }
}
