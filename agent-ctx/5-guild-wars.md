# Task 5 - Guild Wars System

## Agent: Super Z (Main)

## Summary
Built the complete Guild Wars system for the Echoes of Lumora PWA game.

## Files Created
- `src/app/api/guild-wars/route.ts` — Full Guild Wars API (GET + POST with declare/contribute/surrender actions)
- `src/components/community/GuildWarsPanel.tsx` — War-themed panel with active war, declare war, contribute spirits, surrender, and war results views

## Files Modified
- `prisma/schema.prisma` — Added `treasury` field to Guild model
- `src/components/community/GuildPanel.tsx` — Added Info/Members/War sub-tab navigation
- `src/app/api/spin/route.ts` — Added guild war contribution tracking (auto-increments war scores during active wars)
- `src/app/api/guild/route.ts` — Added `treasury` to guild response
- `messages/es.json` — Added `guildWar` namespace (18 keys) + `community.warTab`
- `messages/en.json` — Added `guildWar` namespace (18 keys) + `community.warTab`
- `worklog.md` — Appended Phase 6 Guild Wars work log

## Key Design Decisions
- Used SpinLog aggregation for computing top contributors (avoids needing a separate contribution model)
- War scores auto-increment from spin results during active wars
- Spirit sacrifice for war points uses rarity × level formula
- War resolution is lazy (checked on API calls, not cron-based)
- Added `treasury` field to Guild model for war declaration costs and reward distribution
