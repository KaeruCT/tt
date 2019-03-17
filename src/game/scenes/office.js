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
import { light } from '../ui/common';

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
    return employees.getChildren().map(e => ({
        x: snap(e.x),
        y: snap(e.y),
        ignore: exclude === e
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
        this.fundIncrement = 0;

        this.map = this.make.tilemap({ key: 'map' });
        this.tileset = this.map.addTilesetImage('Dungeon_Tileset');
        const underLayer = this.map.createStaticLayer('Below', this.tileset, 0, 0);
        const worldLayer = this.map.createStaticLayer('World', this.tileset, 0, 0);
        const aboveLayer = this.map.createStaticLayer('Above', this.tileset, 0, 0);
        aboveLayer.setDepth(10);
        worldLayer.setCollisionByProperty({ collides: true });
        this.worldLayer = worldLayer;

        this.buildUi();

        this.business = new Business({ onFundsChange: this.onFundsChange.bind(this) });
        this.deskPoints = getObjects(this.map, 'desk');
        this.peePoints = getObjects(this.map, RELIEF_TYPES.pee.id);
        this.pooPoints = getObjects(this.map, RELIEF_TYPES.poo.id);

        this.reliefPoints = this.add.group();
        this.addReliefPoint(RELIEF_TYPES.poo.id); // start with one poo point

        this.employees = this.add.group();

        const initialEmployees = 8;
        for (let i = 0; i < initialEmployees; i++) {
            this.addEmployee();
        }
    }

    addReliefPoint(reliefType) {
        const points = reliefType === RELIEF_TYPES.poo.id ? this.pooPoints : this.peePoints;
        const emptySlots = points.filter(p => !p.taken);
        if (!emptySlots.length) return false;

        const p = emptySlots[0];
        const pointId = this.reliefPoints.getChildren().length;
        const { supported, id } = RELIEF_TYPES[reliefType];
        const reliefPoint = new ReliefPoint(this, {
            id: `${pointId}-${supported.join(',')}`,
        }, id, supported, p.x, p.y);
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
                canUse: () => true,
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

        this.hireButton = new Button(this, 150, 4, ' + ', () => {
            this.hireEmployee();
        });
        this.add.existing(this.hireButton);

        this.pissoirButton = new Button(this, 180, 4, 'PEE', () => {
            this.buyReliefPoint(RELIEF_TYPES.pee.id);
        });
        this.add.existing(this.pissoirButton);

        this.toiletButton = new Button(this, 210, 4, 'POO', () => {
            this.buyReliefPoint(RELIEF_TYPES.poo.id);
        });
        this.add.existing(this.toiletButton);

        this.graphics = this.add.graphics()
            .setScrollFactor(0)
            .setDepth(999);
    }

    hireEmployee() {
        this.business.doIfAffordable(() => this.addEmployee(), this.business.employeeCost);
    }

    buyReliefPoint(reliefId) {
        const cost = this.business.getFacilityCost(reliefId);
        this.business.doIfAffordable(() => this.addReliefPoint(reliefId), cost);
    }

    findReliefPoint(reliefId) {
        return randValue(this.reliefPoints.getChildren().filter(p => p.supportsRelief(reliefId)));
    }

    onFundsChange(amount) {
        const positive = amount > 0 ? '+' : '';
        const dist = 10;
        const style = { ...light, fill: positive ? '#6f6' : '#f66' };
        const text = new Text(this, this.fundsBox.x + 8, this.fundsBox.y + (positive ? dist : 0), `${positive}$${amount}`, style);
        this.add.existing(text);

        this.tweens.add({
            targets: text,
            y: this.fundsBox.y + (positive ? 0 : dist),
            onComplete: () => text.destroy(),
            duration: 300,
        });
    }

    update(time, delta) {
        this.employees.getChildren().forEach(e => {
            const t = Math.floor(time * 100 + e.seed * 100);
            if (t % 100 === 0) {
                // update path finder (not so often)
                e.pathFinder.setGrid(createGrid(this.map, 'World', getEmployeesCoords(this.employees, e)));

                const reliefInProgress = e.relief && e.relief.inProgress;

                if (!e.relief && time > e.nextReliefMinTime && randBool(0.1)) {
                    // somebody has to go...
                    e.setRelief(randBool() ? RELIEF_TYPES.pee : RELIEF_TYPES.poo);
                    e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
                }

                if (t % 500 === 0 && e.relief && !reliefInProgress && e.relief.shouldAttemptAgain(t)) {
                    // somebody wasn't able to go, needs to check restroom again
                    e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
                }
            }

            e.update(time);

            if (e.working) {
                this.fundIncrement += delta / 1000;
            }
        });

        this.employees.getChildren().forEach(c => {
            // update z depth to render sprites in the right order
            c.setDepth(c.y);
        });

        this.updateUi();

        if (this.fundIncrement > 1) {
            const trunc = Math.trunc(this.fundIncrement);
            this.business.addFunds(trunc);
            this.fundIncrement -= trunc;
        }

        this.business.passTime(delta);
    }

    updateUi() {
        const { currentTime, dayLength } = this.business;
        this.fundsBox.setText(`${this.business.getFormattedFunds()}`);

        const dayCompletion = dayLength - currentTime / dayLength;
        const rad = 6;
        const cx = 12;
        const cy = 12;
        this.graphics.clear();
        this.graphics.fillStyle(0x444444, 1);
        this.graphics.fillEllipse(cx, cy, rad * 2, rad * 2);
        this.graphics.lineStyle(2, 0xcccccc, 1);
        this.graphics.beginPath();
        this.graphics.arc(cx, cy, rad, Phaser.Math.DegToRad(270), Phaser.Math.DegToRad(270 + dayCompletion * 360), true);
        this.graphics.strokePath();
    }
}
