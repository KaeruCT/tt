import Phaser from 'phaser';
import { dark } from './common';

const style = {
    initial: { ...dark, backgroundColor: '#aa6' },
    hover: { ...dark, backgroundColor: '#cc8' },
    active: { ...dark, backgroundColor: '#995' },
};

export default class Button extends Phaser.GameObjects.Text {
    constructor(scene, x, y, text, callback) {
        super(scene, x, y, text, style.initial);

        this.setInteractive({ useHandCursor: true })
            .setScrollFactor(0)
            .setDepth(999)
            .on('pointerover', () => this.enterButtonHoverState())
            .on('pointerout', () => this.enterButtonRestState())
            .on('pointerdown', () => this.enterButtonActiveState())
            .on('pointerup', () => {
                this.enterButtonHoverState();
                callback();
            });
    }

    enterButtonHoverState() {
        this.setStyle(style.hover);
    }

    enterButtonRestState() {
        this.setStyle(style.initial);
    }

    enterButtonActiveState() {
        this.setStyle(style.active);
    }
}