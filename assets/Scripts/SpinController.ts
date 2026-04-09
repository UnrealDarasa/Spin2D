import { _decorator, Component, director } from 'cc';
import { GameConfig } from './GameConfig';
import { GameEvents } from './GameEvents';
import { ReelController } from './ReelController';
const { ccclass, property } = _decorator;

/**
 * Drives reel animations in response to game events.
 *
 * Listens:  BET_PLACED, GAME_RESET, REELS_RANDOMISE
 * Emits:    REELS_STOPPED
 *
 * Knows nothing about GameManager or UIManager — only talks to its own
 * child ReelController components and the director event bus.
 */
@ccclass('SpinController')
export class SpinController extends Component {

    @property({ type: [ReelController], tooltip: 'Reel controllers left→right' })
    public reels: ReelController[] = [];

    private _spinning: boolean = false;

    // ── Lifecycle ────────────────────────────────────────────

    onLoad() {
        director.on(GameEvents.BET_PLACED, this._onBetPlaced, this);
        director.on(GameEvents.GAME_RESET, this._onGameReset, this);
        director.on(GameEvents.REELS_RANDOMISE, this._onReelsRandomise, this);
    }

    start() {
        // Show random symbols on load
        for (const reel of this.reels) {
            reel.randomiseSymbols();
        }
    }

    onDestroy() {
        director.off(GameEvents.BET_PLACED, this._onBetPlaced, this);
        director.off(GameEvents.GAME_RESET, this._onGameReset, this);
        director.off(GameEvents.REELS_RANDOMISE, this._onReelsRandomise, this);
    }

    // ── Event handlers ───────────────────────────────────────

    private async _onBetPlaced(): Promise<void> {
        if (this._spinning) return;
        this._spinning = true;

        const cfg = GameConfig.instance;
        const durations = cfg.reelDurations;

        // Spin all reels with staggered durations
        const promises = this.reels.map((reel, i) =>
            reel.spinReel(durations[i] ?? durations[durations.length - 1])
        );
        await Promise.all(promises);

        this._spinning = false;
        director.emit(GameEvents.REELS_STOPPED);
    }

    private _onGameReset(): void {
        for (const reel of this.reels) {
            reel.randomiseSymbols();
        }
    }

    private _onReelsRandomise(): void {
        for (const reel of this.reels) {
            reel.randomiseSymbols();
        }
    }
}
