import { _decorator, Component, director } from 'cc';
import { GameConfig } from './GameConfig';
import { GameEvents } from './GameEvents';
const { ccclass } = _decorator;

/** Possible spin outcomes. */
export enum SpinResult {
    Lose = 0,
    SmallWin = 1,
    BigWin = 2,
}

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

    public get balance(): number {
        return this._balance;
    }

    // ── Lifecycle ────────────────────────────────────────────

    onLoad() {
        const cfg = GameConfig.instance;
        this._balance = cfg.startingBalance;

        director.on(GameEvents.SPIN_REQUESTED, this._onSpinRequested, this);
        director.on(GameEvents.RESET_REQUESTED, this._onResetRequested, this);
        director.on(GameEvents.REELS_STOPPED, this._onReelsStopped, this);
    }

    start() {
        // Broadcast initial balance so UI can display it
        director.emit(GameEvents.BALANCE_CHANGED, { balance: this._balance });
    }

    onDestroy() {
        director.off(GameEvents.SPIN_REQUESTED, this._onSpinRequested, this);
        director.off(GameEvents.RESET_REQUESTED, this._onResetRequested, this);
        director.off(GameEvents.REELS_STOPPED, this._onReelsStopped, this);
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
        director.emit(GameEvents.BET_PLACED, { balance: this._balance });
    }

    private _onReelsStopped(): void {
        // Generate result after animation finishes
        const cfg = GameConfig.instance;
        const result = this._generateResult();
        const payout = this._payoutFor(result, cfg);

        if (payout > 0) {
            this._balance += payout;
        }

        director.emit(GameEvents.BALANCE_CHANGED, { balance: this._balance });
        director.emit(GameEvents.SPIN_RESULT, {
            result,
            payout,
            balance: this._balance,
        });
    }

    private _onResetRequested(): void {
        const cfg = GameConfig.instance;
        this._balance = cfg.startingBalance;
        director.emit(GameEvents.BALANCE_CHANGED, { balance: this._balance });
        director.emit(GameEvents.GAME_RESET, { balance: this._balance });
    }

    // ── Helpers ──────────────────────────────────────────────

    private _generateResult(): SpinResult {
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
            case SpinResult.BigWin:   return cfg.bigWinPayout;
            default:                  return 0;
        }
    }
}
