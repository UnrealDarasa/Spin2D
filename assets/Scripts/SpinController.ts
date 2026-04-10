import { _decorator, Component, Node, Prefab, instantiate, director, SpriteFrame } from 'cc';
import { GameConfig, SpinResult } from './GameConfig';
import { GameEvents } from './GameEvents';
import { ReelController } from './ReelController';
const { ccclass, property } = _decorator;

/**
 * Drives reel animations in response to game events.
 * Also spawns and manages reel instances from a prefab.
 *
 * Listens:  BET_PLACED, GAME_RESET, REELS_RANDOMISE
 * Emits:    REELS_STOPPED
 *
 * Knows nothing about GameManager or UIManager — only talks to its own
 * child ReelController components and the director event bus.
 */
@ccclass('SpinController')
export class SpinController extends Component {

    @property({ type: Prefab, tooltip: 'Reel prefab (must have ReelController component)' })
    public reelPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: 'Parent node that holds the reel instances' })
    public reelContainer: Node | null = null;

    @property({ tooltip: 'Horizontal spacing between reels (px)' })
    public reelSpacing: number = 140;

    public reels: ReelController[] = [];

    private _spinning: boolean = false;
    private _desiredResult: SpinResult = SpinResult.Lose;
    private _lastMiddleIndices: number[] = [];

    // ── Lifecycle ────────────────────────────────────────────

    onLoad() {
        director.on(GameEvents.SPIN_DETERMINED, this._onSpinDetermined, this);
        director.on(GameEvents.BET_PLACED, this._onBetPlaced, this);
        director.on(GameEvents.GAME_RESET, this._onGameReset, this);
        director.on(GameEvents.REELS_RANDOMISE, this._onReelsRandomise, this);
        director.on(GameEvents.HIGHLIGHT_WIN, this._onHighlightWin, this);
    }

    start() {
        // ── Spawn reels from prefab ──────────────────────────
        this._spawnReels();

        // Show random symbols on load
        for (const reel of this.reels) {
            reel.randomiseSymbols();
        }
    }

    private _spawnReels(): void {
        const cfg = GameConfig.instance;

        if (!this.reelPrefab || !this.reelContainer) {
            console.warn('[SpinController] reelPrefab or reelContainer not assigned!');
            return;
        }

        for (let i = 0; i < cfg.reelCount; i++) {
            const reelNode = instantiate(this.reelPrefab);
            reelNode.name = `Reel_${i}`;
            reelNode.parent = this.reelContainer;
            reelNode.setPosition((i - Math.floor(cfg.reelCount / 2)) * this.reelSpacing, 0, 0);

            const reelCtrl = reelNode.getComponent(ReelController);
            if (reelCtrl) {
                this.reels.push(reelCtrl);
            }
        }
    }

    onDestroy() {
        director.off(GameEvents.SPIN_DETERMINED, this._onSpinDetermined, this);
        director.off(GameEvents.BET_PLACED, this._onBetPlaced, this);
        director.off(GameEvents.GAME_RESET, this._onGameReset, this);
        director.off(GameEvents.REELS_RANDOMISE, this._onReelsRandomise, this);
        director.off(GameEvents.HIGHLIGHT_WIN, this._onHighlightWin, this);
    }

    // ── Event handlers ───────────────────────────────────────

    private async _onBetPlaced(): Promise<void> {
        if (this._spinning) return;
        this._spinning = true;

        // Clear previous win highlights before spinning
        for (const reel of this.reels) {
            reel.clearHighlights();
        }

        const cfg = GameConfig.instance;
        const durations = cfg.reelDurations;

        // Generate the middle-slot frame index for each reel based on desired result
        const middleIndices = this._generateMiddleIndices(this._desiredResult);
        this._lastMiddleIndices = middleIndices;

        // Spin all reels with staggered durations
        const promises = this.reels.map((reel, i) => {
            return reel.spinReel(
                durations[i] ?? durations[durations.length - 1],
                middleIndices[i]
            );
        });
        await Promise.all(promises);

        // Collect final symbols from all reels
        const finalSymbols: (SpriteFrame | null)[] = this.reels.map(reel => reel.finalSymbol);

        this._spinning = false;
        director.emit(GameEvents.REELS_STOPPED);
        director.emit(GameEvents.REELS_LANDED, { finalSymbols });
    }

    private _onGameReset(): void {
        // Clear all win highlights
        for (const reel of this.reels) {
            reel.clearHighlights();
            reel.randomiseSymbols();
        }
    }

    private _onReelsRandomise(): void {
        for (const reel of this.reels) {
            reel.randomiseSymbols();
        }
    }

    private _onHighlightWin(payload: { result: SpinResult }): void {
        if (payload.result === SpinResult.BigWin) {
            // All 3 match — highlight all reels
            for (const reel of this.reels) {
                reel.highlightWinningSymbol();
            }
        } else if (payload.result === SpinResult.SmallWin) {
            // Only 2 match — find which middle indices are the same and highlight those reels
            const indices = this._lastMiddleIndices;
            const freq: { [key: number]: number[] } = {};
            for (let i = 0; i < indices.length; i++) {
                if (!freq[indices[i]]) freq[indices[i]] = [];
                freq[indices[i]].push(i);
            }
            for (const key in freq) {
                if (freq[key].length >= 2) {
                    for (const ri of freq[key]) {
                        this.reels[ri]?.highlightWinningSymbol();
                    }
                }
            }
        }
    }

    private _onSpinDetermined(payload: { result: SpinResult }): void {
        // Store desired result for the upcoming spin
        this._desiredResult = payload.result;
    }

    /**
     * Generate the middle-slot frame index for each reel based on result.
     *
     * The reel always displays 3 consecutive symbols from symbolFrames:
     *   slot 0 (top)    = middleIndex - 1
     *   slot 1 (middle) = middleIndex        ← the "payline" symbol
     *   slot 2 (bottom) = middleIndex + 1
     *
     * Win/lose is determined by whether the middle indices match across reels:
     *   Lose:     all 3 middle indices are different
     *   SmallWin: exactly 2 middle indices are the same
     *   BigWin:   all 3 middle indices are the same
     */
    private _generateMiddleIndices(result: SpinResult): number[] {
        const totalFrames = this.reels[0]?.symbolFrames.length ?? 0;
        if (totalFrames === 0) return [0, 0, 0];

        const randIdx = () => Math.floor(Math.random() * totalFrames);

        if (result === SpinResult.BigWin) {
            // All 3 reels land on the same symbol
            const idx = randIdx();
            return [idx, idx, idx];
        }

        if (result === SpinResult.SmallWin) {
            // 2 reels share the same symbol, 1 reel is different
            const winIdx = randIdx();
            let oddIdx = randIdx();
            while (oddIdx === winIdx) {
                oddIdx = randIdx();
            }
            // Randomly choose which reel is the odd one out
            const oddReel = Math.floor(Math.random() * 3);
            return [0, 1, 2].map(i => (i === oddReel ? oddIdx : winIdx));
        }

        // Lose: all 3 reels land on different symbols
        const idx0 = randIdx();
        let idx1 = randIdx();
        while (idx1 === idx0) {
            idx1 = randIdx();
        }
        let idx2 = randIdx();
        while (idx2 === idx0 || idx2 === idx1) {
            idx2 = randIdx();
        }
        return [idx0, idx1, idx2];
    }
}
