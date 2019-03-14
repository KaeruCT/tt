import Phaser from 'phaser';
import office from './scenes/office';
const zoom = 1.5;
const config = {
    type: Phaser.AUTO,
    width: 360/zoom,
    height: 640/zoom,
    backgroundColor: '#000',
    pixelArt: true,
    parent: 'game-container',
    zoom: zoom,
    physics: {
        default: 'arcade',
        arcade: { debug: false, gravity: { y: 0 } }
    },
    scene: office
};

new Phaser.Game(config);