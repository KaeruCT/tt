import Phaser from 'phaser';
import Employee from '../sprites/Employee';
import { createFinder, createGrid } from '../utils/path';
import { randValue, randBool } from '../utils/rand';
import { snap } from '../utils/misc';
import { RELIEF_TYPES } from '../utils/relief';

const NAMES = ['Cezar', 'Andres', 'Oscar', 'Sahil', 'Catherine', 'Anna'];

const getObjects = (map, type) => map.filterObjects('Objects', o => {
    const typeProp = o.properties.find(p => p.name === 'type') || {};
    return typeProp.value === type;
});

const createReliefPoint = (p, supports) => {
    const x = snap(p.x);
    const y = snap(p.y);
    return {
        id: `${x}-${y}-${supports.join(',')}`,
        x,
        y,
        supports,
        busy: false,
    }
};

const getEmployeesCoords = (employees, exclude) => {
    return employees.getChildren().filter(e => e !== exclude).map(e => ({
        x: snap(e.x),
        y: snap(e.y),
    }));
};

export default class PlatformerScene extends Phaser.Scene {
    preload() {
        this.load.image('Dungeon_Tileset', 'assets/2d/tileset/Dungeon_Tileset.png');
        this.load.spritesheet('employee', 'assets/2d/char.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/maps/1.json');
    }

    create() {
        this.map = this.make.tilemap({ key: 'map' });
        const tileset = this.map.addTilesetImage('Dungeon_Tileset');
        const underLayer = this.map.createStaticLayer('Below', tileset, 0, 0);
        const worldLayer = this.map.createStaticLayer('World', tileset, 0, 0);
        const aboveLayer = this.map.createStaticLayer('Above', tileset, 0, 0);
        aboveLayer.setDepth(10);
        worldLayer.setCollisionByProperty({ collides: true });
        this.worldLayer = worldLayer;

        this.deskPoints = getObjects(this.map, 'desk');
        this.peePoints = getObjects(this.map, 'pee');
        this.pooPoints = getObjects(this.map, 'poo');

        this.reliefPoints = [];
        this.peePoints.forEach(p => this.reliefPoints.push(createReliefPoint(p, ['pee'])));
        this.pooPoints.forEach(p => this.reliefPoints.push(createReliefPoint(p, ['pee', 'poo'])));

        this.employees = this.add.group();
        //this.deskPoints = [this.deskPoints[0]];
        this.deskPoints.forEach(p => {
            const meta = {
                name: randValue(NAMES), desk: {
                    id: 'desk',
                    x: snap(p.x),
                    y: snap(p.y),
                }
            };
            const e = new Employee(this, meta, p.x, p.y, createFinder(tileset));
            e.pathFinder.setGrid(createGrid(this.map, 'World', getEmployeesCoords(this.employees, e)));
            //this.physics.add.collider(employee, worldLayer); TODO: physics fucks up the path following :(
            this.employees.add(e);
        });
        console.log(this.employees);
    }

    update(time, delta) {
        const t = Math.floor(time * 100);
        this.employees.getChildren().forEach(e => {
            if (t % 10 === 0) {
                e.pathFinder.setGrid(createGrid(this.map, 'World', getEmployeesCoords(this.employees, e)));
            }
            if (!e.relief) {
            // if (t % 100 === 0 && !e.relief && randBool(0.2)) {
                e.setRelief(randBool() ? RELIEF_TYPES.pee : RELIEF_TYPES.poo);
                e.setDestination(randValue(this.reliefPoints)).then(destination => {
                    if (destination.busy) {
                        console.log(e.meta.name, 'went to', destination.id, 'but it was busy');
                        e.goToDesk();
                    } else {
                        e.startToRelieve();
                    }
                }).catch(() => {
                    e.goToDesk();
                });
            } 
            e.update();
        });
        this.employees.getChildren().forEach(c => {
            c.setDepth(c.y);
        });
    }
}