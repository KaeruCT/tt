import Phaser from 'phaser';
import { light } from './common';

export default class Button extends Phaser.GameObjects.Text {
    constructor(scene, x, y, text = '', style = light) {
        super(scene, x, y, text, style);

        this.setScrollFactor(0)
            .setDepth(999);
    }
}