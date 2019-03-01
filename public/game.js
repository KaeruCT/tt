let graphics;
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000',
    pixelArt: true,
    parent: 'game-container',
    zoom: 2,
    physics: {
        default: 'arcade',
        arcade: { debug: true, gravity: { y: 0 } }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

new Phaser.Game(config);

function preload() {
    this.load.image('Dungeon_Tileset', 'assets/2d/tileset/Dungeon_Tileset.png');
    this.load.image('furniture', 'assets/2d/furniture.png');
    this.load.tilemapTiledJSON('map', 'assets/maps/1.json');
}

function create() {
    const map = this.make.tilemap({ key: 'map' });
    const tileset = map.addTilesetImage('Dungeon_Tileset');
    const underLayer = map.createStaticLayer('Below', tileset, 0, 0);
    const worldLayer = map.createStaticLayer('World', tileset, 0, 0);
    const aboveLayer = map.createStaticLayer('Above', tileset, 0, 0);
    worldLayer.setCollisionBetween(1, 3);

}

function update() {

}
