---
Task ID: error-handling-fix
Agent: Code Review Fix
Task: Replace silent error handling (empty catch blocks, console.error-only) with proper user-facing error states

Work Log:
- Added Toaster component from sonner to the locale layout (src/app/[locale]/layout.tsx) so toast notifications work app-wide
- Fixed src/components/game/SlotMachine.tsx:
  - Replaced empty catch {} in player data fetch with console.error + toast.error
  - Added toast.error in the spin connection error catch block
- Fixed src/components/game/MergePanel.tsx:
  - Replaced two empty catch {} blocks (fetchSpirits, handleMerge) with console.error + toast.error
- Fixed src/components/sanctuary/LumensCollector.tsx:
  - Replaced empty catch {} in handleCollect with console.error + toast.error
- Fixed src/components/community/FriendsPanel.tsx:
  - Replaced 5 empty catch {} blocks (fetchFriends, handleSearch, handleSendRequest, handleAcceptRequest, handleRejectRequest, handleRemoveFriend) with console.error + toast.error
  - Added error state with retry button for fetch failure display
- Fixed src/components/shop/ShopPanel.tsx:
  - Replaced 2 empty catch {} blocks (fetchShop, fetchLumens) with console.error + toast.error
  - Added toast.error to handlePurchase catch
  - Added error state with retry button for shop loading failure
- Fixed src/components/progression/AchievementsPanel.tsx:
  - Replaced 2 empty catch {} blocks (fetchAchievements, handleClaim) with console.error + toast.error
  - Added error state with retry button for achievements loading failure
- Fixed src/components/progression/DailyChallengesPanel.tsx:
  - Replaced 2 empty catch {} blocks (fetchChallenges, handleClaim) with console.error + toast.error
  - Added error state with retry button for daily challenges loading failure
- Fixed src/components/home/WorldTreeWidget.tsx:
  - Replaced empty catch {} in fetchTreeData with console.error + toast.error + error state
  - Added console.error + toast.error to handleContribute catch
  - Added error state with retry button for world tree loading failure
- Fixed src/components/blessing/BlessingWidget.tsx:
  - Replaced 2 empty catch {} blocks (fetchBlessing, handleClaim) with console.error + toast.error
  - Added error state with retry button for blessing loading failure
- Fixed src/components/home/OfflineRewardsDialog.tsx:
  - Added toast.error to both console.error-only catch blocks (fetchRewards, handleClaim)
- Fixed src/hooks/usePlayer.ts:
  - Added console.error + toast.error in the fetchPlayer catch block
- Fixed src/hooks/useChat.ts:
  - Added toast.error to both console.error-only catch blocks (fetchMessages, send)
  - Added setError for fetch failure
- Fixed src/app/[locale]/page.tsx:
  - Replaced empty catch {} in EventWidget fetchEvents with console.error + toast.error
- Fixed src/app/[locale]/sanctuary/page.tsx:
  - Replaced 3 empty catch {} blocks (handleCollect, handleRemoveSpirit, handleRename) with console.error + toast.error
- Verified zero remaining empty catch blocks in src/ directory
- ESLint passes with no errors
- Dev server running successfully with no compilation errors

Stage Summary:
- All silent error handling replaced with user-facing error states
- 18 files modified across components, hooks, and pages
- Toast notifications (sonner) added to all error catch blocks
- Error state with retry buttons added to 6 key components (FriendsPanel, ShopPanel, AchievementsPanel, DailyChallengesPanel, WorldTreeWidget, BlessingWidget)
- Toaster component added to app layout for toast support
- Zero remaining empty catch blocks in the codebase
