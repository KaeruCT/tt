import Phaser from 'phaser';
import { TILE_SIZE } from '../systems/TilemapManager';

// 0x72 Dungeon Tileset workstation pieces (0-based, 30x30 grid of 16px tiles).
// Tiles 10/11/40/41 are the proper 2-wide office computer desk.
const WORKSTATION_TILES = [
  [10, 11],
  [40, 41],
];

const WORKSTATION_TEXTURE = 'office-computer-desk';

function ensureWorkstationTexture(scene) {
  if (scene.textures.exists(WORKSTATION_TEXTURE)) return;

  const source = scene.textures.get('Dungeon_Tileset').source[0].image;
  const canvas = scene.textures.createCanvas(WORKSTATION_TEXTURE, TILE_SIZE * 2, TILE_SIZE * 2);
  const context = canvas.getContext();
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, TILE_SIZE * 2, TILE_SIZE * 2);

  for (let row = 0; row < WORKSTATION_TILES.length; row++) {
    for (let col = 0; col < WORKSTATION_TILES[row].length; col++) {
      const tileIndex = WORKSTATION_TILES[row][col];
      const sx = (tileIndex % 30) * TILE_SIZE;
      const sy = Math.floor(tileIndex / 30) * TILE_SIZE;
      context.drawImage(source, sx, sy, TILE_SIZE, TILE_SIZE, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  canvas.refresh();
}

/** Renders a 2-wide computer workstation. Employees stand on the tile in front of it. */
export default class Desk extends Phaser.GameObjects.Image {
  constructor(scene, gridX, gridY) {
    ensureWorkstationTexture(scene);

    const px = gridX * TILE_SIZE;
    const py = (gridY - 2) * TILE_SIZE;
    super(scene, px, py, WORKSTATION_TEXTURE);

    scene.add.existing(this);
    this.setOrigin(0, 0);
    this.setDepth(9);
  }
}
