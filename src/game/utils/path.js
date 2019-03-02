import EasyStar from 'easystarjs';
const OBSTACLE = 999999;
export const createFinder = (tileset) => {
    const finder = new EasyStar.js();

    const properties = tileset.tileProperties;
    const acceptableTiles = [-1];

    for (var i = tileset.firstgid - 1; i < tileset.total; i++) {
        if (!properties[i]) {
            acceptableTiles.push(i + 1);
            continue;
        }
        if (!properties[i].collides) acceptableTiles.push(i + 1);
        if (properties[i].cost) Game.finder.setTileCost(i + 1, properties[i].cost);
    }
    finder.setAcceptableTiles(acceptableTiles);
    finder.enableSync();
    return finder;
};

export const createGrid = (map, layer, obstacles) => {
    var grid = [];
    for (let y = 0; y < map.height; y++) {
        const col = [];
        for (let x = 0; x < map.width; x++) {
            col.push(getTileID(map, layer, x, y));
        }
        grid.push(col);
    }
    obstacles.forEach(o => {
        grid[o.x][o.y] = OBSTACLE;
    });
    return grid;
};

const getTileID = (map, layer, x, y) => {
    const tile = map.getTileAt(x, y, true, layer);
    return tile.index;
};