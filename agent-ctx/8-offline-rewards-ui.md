# Task 8 - Offline Rewards UI

## Summary
Built the complete Offline Rewards system for Echoes of Lumora, including API enhancement, animated dialog component, Zustand store integration, and i18n support.

## Files Modified
1. `prisma/schema.prisma` - Added `lastLoginAt` field to PlayerProfile
2. `src/app/api/offline-rewards/route.ts` - Complete rewrite with Lumora's Gift bonus
3. `src/lib/store.ts` - Added offlineRewardsClaimed flag and setter
4. `messages/es.json` - Added offlineRewards i18n namespace (14 keys)
5. `messages/en.json` - Added offlineRewards i18n namespace (14 keys)
6. `src/app/[locale]/page.tsx` - Added OfflineRewardsDialog integration

## Files Created
1. `src/components/home/OfflineRewardsDialog.tsx` - Beautiful welcome-back dialog with Framer Motion animations

## Key Design Decisions
- Used `lastLoginAt` (from PlayerProfile) instead of `sanctuary.lastCollectAt` for offline time tracking
- When no rewards available (< 5 min offline), GET handler updates `lastLoginAt` to prevent indefinite timer growth
- Lumora's Gift: 40% spirit (uncommon/rare), 60% bonus lumens when offline > 4 hours
- Energy regen: 1 per 5 minutes, consistent with existing spin engine
- Idle lumens: base sanctuary + placed spirits, capped at 8h, consistent with sanctuary collection
- Dialog cannot be dismissed without claiming (no close button)
- Only shown once per session via Zustand `offlineRewardsClaimed` flag
