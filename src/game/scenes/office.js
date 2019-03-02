import Phaser from 'phaser';
import Employee from '../sprites/Employee';

export default class PlatformerScene extends Phaser.Scene {
    preload() {
        this.load.image('Dungeon_Tileset', 'assets/2d/tileset/Dungeon_Tileset.png');
        this.load.spritesheet('employee', 'assets/2d/char.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/maps/1.json');
    }

    create() {
        this.employees = [];

        const map = this.make.tilemap({ key: 'map' });
        const tileset = map.addTilesetImage('Dungeon_Tileset');
        const underLayer = map.createStaticLayer('Below', tileset, 0, 0);
        const worldLayer = map.createStaticLayer('World', tileset, 0, 0);
        const aboveLayer = map.createStaticLayer('Above', tileset, 0, 0);
        aboveLayer.setDepth(10);
        worldLayer.setCollisionByProperty({ collides: true });

        const employee = new Employee(this, 100, 100);
        this.physics.add.collider(employee.sprite, worldLayer);
        this.employees.push(employee);
    }

     update(time, delta) {
        this.employees.forEach(e => e.update());
    }
}