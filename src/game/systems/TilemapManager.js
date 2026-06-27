import EasyStar from 'easystarjs';

export const TILE_SIZE = 16;
export const MAP_COLS = 30;
export const MAP_ROWS = 20;

// -----------------------------------------------------------------
// 0x72 Dungeon Tileset — autotile indices (0-based, 30-col grid)
// -----------------------------------------------------------------
// Floor 9-piece border system (Below layer in original Tiled maps):
//   31  32  33  34   ← top-left, top, top, top-right
//   61  62  63  64   ← left, CENTER, CENTER, right
//   91  92  93  94   ← bot-left, bot, bot, bot-right
//
// Wall face tiles (south-facing brick wall):
//   1, 2, 3, 4      ← wall front with brick pattern
// Wall side tiles:
//   0  = left side  (bricks face east)
//   5  = right side (bricks face west)
// Wall corners/transitions:
//   120 = bottom-left corner
//   125 = bottom-right corner
// Decorative floor: 21 (checkerboard pattern)
// -----------------------------------------------------------------

// Floor edge lookup: key = "N,S,W,E" booleans → tile index
// N/S/W/E = true when that neighbor is a wall/rock
const FLOOR_TILE = {
  center: 62,
  top: 32,
  bottom: 92,
  left: 61,
  right: 64,
  topLeft: 31,
  topRight: 34,
  bottomLeft: 91,
  bottomRight: 94,
  decorative: 21,
};

// Wall variants for south-facing wall face
const WALL_FACES = [1, 2, 3, 4];

export const TILE_TYPES = {
  ROCK: 'rock',
  STONE_FLOOR: 'stone_floor',
  CARPET_FLOOR: 'carpet_floor',
  WALL: 'wall',
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

  // ------- Autotile helpers -------

  /** Check if a cell is wall or rock (or out of bounds = treat as wall) */
  _isWallOrRock(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return true;
    const t = this.grid[y][x].type;
    return t === TILE_TYPES.ROCK || t === TILE_TYPES.WALL;
  }

  /** Check if a cell is any floor type */
  _isFloor(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
    const t = this.grid[y][x].type;
    return t === TILE_TYPES.STONE_FLOOR || t === TILE_TYPES.CARPET_FLOOR;
  }

  /** Pick the right floor tile based on wall neighbors (9-piece border) */
  _selectFloorTile(x, y) {
    const n = this._isWallOrRock(x, y - 1);
    const s = this._isWallOrRock(x, y + 1);
    const w = this._isWallOrRock(x - 1, y);
    const e = this._isWallOrRock(x + 1, y);

    // Corner cases first (two adjacent walls)
    if (n && w) return FLOOR_TILE.topLeft;
    if (n && e) return FLOOR_TILE.topRight;
    if (s && w) return FLOOR_TILE.bottomLeft;
    if (s && e) return FLOOR_TILE.bottomRight;

    // Edge cases (one wall)
    if (n) return FLOOR_TILE.top;
    if (s) return FLOOR_TILE.bottom;
    if (w) return FLOOR_TILE.left;
    if (e) return FLOOR_TILE.right;

    // Interior — no adjacent walls
    return FLOOR_TILE.center;
  }

  /** Pick the right wall tile based on floor neighbors */
  _selectWallTile(x, y) {
    const floorN = this._isFloor(x, y - 1);
    const floorS = this._isFloor(x, y + 1);
    const floorE = this._isFloor(x + 1, y);
    const floorW = this._isFloor(x - 1, y);

    // South-facing wall (floor below) — brick face
    if (floorS && floorW) return 120; // bottom-left corner
    if (floorS && floorE) return 125; // bottom-right corner
    if (floorS) return WALL_FACES[(x * 7 + y * 13) % WALL_FACES.length];

    // North-facing wall (floor above) — wall-floor transition header
    // Tiles 121-124 have bright brick header on top facing the room
    if (floorN && floorW) return 120;
    if (floorN && floorE) return 125;
    if (floorN) return [121, 122, 123, 124][(x * 7 + y * 13) % 4];

    // Side walls
    if (floorE) return 0; // left side (bricks face east)
    if (floorW) return 5; // right side (bricks face west)

    // Interior wall — no tile (dark background shows through)
    return -1;
  }

  /** Update the visual tile for a single cell based on its type + neighbors */
  _refreshTile(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;

    const type = this.grid[y][x].type;

    if (type === TILE_TYPES.ROCK || type === TILE_TYPES.WALL) {
      // Wall/rock: select context-sensitive wall tile
      this.floorLayer.putTileAt(-1, x, y);
      const idx = this._selectWallTile(x, y);
      if (idx >= 0) {
        this.wallLayer.putTileAt(idx, x, y);
      } else {
        this.wallLayer.putTileAt(-1, x, y); // no tile → dark background
      }
    } else {
      // Floor: select context-sensitive floor tile
      this.wallLayer.putTileAt(-1, x, y);
      const idx = this._selectFloorTile(x, y);
      this.floorLayer.putTileAt(idx, x, y);

      // Carpet uses decorative center tile instead of plain
      if (type === TILE_TYPES.CARPET_FLOOR && idx === FLOOR_TILE.center) {
        this.floorLayer.putTileAt(FLOOR_TILE.decorative, x, y);
      }
    }
  }

  /** Refresh this cell AND all its neighbors (needed when a cell changes type) */
  _refreshArea(x, y) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        this._refreshTile(x + dx, y + dy);
      }
    }
  }

  // ------- Public API -------

  /**
   * Generate the initial map: a starting room surrounded by diggable rock.
   */
  create(tilesetKey, tilesetImageKey) {
    this.map = this.scene.make.tilemap({
      data: [],
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: this.cols,
      height: this.rows,
    });

    this.tileset = this.map.addTilesetImage(tilesetImageKey, tilesetKey, TILE_SIZE, TILE_SIZE);

    this.floorLayer = this.map.createBlankDynamicLayer('floor', this.tileset, 0, 0, this.cols, this.rows);
    this.wallLayer = this.map.createBlankDynamicLayer('walls', this.tileset, 0, 0, this.cols, this.rows);
    this.objectLayer = this.map.createBlankDynamicLayer('objects', this.tileset, 0, 0, this.cols, this.rows);

    this.wallLayer.setDepth(5);

    // Initialize grid: everything is rock
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x] = { type: TILE_TYPES.ROCK, object: null };
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
          this.grid[y][x].type = TILE_TYPES.STONE_FLOOR;
        }
      }
    }

    // Render all tiles with autotile logic
    this._refreshAllTiles();
    this._rebuildPathfinding();
  }

  /** Refresh every tile on the map (used after bulk changes like create/load) */
  _refreshAllTiles() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this._refreshTile(x, y);
      }
    }
  }

  getTileType(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
    return this.grid[y][x].type;
  }

  getObject(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
    return this.grid[y][x].object;
  }

  /**
   * Set the tile type at a position. Updates visuals + neighbors.
   */
  setTileType(x, y, type) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
    this.grid[y][x].type = type;
    this._refreshArea(x, y);
  }

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
    if (this.getObject(x, y)) return false;
    this.setTileType(x, y, TILE_TYPES.CARPET_FLOOR);
    return true;
  }

  canPlaceObject(x, y) {
    const type = this.getTileType(x, y);
    if (type !== TILE_TYPES.STONE_FLOOR && type !== TILE_TYPES.CARPET_FLOOR) return false;
    if (this.getObject(x, y)) return false;
    return true;
  }

  isWalkable(x, y) {
    const type = this.getTileType(x, y);
    return type === TILE_TYPES.STONE_FLOOR || type === TILE_TYPES.CARPET_FLOOR;
  }

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

  getEmptyDeskSlots() {
    return this.getEmptyFloorTiles();
  }

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

  gridToPixel(x, y) {
    return {
      x: x * TILE_SIZE + TILE_SIZE / 2,
      y: y * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  pixelToGrid(px, py) {
    return {
      x: Math.floor(px / TILE_SIZE),
      y: Math.floor(py / TILE_SIZE),
    };
  }

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

  findPath(fromX, fromY, toX, toY, callback) {
    this.finder.findPath(fromX, fromY, toX, toY, callback);
    this.finder.calculate();
  }

  getDigCost() {
    return DIG_COST;
  }

  getCarpetCost() {
    return CARPET_COST;
  }

  _rebuildPathfinding() {
    this.finder.setGrid(this.getPathfindingGrid());
  }

  save() {
    const gridCopy = [];
    for (let y = 0; y < this.rows; y++) {
      gridCopy[y] = [];
      for (let x = 0; x < this.cols; x++) {
        gridCopy[y][x] = {
          type: this.grid[y][x].type,
          object: this.grid[y][x].object,
        };
      }
    }
    return { cols: this.cols, rows: this.rows, grid: gridCopy };
  }

  load(data) {
    if (!data?.grid) return;
    for (let y = 0; y < this.rows && y < data.rows; y++) {
      for (let x = 0; x < this.cols && x < data.cols; x++) {
        if (data.grid[y]?.[x]) {
          this.grid[y][x].type = data.grid[y][x].type;
          this.grid[y][x].object = data.grid[y][x].object || null;
        }
      }
    }
    // Refresh all tile visuals with autotile logic
    this._refreshAllTiles();
    this._rebuildPathfinding();
  }
}
