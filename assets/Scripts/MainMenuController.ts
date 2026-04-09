import { _decorator, Component, director, Button } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Main Menu scene controller.
 * Shows a "Play" button that transitions to the Gameplay scene.
 */
@ccclass('MainMenuController')
export class MainMenuController extends Component {

    @property({ type: Button, tooltip: 'Play button to start the game' })
    public playButton: Button | null = null;

    start() {
        if (this.playButton) {
            this.playButton.node.on(Button.EventType.CLICK, this._onPlayClicked, this);
        }
    }

    private _onPlayClicked(): void {
        director.loadScene('Gameplay');
    }
}
