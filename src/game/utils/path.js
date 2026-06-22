/**
 * Pathfinding utilities.
 * Pathfinding is now handled directly by TilemapManager via EasyStar.
 * This file is kept for backward compatibility and exports.
 */
import EasyStar from 'easystarjs';

/**
 * Create an EasyStar finder for a given tileset.
 * @deprecated Use TilemapManager.findPath() instead.
 */
export const createFinder = (tileset) => {
  const finder = new EasyStar.js();
  const properties = tileset.tileProperties;
  const acceptableTiles = [-1];

  for (let i = tileset.firstgid - 1; i < tileset.total; i++) {
    if (!properties[i]) {
      acceptableTiles.push(i + 1);
      continue;
    }
    if (!properties[i].collides) acceptableTiles.push(i + 1);
  }
  finder.setAcceptableTiles(acceptableTiles);
  finder.enableSync();
  return finder;
};

/**
 * Create a 2D grid from a Tiled map layer.
 * @deprecated Use TilemapManager.getPathfindingGrid() instead.
 */
export const createGrid = (map, layer, obstacles) => {
  const grid = [];
  for (let y = 0; y < map.height; y++) {
    const col = [];
    for (let x = 0; x < map.width; x++) {
      col.push(getTileID(map, layer, x, y));
    }
    grid.push(col);
  }
  obstacles.forEach((o) => {
    grid[o.x][o.y] = 999999;
  });
  return grid;
};

const getTileID = (map, layer, x, y) => {
  const tile = map.getTileAt(x, y, true, layer);
  return tile ? tile.index : -1;
};
