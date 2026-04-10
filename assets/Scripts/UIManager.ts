import { _decorator, Component, Label, Button, director, tween, Tween, Vec3, Node } from 'cc';
import { GameConfig, SpinResult } from './GameConfig';
import { GameEvents } from './GameEvents';
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
    private totalWinMoney: number = 0;
    private balanceLabelOriginX: number = 0;
    private shakeTween: Tween<Node> | null = null;

    // ── Lifecycle ────────────────────────────────────────────

    onLoad() {
        // Subscribe to game events
        director.on(GameEvents.BALANCE_CHANGED, this.onBalanceChanged, this);
        director.on(GameEvents.BET_PLACED, this.onBetPlaced, this);
        director.on(GameEvents.BET_REJECTED, this.onBetRejected, this);
        director.on(GameEvents.SPIN_RESULT, this.onSpinResult, this);
        director.on(GameEvents.GAME_RESET, this.onGameReset, this);
        director.on(GameEvents.LOW_CREDITS, this.onLowCredits, this);
    }

    start() {
        // Wire button clicks → emit requests
        if (this.spinButton) {
            this.spinButton.node.on(Button.EventType.CLICK, this.onSpinClicked, this);
        }
        if (this.resetButton) {
            this.resetButton.node.on(Button.EventType.CLICK, this.onResetClicked, this);
        }

        this.showResult('');

        // Cache the balance label's original X so shakes always return to center
        if (this.balanceLabel) {
            this.balanceLabelOriginX = this.balanceLabel.node.position.x;
        }
    }

    onDestroy() {
        director.off(GameEvents.BALANCE_CHANGED, this.onBalanceChanged, this);
        director.off(GameEvents.BET_PLACED, this.onBetPlaced, this);
        director.off(GameEvents.BET_REJECTED, this.onBetRejected, this);
        director.off(GameEvents.SPIN_RESULT, this.onSpinResult, this);
        director.off(GameEvents.GAME_RESET, this.onGameReset, this);
        director.off(GameEvents.LOW_CREDITS, this.onLowCredits, this);
    }

    // ── Button handlers (emit requests) ──────────────────────

    private onSpinClicked(): void {
        director.emit(GameEvents.BUTTON_CLICKED);
        director.emit(GameEvents.SPIN_REQUESTED);
    }

    private onResetClicked(): void {
        director.emit(GameEvents.BUTTON_CLICKED);
        director.emit(GameEvents.RESET_REQUESTED);
    }

    // ── Event handlers (react to state) ──────────────────────

    private onBalanceChanged(payload: { balance: number }): void {
        this.updateBalance(payload.balance);
    }

    private onBetPlaced(payload: { balance: number }): void {
        // Disable both buttons during spin
        this.setSpinButtonEnabled(false);
        this.setResetButtonEnabled(false);
        const cfg = GameConfig.instance;
        this.showResult(cfg.spinningText);
    }

    private onBetRejected(): void {
        // Balance insufficient — shake the balance label as feedback
        this.shakeBalanceLabel();
    }

    private onSpinResult(payload: { result: SpinResult; payout: number; balance: number }): void {
        // Show payout amount for wins, or lose text for losses
        const cfg = GameConfig.instance;
        if (payload.payout > 0) {
            this.showResult(cfg.winResultFormat.replace('{payout}', String(payload.payout)));
        } else {
            this.showResult(cfg.loseText);
        }

        // Add payout to total wins
        if (payload.payout > 0) {
            this.addToTotalWin(payload.payout);
        }

        // Re-enable spin and reset buttons after spin completes
        this.setSpinButtonEnabled(true);
        this.setResetButtonEnabled(true);
    }

    private onGameReset(payload: { balance: number }): void {
        this.showResult('');
        this.setSpinButtonEnabled(true);
        this.setResetButtonEnabled(true);
        this.resetTotalWin();
    }

    // ── Display helpers (private) ────────────────────────────

    private updateBalance(balance: number): void {
        if (this.balanceLabel) {
            const cfg = GameConfig.instance;
            this.balanceLabel.string = `${cfg.balancePrefix} ${balance}`;
        }
    }

    private showResult(text: string): void {
        if (this.resultLabel) {
            this.resultLabel.string = text;
        }
    }

    private setSpinButtonEnabled(enabled: boolean): void {
        if (this.spinButton) {
            this.spinButton.interactable = enabled;
        }
    }

    private setResetButtonEnabled(enabled: boolean): void {
        if (this.resetButton) {
            this.resetButton.interactable = enabled;
        }
    }

    private addToTotalWin(amount: number): void {
        this.totalWinMoney += amount;
        this.updateTotalWin();
    }

    private resetTotalWin(): void {
        this.totalWinMoney = 0;
        this.updateTotalWin();
    }

    private updateTotalWin(): void {
        if (this.winCountLabel) {
            const cfg = GameConfig.instance;
            this.winCountLabel.string = `${cfg.totalWonPrefix} ${this.totalWinMoney}`;
        }
    }

    private onLowCredits(): void {
        // Shake the balance label as a visual warning
        this.shakeBalanceLabel();
    }

    private shakeBalanceLabel(): void {
        if (!this.balanceLabel) return;

        const node = this.balanceLabel.node;
        const originX = this.balanceLabelOriginX;
        const shakeDistance = 10;
        const shakeDuration = 0.1;

        // Stop any running shake and snap back to center first
        if (this.shakeTween) {
            this.shakeTween.stop();
            this.shakeTween = null;
            node.setPosition(originX, node.position.y, node.position.z);
        }

        this.shakeTween = tween(node)
            .to(shakeDuration, { position: new Vec3(originX + shakeDistance, node.position.y, node.position.z) })
            .to(shakeDuration, { position: new Vec3(originX - shakeDistance, node.position.y, node.position.z) })
            .to(shakeDuration, { position: new Vec3(originX + shakeDistance, node.position.y, node.position.z) })
            .to(shakeDuration, { position: new Vec3(originX, node.position.y, node.position.z) })
            .call(() => { this.shakeTween = null; })
            .start();
    }
}
