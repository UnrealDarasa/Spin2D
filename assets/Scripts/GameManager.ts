import { _decorator, Component, director, SpriteFrame } from 'cc';
import { GameConfig, SpinResult } from './GameConfig';
import { GameEvents } from './GameEvents';
const { ccclass } = _decorator;

/**
 * Owns game state (balance) and rules (odds, payouts).
 *
 * Listens:  SPIN_REQUESTED, RESET_REQUESTED
 * Emits:    BET_PLACED, BET_REJECTED, BALANCE_CHANGED, SPIN_RESULT, GAME_RESET
 *
 * Knows nothing about UI or animation — communicates purely via director events.
 */
@ccclass('GameManager')
export class GameManager extends Component {

    private balance: number = 0;
    private desiredResult: SpinResult = SpinResult.Lose;
    private spinning: boolean = false;

    public get currentBalance(): number {
        return this.balance;
    }

    // ── Lifecycle ────────────────────────────────────────────

    onLoad() {
        const cfg = GameConfig.instance;
        this.balance = cfg.startingBalance;

        director.on(GameEvents.SPIN_REQUESTED, this.onSpinRequested, this);
        director.on(GameEvents.RESET_REQUESTED, this.onResetRequested, this);
        director.on(GameEvents.REELS_LANDED, this.onReelsLanded, this);
    }

    start() {
        // Broadcast initial balance so UI can display it
        director.emit(GameEvents.BALANCE_CHANGED, { balance: this.balance });
    }

    onDestroy() {
        director.off(GameEvents.SPIN_REQUESTED, this.onSpinRequested, this);
        director.off(GameEvents.RESET_REQUESTED, this.onResetRequested, this);
        director.off(GameEvents.REELS_LANDED, this.onReelsLanded, this);
    }

    // ── Event handlers ───────────────────────────────────────

    private onSpinRequested(): void {
        const cfg = GameConfig.instance;

        if (this.balance < cfg.betAmount) {
            director.emit(GameEvents.BET_REJECTED);
            return;
        }

        // Deduct bet
        this.balance -= cfg.betAmount;
        director.emit(GameEvents.BALANCE_CHANGED, { balance: this.balance });

        // Check if balance is too low for the next spin
        if (this.balance < cfg.betAmount) {
            director.emit(GameEvents.LOW_CREDITS);
        }

        // Determine result first (60/30/10 odds)
        this.desiredResult = this.generateResult();

        // Emit spin determined event with desired result
        this.spinning = true;
        director.emit(GameEvents.SPIN_DETERMINED, { result: this.desiredResult });
        director.emit(GameEvents.BET_PLACED, { balance: this.balance });
    }

    private onReelsLanded(payload: { finalSymbols: (SpriteFrame | null)[] }): void {
        // Result was already determined before spin; use stored value
        const result = this.desiredResult;
        const cfg = GameConfig.instance;
        const payout = this.payoutFor(result, cfg);

        if (payout > 0) {
            this.balance += payout;
        }

        director.emit(GameEvents.BALANCE_CHANGED, { balance: this.balance });

        // Check if balance is too low for the next spin
        if (this.balance < cfg.betAmount) {
            director.emit(GameEvents.LOW_CREDITS);
        }

        this.spinning = false;
        director.emit(GameEvents.SPIN_RESULT, {
            result,
            payout,
            balance: this.balance,
        });

        // Highlight winning symbols if there's a win
        if (payout > 0) {
            director.emit(GameEvents.HIGHLIGHT_WIN, { result });
        }
    }

    private onResetRequested(): void {
        if (this.spinning) return;          // ignore reset while reels are mid-spin

        const cfg = GameConfig.instance;
        this.balance = cfg.startingBalance;
        director.emit(GameEvents.BALANCE_CHANGED, { balance: this.balance });
        director.emit(GameEvents.GAME_RESET, { balance: this.balance });
    }

    // ── Helpers ──────────────────────────────────────────────

    private generateResult(): SpinResult {
        // Generate result by odds: 60% lose, 30% small win, 10% big win
        const cfg = GameConfig.instance;
        const roll = Math.random();
        if (roll < cfg.loseThreshold) {
            return SpinResult.Lose;
        } else if (roll < cfg.smallWinThreshold) {
            return SpinResult.SmallWin;
        }
        return SpinResult.BigWin;
    }

    private payoutFor(result: SpinResult, cfg: GameConfig): number {
        switch (result) {
            case SpinResult.SmallWin: return cfg.smallWinPayout;
            case SpinResult.BigWin: return cfg.bigWinPayout;
            default: return 0;
        }
    }
}
