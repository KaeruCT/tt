import Phaser from 'phaser';
import Employee from '../sprites/Employee';
import { createFinder, createGrid } from '../utils/path';
import { randValue, randBool, randRange } from '../utils/rand';
import { snap, SKIN_COLORS, CLOTHES_COLORS, HAIR_COLORS, TILE_DIMENSION, generateUUID } from '../utils/misc';
import { RELIEF_TYPES } from '../logic/relief';
import Button from '../ui/Button';
import Text from '../ui/Text';
import { Business } from '../logic/business';
import ReliefPoint from '../sprites/ReliefPoint';
import { light } from '../ui/common';

const NAMES = [
    'Abdullah', 'Luciano', 'Oliver', 'Cezar', 'Julio', 'Alejandra',
    'Andres', 'Oscar', 'Sahil', 'Catherine', 'Anna', 'Omer',
    'Alvaro', 'David', 'Ivan', 'Kate', 'Carina', 'Francisco',
    'Laura', 'Marcela', 'Eva', 'Adriana', 'Lucia', 'Helena',
];

const HOBBIES = [
    'videogames', 'playing music', 'bouldering', 'hiking', 'knitting',
    'cooking', 'crafts', 'travelling', 'painting', 'poetry',
    'reading', 'football', 'basketball', 'volleyball', 'cricket',
    'brewing', 'chess', 'backpacking', 'archery', 'bodybuilding',
    'magic', 'cycling', 'martial arts', 'rock collecting', 'sommelier',
    'voluntering', 'poker', 'playing guitar', 'playing piano', 'fishing',
    'surfing', 'bowling', 'interior design', 'languages', 'movies', 'dancing',
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
        this.load.spritesheet('hair', 'assets/2d/hair.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('clothes', 'assets/2d/clothes.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('relief_point', 'assets/2d/relief.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/maps/2.json');
    }

    create() {
        this.t = 0;
        this.paused = false;
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

        const storedBusiness = localStorage.getItem('business');
        if (storedBusiness) {
            this.business.load(JSON.parse(storedBusiness));
        }

        this.desks = getObjects(this.map, 'desk');
        this.desks.forEach(d => {
            d.meta = { id: `desk-${d.x}-${d.y}` };
        });
        this.peePoints = getObjects(this.map, RELIEF_TYPES.pee.id);
        this.peePoints.forEach(p => p.meta = {});
        this.pooPoints = getObjects(this.map, RELIEF_TYPES.poo.id);
        this.pooPoints.forEach(p => p.meta = {});

        this.reliefPoints = this.add.group();

        if (!storedBusiness) {
            this.addReliefPoint(RELIEF_TYPES.poo.id); // start with one poo point
        } else {
            const storedReliefPoints = this.business.getReliefPoints();
            for (let i = 0; i < storedReliefPoints.length; i++) {
                const p = storedReliefPoints[i];
                this.addReliefPoint(null, p);
            }
        }

        this.employees = this.add.group();

        if (!storedBusiness) {
            const initialEmployees = 1;
            for (let i = 0; i < initialEmployees; i++) {
                this.addEmployee();
            }
        } else {
            const storedEmployees = this.business.getEmployees();
            for (let i = 0; i < storedEmployees.length; i++) {
                this.addEmployee(storedEmployees[i]);
            }
        }
    }

    addReliefPoint(reliefId, storedMeta = null) {
        if (!reliefId) reliefId = storedMeta.reliefId;
        const points = reliefId === RELIEF_TYPES.poo.id ? this.pooPoints : this.peePoints;
        const emptySlots = points.filter(p => !p.meta.taken);
        if (!emptySlots.length) return false;

        const p = emptySlots[0];
        const meta = storedMeta || {
            id: generateUUID(),
            reliefId,
            x: p.x,
            y: p.y,
        };
        const reliefPoint = new ReliefPoint(this, meta);
        this.reliefPoints.add(reliefPoint);
        p.meta.taken = true;

        if (!storedMeta) this.business.addReliefPoint(reliefPoint);

        return true;
    }

    removeEmployee(e, type) {
        const desk = this.desks.find(p => p.meta.employeeId === e.meta.id);
        if (desk) {
            desk.meta.taken = false;
            desk.meta.employeeId = null;
        }
        this.business.employeeRemoval(e, type);
    }

    addEmployee(storedMeta = null) {
        const emptyDesks = this.desks.filter(p => !p.meta.taken);
        if (!emptyDesks.length) return false;

        const i = this.employees.getChildren().length;
        const meta = storedMeta || {
            id: generateUUID(),
            name: randValue(NAMES),
            age: randRange(18, 50),
            hobbies: new Array(randRange(1, 3), 1).map(() => randValue(HOBBIES)),
            tint: SKIN_COLORS[i % SKIN_COLORS.length],
            hair: randValue(HAIR_COLORS),
            clothes: randValue(CLOTHES_COLORS),
        };

        if (storedMeta) {
            meta.desk = this.desks.find(p => p.meta.id === storedMeta.desk.meta.id);
        } else {
            meta.desk = emptyDesks[0];
        }
        const desk = meta.desk;

        const e = new Employee(this, meta, desk.x, desk.y, createFinder(this.tileset));
        e.pathFinder.setGrid(createGrid(this.map, 'World', getEmployeesCoords(this.employees, e)));
        // this.physics.add.collider(e, worldLayer); // TODO: physics fucks up the path following :(
        this.employees.add(e);
        e.body.setCollideWorldBounds(true);
        desk.meta.taken = true;
        desk.meta.employeeId = meta.id;

        if (!storedMeta) this.business.addEmployee(e);

        return true;
    }

    selectEmployee(e) {
        if (this.selectedEmployee) {
            this.fireButton.destroy();
            this.closeButton.destroy();
            this.employeeInfo.destroy();
            this.overlay.destroy();
        }

        this.selectedEmployee = e;
        if (!this.selectedEmployee) return;

        const { width, height } = this.sys.game.canvas;
        const padding = TILE_DIMENSION;
        this.overlay = this.add.graphics({
            fillStyle: {
                color: 0x000000,
                alpha: 0.6,
            }
        })
            .setScrollFactor(0)
            .setDepth(9999);
        this.overlay.fillRect(padding, padding*3, width - padding*2, height - padding*6);

        this.employeeInfo = new Text(this, padding+1, padding*2+1)
            .setDepth(9999);
        this.employeeInfo.setText(this.getEmployeeInfo(this.selectedEmployee));
        this.add.existing(this.employeeInfo);

        this.fireButton = new Button(this, padding+1, 200, 'FIRE', () => {
            this.selectedEmployee.fire();
        }).setDepth(9999);
        this.add.existing(this.fireButton);

        this.closeButton = new Button(this, width - padding*2, padding*2+1, 'X', () => {
            this.selectEmployee(null);
        }).setDepth(9999);
        this.add.existing(this.closeButton);

        // HACK: update employee info periodically, should be more elegant
        setTimeout(() => {
            this.selectEmployee(this.selectedEmployee);
        }, 300);
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

        this.resetButton = new Button(this, 4, 360, 'RESET', () => {
            localStorage.removeItem('business');
            this.paused = true;
            window.location.reload();    
        });
        this.add.existing(this.resetButton);

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
        const text = new Text(this, this.fundsBox.x + (positive ? 8 : 20), this.fundsBox.y + (positive ? dist : 0), `${positive}$${amount}`, style);
        this.add.existing(text);

        this.tweens.add({
            targets: text,
            y: this.fundsBox.y + (positive ? 0 : dist),
            onComplete: () => text.destroy(),
            duration: 300,
        });
    }

    update(time, delta) {
        if (this.paused) return;

        this.t++;
        this.employees.getChildren().forEach(e => {
            const t = this.t + Math.floor(e.seed * 1000);
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

    getEmployeeInfo(e) {
        const { working, meta, relief } = e;
        const { name, age, hobbies } = e.meta;
        let info = `${name}\n\nAge: ${age}\n\nHobbies:\n - ${hobbies.join('\n - ')}\n\n`;
        info += `Working: ${working ? 'yes' : 'no'}\n`;
        if (meta.sadness) {
            info += `Couldn't hold it ${meta.sadness} time(s)\n`;
        }
        if (relief) {
            if (relief.inProgress) {
                info += `Is currently doing: ${relief.id}\n`;
            } else {
                info += `Needs to ${relief.id}\n`;
                info += `Has tried to go ${relief.attempts} time(s)\n`;
            }
        }
        return info;
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
