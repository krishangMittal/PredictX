# PredictX - Autonomous Builder Context

## Quick Start
- Run: `npm run dev` (localhost:3000)
- DB: SQLite via Prisma (`npx prisma studio` to inspect)
- Build: `npm run build` to verify no errors

## Key Files (read these, not everything)
- `prisma/schema.prisma` - database schema
- `src/lib/store.ts` - Zustand client state
- `src/lib/trading-engine.ts` - AI trading strategies
- `src/app/api/trade/route.ts` - trade execution API
- `src/app/api/simulate/route.ts` - price simulation

## Architecture
- Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- Prisma + SQLite (better-sqlite3 adapter)
- Zustand for client state
- All data simulated, no external APIs

## DO NOT re-read every file each session
1. Read THIS file + progress.md + ai-journal/latest-state.json
2. Only read source files you need to MODIFY
3. Keep tool calls minimal - you know the codebase structure
