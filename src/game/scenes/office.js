import Phaser from 'phaser';
import Employee from '../sprites/Employee';
import { createFinder, createGrid } from '../utils/path';
import { randValue, randBool } from '../utils/rand';
import { snap, SKIN_COLORS } from '../utils/misc';
import { RELIEF_TYPES } from '../logic/relief';
import Button from '../ui/Button';

const NAMES = [
    'Abdullah', 'Luciano', 'Oliver', 'Cezar', 'Julio', 'Alejandro',
    'Andres', 'Oscar', 'Sahil', 'Catherine', 'Anna', 'Omer',
    'Alvaro', 'David', 'Ivan', 'Kate', 'Carina', 'Francisco',
];

class Business {
    constructor() {
        this.name = 'Big Co. Inc';
        this.funds = 100;
    }

    addFunds(inc) {
        this.funds += inc;
    }

    takeFunds(dec) {
        this.funds -= dec;
    }

    getFunds() {
        return Math.floor(this.funds);
    }
}

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
        this.load.tilemapTiledJSON('map', 'assets/maps/2.json');
    }

    create() {
        this.business = new Business();
        this.employeeCost = 50;

        this.map = this.make.tilemap({ key: 'map' });
        this.tileset = this.map.addTilesetImage('Dungeon_Tileset');
        const underLayer = this.map.createStaticLayer('Below', this.tileset, 0, 0);
        const worldLayer = this.map.createStaticLayer('World', this.tileset, 0, 0);
        const aboveLayer = this.map.createStaticLayer('Above', this.tileset, 0, 0);
        aboveLayer.setDepth(10);
        worldLayer.setCollisionByProperty({ collides: true });
        this.worldLayer = worldLayer;

        this.buildUi();

        this.deskPoints = getObjects(this.map, 'desk');
        this.peePoints = getObjects(this.map, RELIEF_TYPES.pee.id);
        this.pooPoints = getObjects(this.map, RELIEF_TYPES.poo.id);

        this.reliefPoints = [];
        this.peePoints.forEach(p => this.reliefPoints.push(createReliefPoint(p, [RELIEF_TYPES.pee.id])));
        this.pooPoints.forEach(p => this.reliefPoints.push(createReliefPoint(p, [RELIEF_TYPES.poo.id, RELIEF_TYPES.pee.id])));

        this.employees = this.add.group();

        const initialEmployees = 2;
        for (let i = 0; i < initialEmployees; i++) {
            this.addEmployee();
        }
    }

    addEmployee() {
        const emptyDesks = this.deskPoints.filter(p => !p.taken);
        if (!emptyDesks.length) return false;

        const i = this.employees.getChildren().length;
        const p = emptyDesks[0];
        const meta = {
            name: randValue(NAMES),
            desk: {
                id: 'desk',
                x: snap(p.x),
                y: snap(p.y),
            },
            tint: SKIN_COLORS[i % SKIN_COLORS.length]
        };
        const e = new Employee(this, meta, p.x, p.y, createFinder(this.tileset));
        e.pathFinder.setGrid(createGrid(this.map, 'World', getEmployeesCoords(this.employees, e)));
        // this.physics.add.collider(e, worldLayer); // TODO: physics fucks up the path following :(
        this.employees.add(e);
        e.body.setCollideWorldBounds(true);
        p.taken = true;

        return true;
    }

    buildUi() {
        this.infoBox = this.add
            .text(4, 4, '', {
                font: '12px monospace',
                fill: '#fff',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
            })
            .setScrollFactor(0)
            .setDepth(999);

        this.hireButton = new Button(this, 4, 300, `Hire Employee ($${this.employeeCost})`, () => this.hireEmployee());
        this.add.existing(this.hireButton);
    }

    hireEmployee() {
        if (this.business.getFunds() > this.employeeCost) {
            const added =  this.addEmployee();
            if (added) this.business.takeFunds(this.employeeCost);
        }
    }

    findReliefPoint(type) {
        return randValue(this.reliefPoints.filter(p => p.supports.includes(type)));
    };  

    getInfoText() {
        return `Funds: $${this.business.getFunds()}`;
    }

    update(time, delta) {
        const t = Math.floor(time * 100);
        let fundIncrement = 0;

        this.employees.getChildren().forEach(e => {
            if (t % 10 === 0) {
                // update path finder (not so often)
                e.pathFinder.setGrid(createGrid(this.map, 'World', getEmployeesCoords(this.employees, e)));
            }

            if (t % 100 === 0 && !e.relief && time > e.nextReliefMinTime && randBool(0.2)) {
                // somebody has to go...
                e.setRelief(randBool() ? RELIEF_TYPES.pee : RELIEF_TYPES.poo);
                e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
            }

            if (e.relief && e.relief.attempts) {
                // somebody wasn't able to go, needs to check restroom again
                if (t % 50 === 0 && randBool(0.5)) {
                    e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
                }
            }

            e.update(time);

            if (e.working) {
                fundIncrement += delta / 1000;
            }
        });

        this.employees.getChildren().forEach(c => {
            // update z depth to render sprites in the right order
            c.setDepth(c.y);
        });

        this.business.addFunds(fundIncrement);
        this.infoBox.setText(this.getInfoText());
    }
}