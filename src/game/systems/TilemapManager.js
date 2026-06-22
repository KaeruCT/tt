import EasyStar from 'easystarjs';

export const TILE_SIZE = 16;
export const MAP_COLS = 30;
export const MAP_ROWS = 20;

// Tile indices in the Dungeon_Tileset (30×30 grid of 16×16 tiles).
// 0-based (Phaser blank tilemap firstgid=0). These match tiles used in the
// original Tiled maps: Tiled GID 7 → index 6 (floor), GID 182 → 181 (wall).
const TILE_FLOOR_STONE = 6;
const TILE_FLOOR_CARPET = 62;
const TILE_WALL = 181;
const TILE_ROCK = 181;

export const TILE_TYPES = {
  ROCK: 'rock',
  STONE_FLOOR: 'stone_floor',
  CARPET_FLOOR: 'carpet_floor',
  WALL: 'wall',
};

const TILE_TYPE_TO_INDEX = {
  [TILE_TYPES.ROCK]: TILE_ROCK,
  [TILE_TYPES.STONE_FLOOR]: TILE_FLOOR_STONE,
  [TILE_TYPES.CARPET_FLOOR]: TILE_FLOOR_CARPET,
  [TILE_TYPES.WALL]: TILE_WALL,
};

const DIG_COST = 20;
const CARPET_COST = 15;

export default class TilemapManager {
  constructor(scene) {
    this.scene = scene;
    this.cols = MAP_COLS;
    this.rows = MAP_ROWS;

    // Logical grid: each cell holds { type, object }
    // 'object' can be 'desk', 'pee', 'poo', 'sink', 'shower', 'decor', or null
    this.grid = [];

    // Phaser tilemap and layer
    this.map = null;
    this.tileset = null;
    this.floorLayer = null;
    this.wallLayer = null;
    this.objectLayer = null;

    // Pathfinding
    this.finder = new EasyStar.js();
    this.finder.enableSync();
    this.finder.setAcceptableTiles([0]); // walkable = floor tile index 0
  }

  /**
   * Generate the initial map: a starting room surrounded by diggable rock.
   */
  create(tilesetKey, tilesetImageKey) {
    // Create blank tilemap
    this.map = this.scene.make.tilemap({
      data: [],
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: this.cols,
      height: this.rows,
    });

    this.tileset = this.map.addTilesetImage(tilesetImageKey, tilesetKey, TILE_SIZE, TILE_SIZE);

    // Create layers (3.16.2: use createBlankDynamicLayer, not createBlankLayer)
    this.floorLayer = this.map.createBlankDynamicLayer('floor', this.tileset, 0, 0, this.cols, this.rows);
    this.wallLayer = this.map.createBlankDynamicLayer('walls', this.tileset, 0, 0, this.cols, this.rows);
    this.objectLayer = this.map.createBlankDynamicLayer('objects', this.tileset, 0, 0, this.cols, this.rows);

    this.wallLayer.setDepth(5);

    // Initialize grid: everything is rock
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x] = { type: TILE_TYPES.ROCK, object: null };
        this.wallLayer.putTileAt(TILE_TYPE_TO_INDEX[TILE_TYPES.ROCK], x, y);
        this.floorLayer.putTileAt(-1, x, y);
      }
    }

    // Carve starting room (5×5 in center)
    const startCX = Math.floor(this.cols / 2);
    const startCY = Math.floor(this.rows / 2);
    const roomW = 5;
    const roomH = 5;
    for (let y = startCY - Math.floor(roomH / 2); y < startCY + Math.ceil(roomH / 2); y++) {
      for (let x = startCX - Math.floor(roomW / 2); x < startCX + Math.ceil(roomW / 2); x++) {
        if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
          this.setTileType(x, y, TILE_TYPES.STONE_FLOOR);
        }
      }
    }

    this._rebuildPathfinding();
  }

  /**
   * Get the tile type at grid position.
   */
  getTileType(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
    return this.grid[y][x].type;
  }

  /**
   * Get the placed object at grid position (null if none).
   */
  getObject(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
    return this.grid[y][x].object;
  }

  /**
   * Set the tile type at a position. Updates visuals + grid.
   */
  setTileType(x, y, type) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
    this.grid[y][x].type = type;

    const tileIndex = TILE_TYPE_TO_INDEX[type];
    if (type === TILE_TYPES.ROCK || type === TILE_TYPES.WALL) {
      this.floorLayer.putTileAt(-1, x, y);
      this.wallLayer.putTileAt(tileIndex, x, y);
    } else {
      this.wallLayer.putTileAt(-1, x, y);
      this.floorLayer.putTileAt(tileIndex, x, y);
    }
  }

  /**
   * Set a placed object at a position.
   */
  setObject(x, y, objectType) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
    this.grid[y][x].object = objectType;
  }

  /**
   * Dig rock → stone floor. Returns true if successful.
   */
  dig(x, y) {
    if (this.getTileType(x, y) !== TILE_TYPES.ROCK) return false;
    this.setTileType(x, y, TILE_TYPES.STONE_FLOOR);
    this._rebuildPathfinding();
    return true;
  }

  /**
   * Set carpet floor on an already-dug stone floor tile.
   */
  setCarpet(x, y) {
    if (this.getTileType(x, y) !== TILE_TYPES.STONE_FLOOR) return false;
    if (this.getObject(x, y)) return false; // Can't carpet under objects
    this.setTileType(x, y, TILE_TYPES.CARPET_FLOOR);
    return true;
  }

  /**
   * Can a floor tile accept a placed object?
   */
  canPlaceObject(x, y) {
    const type = this.getTileType(x, y);
    if (type !== TILE_TYPES.STONE_FLOOR && type !== TILE_TYPES.CARPET_FLOOR) return false;
    if (this.getObject(x, y)) return false;
    return true;
  }

  /**
   * Check if a tile is walkable (for pathfinding).
   */
  isWalkable(x, y) {
    const type = this.getTileType(x, y);
    return type === TILE_TYPES.STONE_FLOOR || type === TILE_TYPES.CARPET_FLOOR;
  }

  /**
   * Get all tiles of a specific floor type.
   */
  getTilesOfType(type) {
    const tiles = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x].type === type) {
          tiles.push({ x, y });
        }
      }
    }
    return tiles;
  }

  /**
   * Get all empty floor tiles (no object placed).
   */
  getEmptyFloorTiles() {
    const tiles = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if ((cell.type === TILE_TYPES.STONE_FLOOR || cell.type === TILE_TYPES.CARPET_FLOOR) && !cell.object) {
          tiles.push({ x, y });
        }
      }
    }
    return tiles;
  }

  /**
   * Get all empty desk slots (floor tiles that could hold a desk).
   */
  getEmptyDeskSlots() {
    return this.getEmptyFloorTiles();
  }

  /**
   * Get all placed objects of a specific type with their grid positions.
   */
  getObjectsOfType(objectType) {
    const objects = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x].object === objectType) {
          objects.push({ x, y, gridX: x, gridY: y });
        }
      }
    }
    return objects;
  }

  /**
   * Convert grid coordinates to pixel center.
   */
  gridToPixel(x, y) {
    return {
      x: x * TILE_SIZE + TILE_SIZE / 2,
      y: y * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  /**
   * Convert pixel coordinates to grid position.
   */
  pixelToGrid(px, py) {
    return {
      x: Math.floor(px / TILE_SIZE),
      y: Math.floor(py / TILE_SIZE),
    };
  }

  /**
   * Get a 2D array suitable for EasyStar pathfinding.
   * 0 = walkable, 1 = blocked.
   */
  getPathfindingGrid() {
    const grid = [];
    for (let y = 0; y < this.rows; y++) {
      grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        grid[y][x] = this.isWalkable(x, y) ? 0 : 1;
      }
    }
    return grid;
  }

  /**
   * Find a path between two grid positions.
   */
  findPath(fromX, fromY, toX, toY, callback) {
    this.finder.findPath(fromX, fromY, toX, toY, callback);
    this.finder.calculate();
  }

  /**
   * Get cost for digging a tile.
   */
  getDigCost() {
    return DIG_COST;
  }

  /**
   * Get cost for carpeting a tile.
   */
  getCarpetCost() {
    return CARPET_COST;
  }

  _rebuildPathfinding() {
    this.finder.setGrid(this.getPathfindingGrid());
  }
}
