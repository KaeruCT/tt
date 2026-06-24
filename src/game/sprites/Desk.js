import Phaser from 'phaser';
import { TILE_SIZE } from '../systems/TilemapManager';

// Tile indices from the Dungeon_Tileset (0-based, 30x30 grid of 16px tiles).
// Row 7, cols 18-24: tables/desks. Row 8, cols 18-20: wooden furniture.
const DESK_TILES = [228, 229, 230, 231, 258, 259, 260];

/**
 * Renders a desk sprite using a tile from the dungeon tileset image.
 * Uses setCrop to show just the one 16x16 tile from the 30x30 grid.
 */
export default class Desk extends Phaser.GameObjects.Image {
  constructor(scene, gridX, gridY) {
    const px = gridX * TILE_SIZE + TILE_SIZE / 2;
    const py = gridY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, px, py, 'Dungeon_Tileset');

    scene.add.existing(this);
    this.setOrigin(0.5, 0.75);
    this.setDepth(10);

    // Pick a random desk variant
    const tileIdx = DESK_TILES[Math.floor(Math.random() * DESK_TILES.length)];
    const col = tileIdx % 30;
    const row = Math.floor(tileIdx / 30);
    this.setCrop(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    // setCrop doesn't resize the displayed area — fix it
    this.setDisplaySize(TILE_SIZE, TILE_SIZE);
  }
}
