import Phaser from 'phaser';
import office from './scenes/office';

const config = {
    type: Phaser.AUTO,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    pixelArt: true,
    parent: 'game-container',
    zoom: 1.5,
    physics: {
        default: 'arcade',
        arcade: { debug: false, gravity: { y: 0 } }
    },
    scene: office
};

new Phaser.Game(config);