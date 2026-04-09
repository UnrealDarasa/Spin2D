import { _decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { GameConfig } from './GameConfig';
const { ccclass, property } = _decorator;

/**
 * Controls a single vertical reel containing 3 symbol Sprites.
 *
 * This is a pure animation component — it has no knowledge of game state,
 * UI, or other controllers.  SpinController calls `spinReel()` directly
 * because it owns these child components; all cross-system communication
 * goes through director events.
 *
 * Hierarchy expected:
 *   Reel_N  ← this component
 *     ├── Symbol_0  (Node with Sprite)
 *     ├── Symbol_1  (Node with Sprite)
 *     └── Symbol_2  (Node with Sprite)
 *
 * To use:
 *   - Wire all 3 symbol nodes to symbolSprites array
 *   - Wire available symbol SpriteFrames to symbolFrames array in the Inspector
 */
@ccclass('ReelController')
export class ReelController extends Component {

    @property({ type: [Node], tooltip: 'The 3 symbol nodes top→bottom (each should have a Sprite component)' })
    public symbolSprites: Node[] = [];

    @property({ type: [SpriteFrame], tooltip: 'Available symbol SpriteFrames to randomly display' })
    public symbolFrames: SpriteFrame[] = [];

    @property({ tooltip: 'Vertical distance per symbol slot (px)' })
    public symbolHeight: number = 80;

    /** The middle symbol SpriteFrame after the last spin. */
    private _finalSymbol: SpriteFrame | null = null;

    public get finalSymbol(): SpriteFrame | null {
        return this._finalSymbol;
    }

    // ── Public API ───────────────────────────────────────────

    /** Randomise all visible symbols by assigning random SpriteFrames. */
    public randomiseSymbols(): void {
        if (this.symbolFrames.length === 0) {
            console.warn('[ReelController] No symbol frames assigned!');
            return;
        }

        for (const symbolNode of this.symbolSprites) {
            const sprite = symbolNode.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.symbolFrames[Math.floor(Math.random() * this.symbolFrames.length)];
            }
        }
    }

    /**
     * Play spin animation for `duration` seconds.
     * Returns a Promise that resolves when the reel has stopped.
     */
    public spinReel(duration: number): Promise<void> {
        return new Promise<void>((resolve) => {
            const totalTicks = Math.floor(duration / 0.1); // symbol changes
            let tick = 0;

            // Rapid symbol shuffle via repeating tween
            const startY = this.node.position.y;
            const dropDist = this.symbolHeight;

            const spinAction = tween(this.node)
                .repeat(totalTicks,
                    tween(this.node)
                        // slide down one symbol height
                        .to(0.08, { position: new Vec3(this.node.position.x, startY - dropDist, 0) }, { easing: 'linear' })
                        .call(() => {
                            // snap back & randomise
                            this.node.setPosition(this.node.position.x, startY, 0);
                            this.randomiseSymbols();
                            tick++;
                        })
                )
                // ease-out final drop
                .to(0.25, { position: new Vec3(this.node.position.x, startY - dropDist * 0.5, 0) }, { easing: 'backOut' })
                .call(() => {
                    this.node.setPosition(this.node.position.x, startY, 0);
                    this.randomiseSymbols();
                    // Store the middle symbol's current frame
                    const middleSymbolNode = this.symbolSprites[1];
                    if (middleSymbolNode) {
                        const sprite = middleSymbolNode.getComponent(Sprite);
                        if (sprite) {
                            this._finalSymbol = sprite.spriteFrame;
                        }
                    }
                    resolve();
                })
                .start();
        });
    }
}
