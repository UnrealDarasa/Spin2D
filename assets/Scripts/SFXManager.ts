import { _decorator, Component, AudioClip, AudioSource, director } from 'cc';
import { SpinResult } from './GameConfig';
import { GameEvents } from './GameEvents';
const { ccclass, property } = _decorator;

/**
 * Plays sound effects in response to game events.
 *
 * Listens:  BET_PLACED, BET_REJECTED, SPIN_RESULT, REELS_LANDED,
 *           HIGHLIGHT_WIN, LOW_CREDITS, GAME_RESET
 *
 * Knows nothing about any other component — communicates purely via
 * the director event bus.
 *
 * Usage:
 *   1. Add this component to a node in the Gameplay scene.
 *   2. Add an AudioSource component to the same node.
 *   3. Wire AudioClip assets in the Inspector for each event.
 *   4. Wire the node in SceneManager.sfxManager.
 */
@ccclass('SFXManager')
export class SFXManager extends Component {

    // ── Editor references (wire AudioClips in Inspector) ─────

    @property({ type: AudioClip, tooltip: 'Played when the spin button is pressed and bet accepted' })
    public spinClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Played when reels finish landing' })
    public reelLandClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Played on a small win (2 matching)' })
    public smallWinClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Played on a big win (3 matching)' })
    public bigWinClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Played on a loss' })
    public loseClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Played when balance is insufficient (bet rejected)' })
    public rejectClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Played when credits drop below bet amount' })
    public lowCreditClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Played when the game is reset' })
    public resetClip: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Played on any button click (Spin, Reset, etc.)' })
    public buttonClickClip: AudioClip | null = null;

    // ── Volume ───────────────────────────────────────────────

    @property({ tooltip: 'Master SFX volume (0–1)', range: [0, 1, 0.05] })
    public volume: number = 1.0;

    // ── Internal state ───────────────────────────────────────

    private audioSource: AudioSource | null = null;

    // ── Lifecycle ────────────────────────────────────────────

    onLoad() {
        // Require an AudioSource on the same node
        this.audioSource = this.getComponent(AudioSource);
        if (!this.audioSource) {
            this.audioSource = this.addComponent(AudioSource);
        }

        // Subscribe to game events
        director.on(GameEvents.BUTTON_CLICKED, this.onButtonClicked, this);
        director.on(GameEvents.BET_PLACED, this.onBetPlaced, this);
        director.on(GameEvents.BET_REJECTED, this.onBetRejected, this);
        director.on(GameEvents.REELS_LANDED, this.onReelsLanded, this);
        director.on(GameEvents.SPIN_RESULT, this.onSpinResult, this);
        director.on(GameEvents.LOW_CREDITS, this.onLowCredits, this);
        director.on(GameEvents.GAME_RESET, this.onGameReset, this);
    }

    onDestroy() {
        director.off(GameEvents.BUTTON_CLICKED, this.onButtonClicked, this);
        director.off(GameEvents.BET_PLACED, this.onBetPlaced, this);
        director.off(GameEvents.BET_REJECTED, this.onBetRejected, this);
        director.off(GameEvents.REELS_LANDED, this.onReelsLanded, this);
        director.off(GameEvents.SPIN_RESULT, this.onSpinResult, this);
        director.off(GameEvents.LOW_CREDITS, this.onLowCredits, this);
        director.off(GameEvents.GAME_RESET, this.onGameReset, this);
    }

    // ── Event handlers ───────────────────────────────────────

    private onButtonClicked(): void {
        this.playClip(this.buttonClickClip);
    }

    private onBetPlaced(): void {
        this.playClip(this.spinClip);
    }

    private onBetRejected(): void {
        this.playClip(this.rejectClip);
    }

    private onReelsLanded(): void {
        this.playClip(this.reelLandClip);
    }

    private onSpinResult(payload: { result: SpinResult; payout: number }): void {
        switch (payload.result) {
            case SpinResult.BigWin:
                this.playClip(this.bigWinClip);
                break;
            case SpinResult.SmallWin:
                this.playClip(this.smallWinClip);
                break;
            default:
                this.playClip(this.loseClip);
                break;
        }
    }

    private onLowCredits(): void {
        this.playClip(this.lowCreditClip);
    }

    private onGameReset(): void {
        this.playClip(this.resetClip);
    }

    // ── Public API ───────────────────────────────────────────

    /** Play an arbitrary clip as a one-shot (fire-and-forget). */
    public playOneShot(clip: AudioClip | null): void {
        this.playClip(clip);
    }

    // ── Helpers ──────────────────────────────────────────────

    private playClip(clip: AudioClip | null): void {
        if (!clip || !this.audioSource) return;
        this.audioSource.playOneShot(clip, this.volume);
    }
}
