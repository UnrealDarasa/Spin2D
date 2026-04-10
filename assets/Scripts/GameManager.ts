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

    private _balance: number = 0;
    private _desiredResult: SpinResult = SpinResult.Lose;

    public get balance(): number {
        return this._balance;
    }

    // ── Lifecycle ────────────────────────────────────────────

    onLoad() {
        const cfg = GameConfig.instance;
        this._balance = cfg.startingBalance;

        director.on(GameEvents.SPIN_REQUESTED, this._onSpinRequested, this);
        director.on(GameEvents.RESET_REQUESTED, this._onResetRequested, this);
        director.on(GameEvents.REELS_LANDED, this._onReelsLanded, this);
    }

    start() {
        // Broadcast initial balance so UI can display it
        director.emit(GameEvents.BALANCE_CHANGED, { balance: this._balance });
    }

    onDestroy() {
        director.off(GameEvents.SPIN_REQUESTED, this._onSpinRequested, this);
        director.off(GameEvents.RESET_REQUESTED, this._onResetRequested, this);
        director.off(GameEvents.REELS_LANDED, this._onReelsLanded, this);
    }

    // ── Event handlers ───────────────────────────────────────

    private _onSpinRequested(): void {
        const cfg = GameConfig.instance;

        if (this._balance < cfg.betAmount) {
            director.emit(GameEvents.BET_REJECTED);
            return;
        }

        // Deduct bet
        this._balance -= cfg.betAmount;
        director.emit(GameEvents.BALANCE_CHANGED, { balance: this._balance });

        // Check if balance is too low
        if (this._balance < 50) {
            director.emit(GameEvents.LOW_CREDITS);
        }

        // Determine result first (60/30/10 odds)
        this._desiredResult = this._generateResult();

        // Emit spin determined event with desired result
        director.emit(GameEvents.SPIN_DETERMINED, { result: this._desiredResult });
        director.emit(GameEvents.BET_PLACED, { balance: this._balance });
    }

    private _onReelsLanded(payload: { finalSymbols: (SpriteFrame | null)[] }): void {
        // Result was already determined before spin; use stored value
        const result = this._desiredResult;
        const cfg = GameConfig.instance;
        const payout = this._payoutFor(result, cfg);

        if (payout > 0) {
            this._balance += payout;
        }

        director.emit(GameEvents.BALANCE_CHANGED, { balance: this._balance });

        // Check if balance is too low
        if (this._balance < 50) {
            director.emit(GameEvents.LOW_CREDITS);
        }

        director.emit(GameEvents.SPIN_RESULT, {
            result,
            payout,
            balance: this._balance,
        });

        // Highlight winning symbols if there's a win
        if (payout > 0) {
            director.emit(GameEvents.HIGHLIGHT_WIN, { result });
        }
    }

    private _onResetRequested(): void {
        const cfg = GameConfig.instance;
        this._balance = cfg.startingBalance;
        director.emit(GameEvents.BALANCE_CHANGED, { balance: this._balance });
        director.emit(GameEvents.GAME_RESET, { balance: this._balance });
    }

    // ── Helpers ──────────────────────────────────────────────

    private _generateResult(): SpinResult {
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

    private _payoutFor(result: SpinResult, cfg: GameConfig): number {
        switch (result) {
            case SpinResult.SmallWin: return cfg.smallWinPayout;
            case SpinResult.BigWin: return cfg.bigWinPayout;
            default: return 0;
        }
    }
}
