import Phaser from 'phaser';
import Employee from '../sprites/Employee';
import { createFinder, createGrid } from '../utils/path';
import { randValue, randBool } from '../utils/rand';
import { snap, SKIN_COLORS, TILE_DIMENSION } from '../utils/misc';
import { RELIEF_TYPES } from '../logic/relief';
import Button from '../ui/Button';
import Text from '../ui/Text';
import { Business } from '../logic/business';
import ReliefPoint from '../sprites/ReliefPoint';

const NAMES = [
    'Abdullah', 'Luciano', 'Oliver', 'Cezar', 'Julio', 'Alejandro',
    'Andres', 'Oscar', 'Sahil', 'Catherine', 'Anna', 'Omer',
    'Alvaro', 'David', 'Ivan', 'Kate', 'Carina', 'Francisco',
];

const getObjects = (map, type) => map.filterObjects('Objects', o => {
    const typeProp = o.properties.find(p => p.name === 'type') || {};
    return typeProp.value === type;
});

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
        this.load.spritesheet('relief_point', 'assets/2d/relief.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/maps/2.json');
    }

    create() {
        this.cameras.main.scrollY = -TILE_DIMENSION * 2;
        this.business = new Business();

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

        this.reliefPoints = this.add.group();
        this.addReliefPoint(RELIEF_TYPES.poo); // start with one poo point

        this.employees = this.add.group();

        const initialEmployees = 2;
        for (let i = 0; i < initialEmployees; i++) {
            this.addEmployee();
        }
    }

    addReliefPoint(reliefType) {
        const points = reliefType === RELIEF_TYPES.poo ? this.pooPoints : this.peePoints;
        const emptySlots = points.filter(p => !p.taken);
        if (!emptySlots.length) return false;

        const p = emptySlots[0];
        const pointId = this.reliefPoints.getChildren().length;
        const { supported, id } = reliefType;
        const reliefPoint = new ReliefPoint(this, {
            id: `${pointId}-${supported.join(',')}`,
            supported,
            type: id,
            busy: false,
        }, p.x, p.y);
        this.reliefPoints.add(reliefPoint);
        p.taken = true;

        return true;
    }

    addEmployee() {
        const emptyDesks = this.deskPoints.filter(p => !p.taken);
        if (!emptyDesks.length) return false;

        const i = this.employees.getChildren().length;
        const p = emptyDesks[0];
        const meta = {
            name: randValue(NAMES),
            desk: {
                meta: { id: 'desk' },
                x: p.x,
                y: p.y,
            },
            tint: SKIN_COLORS[i % SKIN_COLORS.length]
        };
        const e = new Employee(this, meta, p.x, p.y, createFinder(this.tileset));
        e.pathFinder.setGrid(createGrid(this.map, 'World', getEmployeesCoords(this.employees, e)));
        // this.physics.add.collider(e, worldLayer); // TODO: physics fucks up the path following :(
        this.employees.add(e);
        e.body.setCollideWorldBounds(true);
        p.taken = true;
        this.business.addEmployee();

        return true;
    }

    buildUi() {
        this.fundsBox = new Text(this, 20, 4);
        this.add.existing(this.fundsBox);

        this.hireButton = new Button(this, 160, 4, `Hire ($${this.business.employeeCost})`, () => this.hireEmployee());
        this.add.existing(this.hireButton);

        this.graphics = this.add.graphics()
            .setScrollFactor(0)
            .setDepth(999)
    }

    hireEmployee() {
        if (this.business.getFunds() > this.business.employeeCost) {
            const added = this.addEmployee();
            if (added) this.business.takeFunds(this.business.employeeCost);
        }
    }

    findReliefPoint(type) {
        return randValue(this.reliefPoints.getChildren().filter(p => p.meta.supported.includes(type)));
    };

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

        this.updateUi();

        this.business.addFunds(fundIncrement);
        this.business.passTime(delta);
    }

    updateUi() {
        const { currentTime, dayLength } = this.business;
        this.fundsBox.setText(`Funds: $${this.business.getFunds()}`);

        const dayCompletion = dayLength - currentTime / dayLength;
        const rad = 6;
        const cx = 12;
        const cy = 12;
        this.graphics.clear();
        this.graphics.fillStyle(0x444444, 1);
        this.graphics.fillEllipse(cx, cy, rad*2, rad*2);
        this.graphics.lineStyle(2, 0xcccccc, 1);
        this.graphics.beginPath();
        this.graphics.arc(cx, cy, rad, Phaser.Math.DegToRad(270), Phaser.Math.DegToRad(270 + dayCompletion * 360), true);
        this.graphics.strokePath();
    }
}
