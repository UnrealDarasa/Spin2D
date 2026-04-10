import { _decorator, Component } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager as GameplayManager } from './GameManager';
import { SFXManager } from './SFXManager';
import { SpinController } from './SpinController';
import { UIManager } from './UIManager';
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
@ccclass('SceneManager')
export class SceneManager extends Component {

    // ── Editor-wired references ──────────────────────────────

    @property({ type: UIManager, tooltip: 'UIManager component (wire the UIManager node)' })
    public uiManager: UIManager | null = null;

    @property({ type: SpinController, tooltip: 'SpinController component (wire the SpinController node)' })
    public spinController: SpinController | null = null;

    @property({ type: GameplayManager, tooltip: 'GameManager component (wire the GameManager node)' })
    public gameplayManager: GameplayManager | null = null;

    @property({ type: SFXManager, tooltip: 'SFXManager component (wire the SFXManager node)' })
    public sfxManager: SFXManager | null = null;

}

