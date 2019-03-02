import Phaser from 'phaser';
import Employee from '../sprites/Employee';
import { createFinder, createGrid } from '../utils/path';
import { randValue, randBool } from '../utils/rand';
import { snap, SKIN_COLORS } from '../utils/misc';
import { RELIEF_TYPES } from '../utils/relief';

const NAMES = [
    'Abdullah', 'Luciano', 'Oliver', 'Cezar',
    'Andres', 'Oscar', 'Sahil', 'Catherine', 'Anna',
    'Alvaro', 'David', 'Ivan', 'Kate', 'Carina', 'Francisco',
];

const getObjects = (map, type) => map.filterObjects('Objects', o => {
    const typeProp = o.properties.find(p => p.name === 'type') || {};
    return typeProp.value === type;
});

const findReliefPoint = (reliefPoints, type) => {
    return randValue(reliefPoints.filter(p => p.supports.includes(type)));
};

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
        this.peePoints = getObjects(this.map, RELIEF_TYPES.pee.id);
        this.pooPoints = getObjects(this.map, RELIEF_TYPES.poo.id);

        this.reliefPoints = [];
        this.peePoints.forEach(p => this.reliefPoints.push(createReliefPoint(p, [RELIEF_TYPES.pee.id])));
        this.pooPoints.forEach(p => this.reliefPoints.push(createReliefPoint(p, [RELIEF_TYPES.poo.id, RELIEF_TYPES.pee.id])));
        // this.reliefPoints = [this.reliefPoints[0]];

        this.employees = this.add.group();

        let skini = 0;
        this.deskPoints.forEach(p => {
            // create an employee for each desk
            const meta = {
                name: randValue(NAMES),
                desk: {
                    id: 'desk',
                    x: snap(p.x),
                    y: snap(p.y),
                },
                tint: SKIN_COLORS[(skini++) % SKIN_COLORS.length]
            };
            const e = new Employee(this, meta, p.x, p.y, createFinder(tileset));
            e.pathFinder.setGrid(createGrid(this.map, 'World', getEmployeesCoords(this.employees, e)));
            //this.physics.add.collider(employee, worldLayer); TODO: physics fucks up the path following :(
            this.employees.add(e);
            e.body.setCollideWorldBounds(true);
        });
    }

    update(time, delta) {
        const t = Math.floor(time * 100);

        const triggerRestroomAttempt = (e) => {
            const reliefPoint = findReliefPoint(this.reliefPoints, e.relief.id);

            if (!reliefPoint) {
                console.log('There is no proper restroom for', e.meta.name);
                e.giveUp();
                return;
            }
            
            e.setDestination(reliefPoint).then(destination => {
                if (destination.busy) {
                    console.log(e.meta.name, 'went to', destination.id, 'but it was busy');
                    e.giveUp();
                } else {
                    e.startToRelieve();
                }
            });
        };

        this.employees.getChildren().forEach(e => {
            if (t % 10 === 0) {
                // update path finder (not so often)
                e.pathFinder.setGrid(createGrid(this.map, 'World', getEmployeesCoords(this.employees, e)));
            }
            
           if (t % 100 === 0 && !e.relief && randBool(0.2)) {
                // somebody has to go...
                e.setRelief(randBool() ? RELIEF_TYPES.pee : RELIEF_TYPES.poo);
                triggerRestroomAttempt(e);
            }

            if (e.relief && e.reliefAttempts) {
                // somebody wasn't able to go, needs to check restroom again
                if (t % 50 === 0 && randBool(0.5)) {
                    triggerRestroomAttempt(e);
                }
            }

            e.update(time);
        });

        this.employees.getChildren().forEach(c => {
            // update z depth to render sprites in the right order
            c.setDepth(c.y);
        });
    }
}