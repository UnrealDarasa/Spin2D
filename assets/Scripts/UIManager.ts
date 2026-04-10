import { _decorator, Component, Label, Button, director, tween, Vec3 } from 'cc';
import { GameConfig } from './GameConfig';
import { GameEvents } from './GameEvents';
import { SpinResult } from './GameManager';
const { ccclass, property } = _decorator;

/**
 * Owns all UI elements and reacts to game events to keep the display current.
 *
 * Listens:  BALANCE_CHANGED, BET_PLACED, BET_REJECTED, SPIN_RESULT, GAME_RESET
 * Emits:    SPIN_REQUESTED, RESET_REQUESTED
 *
 * Knows nothing about GameManager or SpinController — only talks through
 * the director event bus.
 */
@ccclass('UIManager')
export class UIManager extends Component {

    // ── Editor references ────────────────────────────────────
    @property({ type: Label, tooltip: 'Label showing current credit balance' })
    public balanceLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Label showing spin result text' })
    public resultLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Label showing total money won' })
    public winCountLabel: Label | null = null;

    @property({ type: Button, tooltip: 'The Spin button' })
    public spinButton: Button | null = null;

    @property({ type: Button, tooltip: 'The Reset button' })
    public resetButton: Button | null = null;

    // ── State ────────────────────────────────────────────────
    private _totalWinMoney: number = 0;

    // ── Lifecycle ────────────────────────────────────────────

    onLoad() {
        // Subscribe to game events
        director.on(GameEvents.BALANCE_CHANGED, this._onBalanceChanged, this);
        director.on(GameEvents.BET_PLACED, this._onBetPlaced, this);
        director.on(GameEvents.BET_REJECTED, this._onBetRejected, this);
        director.on(GameEvents.SPIN_RESULT, this._onSpinResult, this);
        director.on(GameEvents.GAME_RESET, this._onGameReset, this);
        director.on(GameEvents.LOW_CREDITS, this._onLowCredits, this);
    }

    start() {
        // Wire button clicks → emit requests
        if (this.spinButton) {
            this.spinButton.node.on(Button.EventType.CLICK, this._onSpinClicked, this);
        }
        if (this.resetButton) {
            this.resetButton.node.on(Button.EventType.CLICK, this._onResetClicked, this);
        }

        this._showResult('');
    }

    onDestroy() {
        director.off(GameEvents.BALANCE_CHANGED, this._onBalanceChanged, this);
        director.off(GameEvents.BET_PLACED, this._onBetPlaced, this);
        director.off(GameEvents.BET_REJECTED, this._onBetRejected, this);
        director.off(GameEvents.SPIN_RESULT, this._onSpinResult, this);
        director.off(GameEvents.GAME_RESET, this._onGameReset, this);
        director.off(GameEvents.LOW_CREDITS, this._onLowCredits, this);
    }

    // ── Button handlers (emit requests) ──────────────────────

    private _onSpinClicked(): void {
        director.emit(GameEvents.SPIN_REQUESTED);
    }

    private _onResetClicked(): void {
        director.emit(GameEvents.RESET_REQUESTED);
    }

    // ── Event handlers (react to state) ──────────────────────

    private _onBalanceChanged(payload: { balance: number }): void {
        this._updateBalance(payload.balance);
    }

    private _onBetPlaced(_payload: { balance: number }): void {
        // Disable both buttons during spin
        this._setSpinButtonEnabled(false);
        this._setResetButtonEnabled(false);
        const cfg = GameConfig.instance;
        this._showResult(cfg.spinningText);
    }

    private _onBetRejected(): void {
        // No change to result label
    }

    private _onSpinResult(payload: { result: SpinResult; payout: number; balance: number }): void {
        // Show payout amount (0 for losses, positive for wins)
        this._showResult(payload.payout > 0 ? `+${payload.payout}` : '');

        // Add payout to total wins
        if (payload.payout > 0) {
            this._addToTotalWin(payload.payout);
        }

        // Re-enable both buttons, but disable spin if insufficient credits
        const cfg = GameConfig.instance;
        const canBet = payload.balance >= cfg.betAmount;
        this._setSpinButtonEnabled(canBet);
        this._setResetButtonEnabled(true);
    }

    private _onGameReset(payload: { balance: number }): void {
        this._showResult('');
        this._setSpinButtonEnabled(true);
        this._setResetButtonEnabled(true);
        this._resetTotalWin();
    }

    // ── Display helpers (private) ────────────────────────────

    private _updateBalance(balance: number): void {
        if (this.balanceLabel) {
            const cfg = GameConfig.instance;
            this.balanceLabel.string = `${cfg.balancePrefix} ${balance}`;
        }
    }

    private _showResult(text: string): void {
        if (this.resultLabel) {
            this.resultLabel.string = text;
        }
    }

    private _setSpinButtonEnabled(enabled: boolean): void {
        if (this.spinButton) {
            this.spinButton.interactable = enabled;
        }
    }

    private _setResetButtonEnabled(enabled: boolean): void {
        if (this.resetButton) {
            this.resetButton.interactable = enabled;
        }
    }

    private _addToTotalWin(amount: number): void {
        this._totalWinMoney += amount;
        this._updateTotalWin();
    }

    private _resetTotalWin(): void {
        this._totalWinMoney = 0;
        this._updateTotalWin();
    }

    private _updateTotalWin(): void {
        if (this.winCountLabel) {
            const cfg = GameConfig.instance;
            this.winCountLabel.string = `${cfg.totalWonPrefix} ${this._totalWinMoney}`;
        }
    }

    private _onLowCredits(): void {
        // Disable spin button and shake the balance label
        this._setSpinButtonEnabled(false);

        if (this.balanceLabel) {
            const node = this.balanceLabel.node;
            const originalX = node.position.x;
            const shakeDistance = 10;
            const shakeDuration = 0.1;

            tween(node)
                .to(shakeDuration, { position: new Vec3(originalX + shakeDistance, node.position.y, node.position.z) })
                .to(shakeDuration, { position: new Vec3(originalX - shakeDistance, node.position.y, node.position.z) })
                .to(shakeDuration, { position: new Vec3(originalX + shakeDistance, node.position.y, node.position.z) })
                .to(shakeDuration, { position: new Vec3(originalX, node.position.y, node.position.z) })
                .start();
        }
    }
}
