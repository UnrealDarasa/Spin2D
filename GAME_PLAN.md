# Spin2D – Game Plan

## Overview
A 2D spin-based mini-game prototype built with Cocos Creator 3.7.3 + TypeScript.

## Scenes
| Scene | Purpose |
|-------|---------|
| `MainMenu` | Title screen with a "Play" button that loads the Gameplay scene. |
| `Gameplay` | Core game: 3-reel slot animation, Spin/Reset buttons, balance & result display. |

## Component Architecture (director event bus)
```
Canvas
├── Background          (Node – UITransform only)
├── BalanceLabel        (Label – "Credits: 1000")
├── ReelContainer       (Node)
│   ├── Reel_0          (Node) ← ReelController
│   ├── Reel_1          (Node) ← ReelController
│   └── Reel_2          (Node) ← ReelController
├── ResultLabel         (Label – "Spin to play!")
├── SpinButton          (Button + Label "SPIN")
└── ResetButton         (Button + Label "RESET")

Managers (non-visual)
├── GameplaySceneManager ← creates above nodes, adds components below
├── GameManager          ← balance, odds, result (self-subscribes via director events)
├── UIManager            ← wires labels/buttons  (self-subscribes via director events)
└── SpinController       ← drives ReelControllers (self-subscribes via director events)
```

**No component imports or references another component.**  All communication:
```
UIManager ──emit──→  spin:requested / reset:requested
GameManager ─listen→ spin:requested → emit bet:placed / bet:rejected
SpinController ─listen→ bet:placed → animate → emit reels:stopped
GameManager ─listen→ reels:stopped → emit spin:result + balance:changed
UIManager ─listen→ balance:changed / spin:result / game:reset → update display
```

## Configuration
All tuneable values in `GameConfig.ts` (singleton). Supports:
- Local defaults
- `GameConfig.loadFromServer(url)` — remote JSON override
- `GameConfig.applyOverrides({...})` — local testing

## Game Logic
1. Player taps **SPIN** → UIManager emits `spin:requested`
2. GameManager hears `spin:requested`
   - If balance < betAmount → emits `bet:rejected`
   - Else → deducts credits, emits `balance:changed` + `bet:placed`
3. SpinController hears `bet:placed` → starts all 3 `ReelController.spinReel()` tweens
4. After last reel stops → SpinController emits `reels:stopped`
5. GameManager hears `reels:stopped` → generates result, adds winnings, emits `balance:changed` + `spin:result`
6. UIManager hears `spin:result` → shows result text, re-enables button if balance >= betAmount

## Constants (GameConfig defaults)
| Name | Value |
|------|-------|
| startingBalance | 1000 |
| betAmount | 50 |
| loseChance | 0.60 |
| smallWinChance | 0.30 |
| bigWinChance | 0.10 |
| smallWinPayout | 100 |
| bigWinPayout | 300 |
| reelSymbols | 🍒🍋⭐🔔💎 |
| reelDurations | [1.0, 1.3, 1.6] |

## Edge Cases
- Balance < betAmount → `bet:rejected`, show "Not enough credits"
- Spin already in progress → `_spinning` flag, button disabled
- Reset → restore starting balance, randomise reels, clear result
