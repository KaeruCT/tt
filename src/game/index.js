import Phaser from 'phaser';

import OfficeScene from './scenes/office';
import HudScene from './scenes/hud';

const zoom = 1.5;
const config = {
    type: Phaser.AUTO,
    width: 360/zoom,
    height: 640/zoom,
    backgroundColor: '#000',
    pixelArt: true,
    parent: 'game-container',
    zoom,
    physics: {
        default: 'arcade',
        arcade: { debug: false, gravity: { y: 0 } }
    },
    scene: [OfficeScene, HudScene],
};

new Phaser.Game(config);