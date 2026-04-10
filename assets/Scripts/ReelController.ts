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
    private _currentSymbolIndex: number = 0;

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

    /** Highlight the middle (winning) symbol by enabling its first child (highlight node). */
    public highlightWinningSymbol(): void {
        const middleSymbol = this.symbolSprites[1];
        if (middleSymbol && middleSymbol.children.length > 0) {
            middleSymbol.children[0].active = true;
        }
    }

    /** Turn off highlights on all symbols by disabling their first child. */
    public clearHighlights(): void {
        for (const symbolNode of this.symbolSprites) {
            if (symbolNode.children.length > 0) {
                symbolNode.children[0].active = false;
            }
        }
    }

    /**
     * Play spin animation for `duration` seconds, then land with the
     * middle slot showing `symbolFrames[targetMiddleIndex]`.
     *
     * The final reel always shows 3 consecutive symbols in order:
     *   slot 0 (top)    = targetMiddleIndex - 1   (wraps around)
     *   slot 1 (middle) = targetMiddleIndex
     *   slot 2 (bottom) = targetMiddleIndex + 1   (wraps around)
     *
     * During the spin, symbols cycle in consistent order: 0, 1, 2, 3, 4, 0 …
     */
    public spinReel(duration: number, targetMiddleIndex: number): Promise<void> {
        return new Promise<void>((resolve) => {
            const totalTicks = Math.floor(duration / 0.1);
            const totalFrames = this.symbolFrames.length;
            if (totalFrames === 0) { resolve(); return; }

            const startY = this.node.position.y;
            const dropDist = this.symbolHeight;

            // Start cycling from a random position
            this._currentSymbolIndex = Math.floor(Math.random() * totalFrames);

            tween(this.node)
                .repeat(totalTicks,
                    tween(this.node)
                        .to(0.08, { position: new Vec3(this.node.position.x, startY - dropDist, 0) }, { easing: 'linear' })
                        .call(() => {
                            this.node.setPosition(this.node.position.x, startY, 0);
                            this._cycleSymbols();
                        })
                )
                // ease-out final drop
                .to(0.25, { position: new Vec3(this.node.position.x, startY - dropDist * 0.5, 0) }, { easing: 'backOut' })
                .call(() => {
                    this.node.setPosition(this.node.position.x, startY, 0);

                    // Set final symbols in consistent order based on the target middle index
                    this._setSymbolsByMiddleIndex(targetMiddleIndex);

                    resolve();
                })
                .start();
        });
    }

    // ── Private helpers ──────────────────────────────────────

    /**
     * Set all 3 slots to consecutive frames centred on `middleIndex`.
     *   slot 0 (top)    = middleIndex - 1   (wraps: if < 0 → last frame)
     *   slot 1 (middle) = middleIndex
     *   slot 2 (bottom) = middleIndex + 1   (wraps: if > last → 0)
     */
    private _setSymbolsByMiddleIndex(middleIndex: number): void {
        const total = this.symbolFrames.length;
        const indices = [
            (middleIndex - 1 + total) % total,   // top
            middleIndex % total,                   // middle
            (middleIndex + 1) % total,             // bottom
        ];

        for (let i = 0; i < this.symbolSprites.length; i++) {
            const sprite = this.symbolSprites[i]?.getComponent(Sprite);
            if (sprite && i < indices.length) {
                sprite.spriteFrame = this.symbolFrames[indices[i]];
            }
        }

        // Store the middle symbol as the final result symbol
        this._finalSymbol = this.symbolFrames[middleIndex % total];
    }

    /** Cycle all 3 slots to the next consecutive symbols in order: 0,1,2,3,4,0… */
    private _cycleSymbols(): void {
        if (this.symbolFrames.length === 0) return;

        const total = this.symbolFrames.length;
        for (let i = 0; i < this.symbolSprites.length; i++) {
            const sprite = this.symbolSprites[i].getComponent(Sprite);
            if (sprite) {
                const frameIndex = (this._currentSymbolIndex + i) % total;
                sprite.spriteFrame = this.symbolFrames[frameIndex];
            }
        }

        this._currentSymbolIndex = (this._currentSymbolIndex + 1) % total;
    }
}
