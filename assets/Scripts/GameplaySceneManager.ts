import { _decorator, Component, Node, Label, Button, Prefab, instantiate } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager } from './GameManager';
import { SpinController } from './SpinController';
import { UIManager } from './UIManager';
import { ReelController } from './ReelController';
const { ccclass, property } = _decorator;

/**
 * Bootstraps the Gameplay scene.
 *
 * All visual nodes are designed in the editor and wired here via @property.
 * Reel instances are spawned from a prefab at runtime so you can iterate on
 * the reel design in one place.
 *
 * Each manager/controller component self-subscribes to director events in its
 * own onLoad(), so this class does NOT set any cross-component references.
 */
@ccclass('GameplaySceneManager')
export class GameplaySceneManager extends Component {

    // ── Editor-wired references ──────────────────────────────

    @property({ type: Node, tooltip: 'Canvas node (root UI node)' })
    public canvas: Node | null = null;

    @property({ type: Label, tooltip: 'Label that displays the current credit balance' })
    public balanceLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Label that displays spin result text' })
    public resultLabel: Label | null = null;

    @property({ type: Button, tooltip: 'The Spin button' })
    public spinButton: Button | null = null;

    @property({ type: Button, tooltip: 'The Reset button' })
    public resetButton: Button | null = null;

    @property({ type: Node, tooltip: 'Parent node that holds the reel instances' })
    public reelContainer: Node | null = null;

    @property({ type: Prefab, tooltip: 'Reel prefab (must have ReelController component)' })
    public reelPrefab: Prefab | null = null;

    @property({ tooltip: 'Horizontal spacing between reels (px)' })
    public reelSpacing: number = 140;

    start() {
        const cfg = GameConfig.instance;

        // ── GameManager (self-subscribes in onLoad) ─────────
        this.node.addComponent(GameManager);

        // ── Spawn reels from prefab ─────────────────────────
        const reelControllers: ReelController[] = [];

        if (this.reelPrefab && this.reelContainer) {
            for (let i = 0; i < cfg.reelCount; i++) {
                const reelNode = instantiate(this.reelPrefab);
                reelNode.name = `Reel_${i}`;
                reelNode.parent = this.reelContainer;
                reelNode.setPosition((i - Math.floor(cfg.reelCount / 2)) * this.reelSpacing, 0, 0);

                const reelCtrl = reelNode.getComponent(ReelController);
                if (reelCtrl) {
                    reelControllers.push(reelCtrl);
                }
            }
        }

        // ── UIManager (self-subscribes in onLoad) ───────────
        const uiManagerNode = new Node('UIManager');
        uiManagerNode.parent = this.node;
        const uiManager = uiManagerNode.addComponent(UIManager);
        uiManager.balanceLabel = this.balanceLabel;
        uiManager.resultLabel = this.resultLabel;
        uiManager.spinButton = this.spinButton;
        uiManager.resetButton = this.resetButton;

        // ── SpinController (self-subscribes in onLoad) ──────
        const spinCtrlNode = new Node('SpinController');
        spinCtrlNode.parent = this.node;
        const spinController = spinCtrlNode.addComponent(SpinController);
        spinController.reels = reelControllers;
    }
}

