# Woolly 🐑

A gamified personal finance tracker PWA. Penny the sheep cheers you on as you log
**income, expenses, savings, investments and buffer (generosity to family)**.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN for phone testing)
npm run build      # type-check + production build into dist/
```

## Deploy to Vercel

Push the repo and import it in Vercel (framework: Vite), or run `npx vercel`.
`vercel.json` already sets the build, SPA rewrites and service-worker headers.
On iPhone: open the URL in Safari → Share → **Add to Home Screen**.

## Data

SQLite runs **in the browser** (sql.js/WASM) and the database file is saved in IndexedDB
on the device. Nothing is sent to a server, and the app works offline. Barn → *Back up (.sqlite)*
exports a real SQLite file you can open with `sqlite3`; *Restore* loads one back.

Schema: `src/db/sqlite.ts` (append to `MIGRATIONS` to change it).

## Map

- `src/lib/buckets.ts`: the five buckets, colours, categories
- `src/lib/game.ts`: streaks, XP/levels, badges, wardrobe, Penny's moods and lines
- `src/components/Penny.tsx`: mascot (blink, idle, jump, mood effects, outfits)
- `src/components/AddSheet.tsx`: logging flow · `Celebration.tsx`: reward moments
- `src/screens/*`: Meadow (home), Activity, Insights, Barn, Onboarding
- `scripts/make-icons.mjs`: regenerates icons/mascot from `assets-src/`
