# Phase 6: World Tree Progression System

**Task ID:** 6
**Agent:** Main Agent

## Work Completed

### 1. Created `/api/world-tree/route.ts`
- **GET** endpoint: Returns detailed world tree info
  - Tree level and XP progress to next level
  - Total global contributions per element (fire, water, dream, nature, star)
  - Dominant element (highest contributions)
  - Milestones list (level 5, 6, 10, 11, 15, 16, 20, 21)
  - Global buffs active based on tree level
  - Community goal: spins remaining for next level
  - Tree level formula: each level requires `level * 10000` total spins
  - Auto-level-up check on GET
- **POST** endpoint: Two actions
  - `contribute`: Player donates lumens to boost element counter (deducts lumens, adds to element total, grants XP)
  - `claimBuff`: Returns current passive buffs (no-op, buffs are automatic)
- Buff tiers:
  - Level 1-5: No buff
  - Level 6-10: +5% lumens from spins
  - Level 11-15: +10% lumens, +1 energy regen
  - Level 16-20: +15% lumens, +2 energy regen, rare spirit chance +5%
  - Level 21+: +20% lumens, +3 energy regen, rare spirit chance +10%, bonus game chance +5%

### 2. Created `WorldTreeWidget.tsx`
- Large central tree illustration (emoji-based: 🌱→🌿→🌲→🌳 based on level)
- Tree grows visually based on level (size, glow intensity, sparkle effects)
- 5 element orbs orbiting the tree, sized by contribution amount
- Pulsing glow effect on the dominant element
- Level badge with XP progress bar
- Active buff icons displayed below the tree
- "Contribute" button opening a dialog
- Contribute dialog with:
  - Element selector (5 buttons with element colors/icons)
  - Amount input (preset: 100, 500, 1000, or custom)
  - Preview of contribution effect
  - Confirm button with lumens balance display
- Animated particles falling from the tree (✨🍃) at level 3+
- Auto-refreshes every 30 seconds
- Framer Motion animations throughout

### 3. Updated Home Page
- Replaced static World Tree section with `<WorldTreeWidget />`
- Kept TreePine import for sanctuary widget

### 4. Updated Spin Engine
- Fetches WorldState tree level before each spin
- Applies lumens multiplier based on tree level
- Reduces energy cost based on energy regen bonus
- Boosts spirit rarity when rare spirit bonus triggers
- Can trigger bonus game when bonus chance applies
- Returns `worldBuff` object in spin result with:
  - lumensMultiplier, energyRegenBonus, rareSpiritBonus, bonusGameChance
  - source string (e.g., "World Tree Lv.12")
  - buffedPayout value

### 5. Updated i18n
- Added `worldTree` namespace with 18 keys in both es.json and en.json
- Keys: title, level, progress, spinsToNext, dominantElement, contribute, contributeTo, contributeAmount, contributePreview, buffs, noBuffs, lumensBonus, energyRegen, rareSpiritBonus, bonusChance, elements.*, totalContributions, globalGoal, communityEffort

## Test Results
- ESLint: Passes (only pre-existing errors in OfflineRewardsDialog.tsx and useChat.ts)
- Home page compiles and renders successfully
- `/api/world-tree` GET returns correct data structure
- `/api/world-tree` POST requires authentication (correct)
- Dev server running with no errors
