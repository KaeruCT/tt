import Phaser from 'phaser';
import Employee from '../sprites/Employee';
import Dropping from '../sprites/Dropping';
import { createFinder, createGrid } from '../utils/path';
import { randValue, randBool, randRange } from '../utils/rand';
import { snap, SKIN_COLORS, CLOTHES_COLORS, HAIR_COLORS, TILE_DIMENSION, generateUUID } from '../utils/misc';
import { RELIEF_TYPES } from '../logic/relief';
import { Business } from '../logic/business';
import ReliefPoint from '../sprites/ReliefPoint';

const NAMES = [
    'Abdullah', 'Luciano', 'Oliver', 'Cezar', 'Julio', 'Alejandra',
    'Eric', 'Alex', 'Nick', 'Patrick', 'Katherine', 'Mohammed',
    'Andres', 'Oscar', 'Sahil', 'Catherine', 'Anna', 'Omer',
    'Alvaro', 'David', 'Ivan', 'Kate', 'Carina', 'Francisco',
    'Laura', 'Marcela', 'Eva', 'Adriana', 'Lucia', 'Helena',
    'Nicole', 'Anastasia', 'Mary', 'Christine', 'Sofia', 'Monica',
];

const HOBBIES = [
    'videogames', 'playing music', 'bouldering', 'hiking', 'knitting',
    'cooking', 'crafts', 'travelling', 'painting', 'poetry',
    'reading', 'football', 'basketball', 'volleyball', 'cricket',
    'brewing', 'chess', 'backpacking', 'archery', 'bodybuilding',
    'magic', 'cycling', 'martial arts', 'rock collecting', 'sommelier',
    'voluntering', 'poker', 'playing guitar', 'playing piano', 'fishing',
    'surfing', 'bowling', 'interior design', 'languages', 'movies', 'dancing',
    'board games', 'fanfics', 'writing', 'philosophy', 'woodworking', 'fashion'
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

export default class OfficeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OfficeScene', active: true });
    }

    preload() {
        this.load.image('Dungeon_Tileset', 'assets/2d/tileset/Dungeon_Tileset.png');
        this.load.spritesheet('employee', 'assets/2d/char.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('hair', 'assets/2d/hair.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('clothes', 'assets/2d/clothes.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('relief_point', 'assets/2d/relief.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/maps/2.json');

        this.load.plugin('rexpinchplugin', 'assets/rexpinchplugin.min.js', true);
    }

    initCamera() {
        this.cameras.main.scrollY = -TILE_DIMENSION * 2;
        const camera = this.cameras.main;

        this.plugins.get('rexpinchplugin').add(this)
            .on('drag1', (dragScale) => {
                const drag1Vector = dragScale.drag1Vector;
                camera.scrollX -= drag1Vector.x / camera.zoom;
                camera.scrollY -= drag1Vector.y / camera.zoom;
            })
            .on('pinch', (dragScale) => {
                const scaleFactor = dragScale.scaleFactor;
                camera.zoom *= scaleFactor;
            }, this);
    }

    create() {
        this.t = 0;
        this.paused = false;
        this.fundIncrement = 0;
        this.hud = this.scene.get('HudScene');

        this.map = this.make.tilemap({ key: 'map' });
        this.tileset = this.map.addTilesetImage('Dungeon_Tileset');
        const underLayer = this.map.createStaticLayer('Below', this.tileset, 0, 0);
        const worldLayer = this.map.createStaticLayer('World', this.tileset, 0, 0);
        const aboveLayer = this.map.createStaticLayer('Above', this.tileset, 0, 0);
        aboveLayer.setDepth(10);
        worldLayer.setCollisionByProperty({ collides: true });
        this.worldLayer = worldLayer;

        this.initCamera();

        this.business = new Business({ onFundsChange: this.onFundsChange.bind(this) });

        const storedBusiness = localStorage.getItem('business');
        const reset = localStorage.getItem('reset');
        localStorage.removeItem('reset');
        if (storedBusiness && !reset) {
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

        if (storedBusiness) {
            const droppings = this.business.getDroppings();
            for (let i = 0; i < droppings.length; i++) {
                this.addDropping(droppings[i], false);
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
            broken: false,
            usages: 0,
        };
        const reliefPoint = new ReliefPoint(this, meta);
        this.reliefPoints.add(reliefPoint);
        p.meta.taken = true;

        if (!storedMeta) this.business.addReliefPoint(reliefPoint);

        return true;
    }

    addDropping(meta, save = true) {
        const dropping = new Dropping(this, meta);
        if (save) this.business.addDropping(dropping);
    }

    removeEmployee(e, type) {
        const desk = this.desks.find(p => p.meta.employeeId === e.meta.id);
        if (desk) {
            desk.meta.taken = false;
            desk.meta.employeeId = null;
        }
        this.business.employeeRemoval(e, type);
        this.hud.selectEmployee(null);
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
            stats: {
                work: {
                    duration: 0,
                },
                [RELIEF_TYPES.poo.id]: {
                    times: 0,
                    duration: 0,
                    outside: 0,
                },
                [RELIEF_TYPES.pee.id]: {
                    times: 0,
                    duration: 0,
                    outside: 0,
                },
            }
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

    hireEmployee() {
        this.business.doIfAffordable(() => this.addEmployee(), this.business.employeeCost, 'Employee');
    }

    buyReliefPoint(reliefId) {
        const cost = this.business.getFacilityCost(reliefId);
        this.business.doIfAffordable(() => this.addReliefPoint(reliefId), cost, RELIEF_TYPES[reliefId].pointName);
    }

    findReliefPoint(reliefId) {
        let points = this.reliefPoints.getChildren().filter(p => p.supportsRelief(reliefId));
        let cleanAndEmptyPoints = points.filter(p => !p.busy && !p.meta.broken);
        return randValue(cleanAndEmptyPoints.length ? cleanAndEmptyPoints : points);
    }

    selectEmployee(e) {
        this.hud.selectEmployee(e);
    }

    onFundsChange(amount, item) {
        this.hud.onFundsChange(amount, item);
    }

    update(time, delta) {
        if (this.paused) return;

        this.t++;
        this.employees.getChildren().forEach(e => {
            const t = this.t + Math.floor(e.seed * 1000);
            if (t % 100 === 0) {
                // update path finder (not so often)
                e.pathFinder.setGrid(createGrid(this.map, 'World', getEmployeesCoords(this.employees, e)));

                const relief = e.relief;

                if (!relief && time > e.nextReliefMinTime && randBool(0.1)) {
                    // somebody has to go...
                    e.setRelief(randBool(0.65) ? RELIEF_TYPES.pee : RELIEF_TYPES.poo);
                    e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
                }

                if (relief) {
                    if (t % 500 === 0 && !relief.inProgress && relief.shouldAttemptAgain(t)) {
                        // somebody wasn't able to go, needs to check restroom again
                        e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
                    }

                    if (relief.expirationTime && time > relief.expirationTime) {
                        e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
                        e.setRelief(null);
                        setTimeout(() => e.releaseInPlace(relief), randRange(500, 2000));
                    }
                }
            }

            e.update(time, delta);

            if (e.working) {
                this.fundIncrement += delta / 1000;
            }
        });

        this.employees.getChildren().forEach(c => {
            // update z depth to render sprites in the right order
            c.setDepth(c.y);
        });

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

    getEmployeeStats(e) {
        const { stats } = e.meta;
        const f = (d) => Math.floor(d/1000);

        let info = 'Time...\n';
        info += ` - Working: ${f(stats.work.duration)}\n`;
        info += ` - Peeing: ${f(stats[RELIEF_TYPES.pee.id].duration)}\n`;
        info += ` - Pooping: ${f(stats[RELIEF_TYPES.poo.id].duration)}\n`;

        info += `\nTotals\n`;
        info += ` - Pee: ${stats[RELIEF_TYPES.pee.id].times} (${stats[RELIEF_TYPES.pee.id].outside} on floor)\n`;
        info += ` - Poo: ${stats[RELIEF_TYPES.poo.id].times} (${stats[RELIEF_TYPES.poo.id].outside} on floor)\n`;
        return info;
    }
}
