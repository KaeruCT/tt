import Phaser from 'phaser';
import HudScene from './scenes/hud';
import OfficeScene from './scenes/office';

const zoom = 1.5;
const config = {
  type: Phaser.AUTO,
  width: 640 / zoom,
  height: 360 / zoom,
  backgroundColor: '#0a0806',
  pixelArt: true,
  parent: 'game-container',
  zoom,
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { y: 0 } },
  },
  scene: [OfficeScene, HudScene],
};

const game = new Phaser.Game(config);

// Exposed for Playwright E2E tests
window.__game = game;
