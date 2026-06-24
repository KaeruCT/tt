import Phaser from 'phaser';
import { TILE_SIZE } from '../systems/TilemapManager';

// Tile indices from the Dungeon_Tileset (0-based, 30x30 grid of 16px tiles).
// Row 8, cols 22-24: plants/statues. Row 9, cols 18-20: greenery.
const DECOR_TILES = [262, 263, 264, 288, 289, 290];

/**
 * Renders a decor sprite (plant/statue) using a tile from the tileset.
 */
export default class Decor extends Phaser.GameObjects.Image {
  constructor(scene, gridX, gridY) {
    const px = gridX * TILE_SIZE + TILE_SIZE / 2;
    const py = gridY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, px, py, 'Dungeon_Tileset');

    scene.add.existing(this);
    this.setOrigin(0.5, 0.75);
    this.setDepth(10);

    // Pick a random decor variant
    const tileIdx = DECOR_TILES[Math.floor(Math.random() * DECOR_TILES.length)];
    const col = tileIdx % 30;
    const row = Math.floor(tileIdx / 30);
    this.setCrop(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    // setCrop doesn't resize the displayed area — fix it
    this.setDisplaySize(TILE_SIZE, TILE_SIZE);
  }
}
