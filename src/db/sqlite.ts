// On-device SQLite (sql.js / WASM). The whole database file lives in IndexedDB on the
// phone, so the app works offline and Vercel only serves static files.
import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { get, set } from 'idb-keyval'

const STORE_KEY = 'woolly.sqlite'

const MIGRATIONS: string[] = [
  `
  CREATE TABLE entries (
    id          TEXT PRIMARY KEY,
    kind        TEXT NOT NULL CHECK (kind IN ('income','expense','saving','investment','buffer')),
    amount      INTEGER NOT NULL CHECK (amount > 0),   -- minor units (cents)
    category    TEXT NOT NULL,
    note        TEXT NOT NULL DEFAULT '',
    date        TEXT NOT NULL,                          -- YYYY-MM-DD, when the money moved
    created_at  TEXT NOT NULL                           -- ISO timestamp, when it was logged
  );
  CREATE INDEX idx_entries_date ON entries (date);
  CREATE TABLE checkins (date TEXT PRIMARY KEY, created_at TEXT NOT NULL);
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE badges (id TEXT PRIMARY KEY, unlocked_at TEXT NOT NULL);
  `,
]

let db: Database | null = null
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null

function migrate(d: Database) {
  const version = Number(d.exec('PRAGMA user_version')[0]?.values[0][0] ?? 0)
  for (let v = version; v < MIGRATIONS.length; v++) {
    d.exec('BEGIN')
    d.exec(MIGRATIONS[v])
    d.exec(`PRAGMA user_version = ${v + 1}`)
    d.exec('COMMIT')
  }
}

let opening: Promise<Database> | null = null

export function openDb(): Promise<Database> {
  return (opening ??= open())
}

async function open(): Promise<Database> {
  SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const saved = await get<Uint8Array>(STORE_KEY)
  const d = saved ? new SQL.Database(saved) : new SQL.Database()
  migrate(d)
  db = d
  await persist()
  // Ask Safari not to evict our data under storage pressure.
  navigator.storage?.persist?.().catch(() => {})
  return d
}

function requireDb() {
  if (!db) throw new Error('Database not opened')
  return db
}

export async function persist() {
  await set(STORE_KEY, requireDb().export())
}

export function all<T>(sql: string, params: SqlValue[] = []): T[] {
  const stmt = requireDb().prepare(sql)
  stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as T)
  stmt.free()
  return rows
}

export async function run(sql: string, params: SqlValue[] = []) {
  requireDb().run(sql, params)
  await persist()
}

export async function runMany(statements: [string, SqlValue[]][]) {
  const d = requireDb()
  d.exec('BEGIN')
  try {
    for (const [sql, params] of statements) d.run(sql, params)
    d.exec('COMMIT')
  } catch (e) {
    d.exec('ROLLBACK')
    throw e
  }
  await persist()
}

/** Raw .sqlite file — opens in the sqlite3 CLI or any SQLite browser. */
export function exportFile(): Uint8Array {
  return requireDb().export()
}

export async function importFile(bytes: Uint8Array) {
  if (!SQL) throw new Error('Database not opened')
  const next = new SQL.Database(bytes)
  const ok = next.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='entries'").length > 0
  if (!ok) {
    next.close()
    throw new Error("That file doesn't look like a Woolly backup.")
  }
  migrate(next)
  db?.close()
  db = next
  await persist()
}

export async function wipe() {
  if (!SQL) throw new Error('Database not opened')
  db?.close()
  db = new SQL.Database()
  migrate(db)
  await persist()
}
