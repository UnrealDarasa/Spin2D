import { _decorator, Component, Label, Button, director } from 'cc';
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

    @property({ type: Button, tooltip: 'The Spin button' })
    public spinButton: Button | null = null;

    @property({ type: Button, tooltip: 'The Reset button' })
    public resetButton: Button | null = null;

    // ── Lifecycle ────────────────────────────────────────────

    onLoad() {
        // Subscribe to game events
        director.on(GameEvents.BALANCE_CHANGED, this._onBalanceChanged, this);
        director.on(GameEvents.BET_PLACED, this._onBetPlaced, this);
        director.on(GameEvents.BET_REJECTED, this._onBetRejected, this);
        director.on(GameEvents.SPIN_RESULT, this._onSpinResult, this);
        director.on(GameEvents.GAME_RESET, this._onGameReset, this);
    }

    start() {
        // Wire button clicks → emit requests
        if (this.spinButton) {
            this.spinButton.node.on(Button.EventType.CLICK, this._onSpinClicked, this);
        }
        if (this.resetButton) {
            this.resetButton.node.on(Button.EventType.CLICK, this._onResetClicked, this);
        }

        this._showResult('Spin to play!');
    }

    onDestroy() {
        director.off(GameEvents.BALANCE_CHANGED, this._onBalanceChanged, this);
        director.off(GameEvents.BET_PLACED, this._onBetPlaced, this);
        director.off(GameEvents.BET_REJECTED, this._onBetRejected, this);
        director.off(GameEvents.SPIN_RESULT, this._onSpinResult, this);
        director.off(GameEvents.GAME_RESET, this._onGameReset, this);
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
        this._setSpinButtonEnabled(false);
        this._showResult('Spinning...');
    }

    private _onBetRejected(): void {
        this._showResult('Not enough credits!');
    }

    private _onSpinResult(payload: { result: SpinResult; payout: number; balance: number }): void {
        const cfg = GameConfig.instance;

        switch (payload.result) {
            case SpinResult.Lose:
                this._showResult('No luck! Try again.');
                break;
            case SpinResult.SmallWin:
                this._showResult(`Small Win! +${cfg.smallWinPayout} credits 🎉`);
                break;
            case SpinResult.BigWin:
                this._showResult(`BIG WIN! +${cfg.bigWinPayout} credits 🎊🎊`);
                break;
        }

        // Re-enable spin only if player can still bet
        this._setSpinButtonEnabled(payload.balance >= cfg.betAmount);
    }

    private _onGameReset(payload: { balance: number }): void {
        this._showResult('Spin to play!');
        this._setSpinButtonEnabled(true);
    }

    // ── Display helpers (private) ────────────────────────────

    private _updateBalance(balance: number): void {
        if (this.balanceLabel) {
            this.balanceLabel.string = `Credits: ${balance}`;
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
}
