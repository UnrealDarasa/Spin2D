# Spin2D — 2D Slot Mini-Game Prototype

A small 2D spin-based mini-game built with **Cocos Creator 3.7.3** + TypeScript.

## How to Run

1. **Install Cocos Creator 3.7.3** — download from [Cocos Dashboard](https://www.cocos.com/en/creator-download).
2. Open **Cocos Dashboard → Projects → Add → Browse** and select this folder (`Spin2D/`).
3. Open the project. Cocos Creator will import assets and compile scripts.
4. In the editor, open `assets/Scenes/Gameplay.scene`.
5. Assign the **Canvas** node to the `GameplaySceneManager` component's `canvas` property in the Inspector.
6. Press **▶ Play** (or Ctrl/Cmd+P) to preview in browser.

> **Optional Main Menu:** Create a new scene `assets/Scenes/MainMenu.scene`, add a Button node, attach the `MainMenuController` script, wire the button, and set it as the start scene in **Project → Project Settings → Scenes**.

## Game Rules

| Parameter | Value |
|-----------|-------|
| Starting balance | 1,000 credits |
| Bet per spin | 50 credits |
| Lose (60%) | +0 |
| Small Win (30%) | +100 |
| Big Win (10%) | +300 |

- Balance is shown at all times.
- Spin button is disabled while spinning or when balance < 50.
- Reset button restores 1,000 credits.

## Architecture

```
assets/Scripts/
├── GameConfig.ts           — Singleton config (all constants, server-loadable)
├── GameEvents.ts           — Central event-name registry
├── GameManager.ts          — State: balance, bet logic, weighted RNG
├── SpinController.ts       — Reel animation driver
├── ReelController.ts       — Animation: single reel tween (3 symbols)
├── UIManager.ts            — UI display & button input
├── MainMenuController.ts   — Scene transition: MainMenu → Gameplay
└── GameplaySceneManager.ts — Scene bootstrap: creates UI nodes at runtime
```

**Fully decoupled via `director` event bus:**
```
UIManager  ──emit──→  SPIN_REQUESTED / RESET_REQUESTED
GameManager  ─listen→  SPIN_REQUESTED → emit BET_PLACED / BET_REJECTED
SpinController ─listen→ BET_PLACED → animate → emit REELS_STOPPED
GameManager  ─listen→  REELS_STOPPED → emit SPIN_RESULT + BALANCE_CHANGED
UIManager  ─listen→  BALANCE_CHANGED / SPIN_RESULT / GAME_RESET → update display
```

No component imports or holds a reference to another component. All communication flows through `director.on()` / `director.emit()` with event names defined in `GameEvents.ts`. The only structural link is `SpinController → ReelController[]` (parent owns its animation children).

## Technical Decisions

1. **Director event bus** — All cross-component communication uses `director.on()` / `director.emit()` with event names centralised in `GameEvents.ts`. No component imports or references another component class. This makes every script independently testable and swappable.

2. **GameConfig singleton** — All tuneable constants (balance, bet amount, odds, payouts, reel durations) live in `GameConfig.ts`. Call `GameConfig.loadFromServer(url)` to fetch overrides from a remote JSON endpoint, or `GameConfig.applyOverrides({...})` for local testing.

3. **Editor-driven UI layout** — `GameplaySceneManager` wires all UI nodes and the reel prefab via `@property` fields. The scene hierarchy and assets are designed in the editor; the script just assembles them at runtime.

4. **Prefab-based reels** — Reel instances are spawned from a prefab so you can iterate on the reel design (symbols, layout, spacing) in one place.

5. **Sprite-based symbols** — Each symbol is a Sprite node with a SpriteFrame. Wire available symbol SpriteFrames to the `ReelController.symbolFrames` array so the reel can randomly display them during spin.

6. **Promise-based spin flow** — `ReelController.spinReel()` returns a `Promise` that resolves when the tween completes. `SpinController` awaits all reels, then emits `REELS_STOPPED`.

7. **Tween-based reel animation** — Each reel tweens downward and snaps back, randomising symbol sprites on each cycle, then eases out on the final stop. Duration is staggered per reel (configurable via `GameConfig.reelDurations`).

## Edge Cases Handled

- **Insufficient balance** — spin is rejected with a message; button stays enabled for Reset.
- **Double-tap** — `_spinning` guard prevents concurrent spins.
- **Auto-disable** — Spin button disables when balance drops below bet amount.
