import EasyStar from 'easystarjs';
const EMPTY = -1;
const OBSTACLE = 999999;
export const createFinder = (tileset) => {
    const finder = new EasyStar.js();

    const properties = tileset.tileProperties;
    const acceptableTiles = [EMPTY];

    for (let i = tileset.firstgid - 1; i < tileset.total; i++) {
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
    const grid = [];
    for (let y = 0; y < map.height; y++) {
        const col = [];
        for (let x = 0; x < map.width; x++) {
            col.push(getTileID(map, layer, x, y));
        }
        grid.push(col);
    }
    let ignore;
    obstacles.forEach(o => {
        grid[o.x][o.y] = OBSTACLE;
        if (o.ignore) ignore = o;
    });
    if (ignore) grid[ignore.x][ignore.y] = EMPTY;
    return grid;
};

const getTileID = (map, layer, x, y) => {
    const tile = map.getTileAt(x, y, true, layer);
    return tile.index;
};
