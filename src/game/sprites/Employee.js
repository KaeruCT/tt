import Phaser from 'phaser';
import { TILE_DIMENSION } from '../utils/misc';
import { randRange } from '../utils/rand';

export default class Employee extends Phaser.GameObjects.Sprite {
    constructor(scene, meta, x, y, pathFinder) {
        super(scene, x, y, 'employee');
        scene.physics.world.enable(this);
        scene.add.existing(this);
        this.setOrigin(0.5, 0.75);
        this.setSize(12, 8);
        this.body.setOffset(2, 8);
        this.speed = 100;
        this.meta = meta;
        this.path = [];
        this.pathFinder = pathFinder;
        this.tint = meta.tint;
        this.working = true;
        this.reliefPoint = null;
        this.reliefInProgress = false;
        this.reliefExpirationTime = 0;
        this.reliefAttempts = 0;
        this.relief = null;
        this.time = 0;
        this.nextReliefMinTime = 0;

        const { anims } = this.scene;
        anims.create({
            key: 'employee-down',
            frames: anims.generateFrameNumbers('employee', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'employee-left',
            frames: anims.generateFrameNumbers('employee', { start: 4, end: 7 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'employee-right',
            frames: anims.generateFrameNumbers('employee', { start: 8, end: 11 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'employee-up',
            frames: anims.generateFrameNumbers('employee', { start: 12, end: 15 }),
            frameRate: 10,
            repeat: -1
        });
    }

    setDestination(destination) {
        this.working = false;
        return new Promise((resolve, reject) => {
            this.destination = destination;
            this.reliefPoint = this.destination; // means they could potentially relief at their desk (bad)
            this.updatePathFinder();
            this.onDestinationSuccess = resolve;
        });
    }

    updatePathFinder() {
        const p = this.scene.worldLayer.worldToTileXY(this.x, this.y);
        this.pathFinder.findPath(
            p.x,
            p.y,
            this.destination.x,
            this.destination.y,
            this.onPathUpdate.bind(this)
        );
    }

    onPathUpdate(path) {
        const { meta, destination } = this;
        if (path !== null) {    
            path.shift(); // first path coordinates are the starting point
            this.path = path;
            console.log('Employee', meta.name, 'going to', destination.id);
        } else {
            path = [];
            console.log('Employee', meta.name, 'could not find a path to', destination.id);
        }
    }

    setRelief(relief) {
        const { meta } = this;
        if (relief) {
            console.log('Employee', meta.name, 'needs to', relief.id);
        } else if (this.relief) {
            this.nextReliefMinTime = this.time + this.relief.cooldown * 1000;
        }
        this.relief = relief;
        this.reliefExpirationTime = 0;
        this.reliefAttempts = 0;
    }

    startToRelieve() {
        const { reliefPoint, relief, meta } = this;

        if (!relief) return;

        if (reliefPoint) reliefPoint.busy = true;
        this.reliefInProgress = true;
        const { min, max } = relief.time;
        const reliefTime = randRange(min * 1000, max * 1000);
        console.log('Employee', meta.name, 'started to', relief.id, `(${reliefTime})`);
        setTimeout(() => {
            console.log('Employee', meta.name, 'finished', relief.id, `(${reliefTime})`);
            if (reliefPoint) reliefPoint.busy = false;
            this.reliefInProgress = false;
            this.setRelief(null);
            this.goToDesk();
        }, reliefTime);
    }

    giveUp() {
        this.reliefAttempts++;
        this.goToDesk();
    }

    goToDesk() {
        this.setDestination(this.meta.desk).then(() => {
            this.working = true;
        });
    }

    triggerRestroomAttempt(findReliefPoint) {
        if (!this.relief) return;

        const reliefPoint = findReliefPoint(this.relief.id);

        if (!reliefPoint) {
            console.log('There is no proper restroom for', this.meta.name);
            this.giveUp();
            return;
        }
        
        this.setDestination(reliefPoint).then(destination => {
            if (destination.busy) {
                console.log(this.meta.name, 'went to', destination.id, 'but it was busy');
                this.giveUp();
            } else {
                this.startToRelieve();
            }
        });
    };

    update(time) {
        this.time = time;
        const { anims, scene, meta, pathFinder, speed, destination, path, body, relief } = this;
        const dx = body.velocity.x ? (body.velocity.x > 0 ? -1 : 1) : 0;
        const dy = body.velocity.y ? (body.velocity.y > 0 ? -1 : 1) : 0;
        const current = scene.worldLayer.worldToTileXY(
            this.x + dx * TILE_DIMENSION*0.5,
            this.y + dy * TILE_DIMENSION*0.5
        );

        const nextPoint = path.length && path[0];
        if (nextPoint) {
            if (nextPoint.y < current.y) {
                body.setVelocityY(-speed);
            } else if (nextPoint.y > current.y) {
                body.setVelocityY(speed);
            } else {
                body.setVelocityY(0);
            }
            
            if (nextPoint.x < current.x) {
                body.setVelocityX(-speed);
            } else if (nextPoint.x > current.x) {
                body.setVelocityX(speed);
            } else {
                body.setVelocityX(0);
            }

            body.velocity.normalize().scale(speed);

            if (current.x === nextPoint.x && current.y === nextPoint.y) {
                path.shift();
                body.setVelocityY(0);
                body.setVelocityX(0);
            }
        }

        if (body.velocity.y < 0) {
            anims.play('employee-up', true);
        } else if (body.velocity.y > 0) {
            anims.play('employee-down', true);
        } else if (body.velocity.x < 0) {
            anims.play('employee-left', true);
        } else if (body.velocity.x > 0) {
            anims.play('employee-right', true);
        } else {
            if (destination === null) anims.stop();
        }

        if (destination) {
            if (current.x === destination.x && current.y === destination.y) {
                this.onDestinationSuccess && this.onDestinationSuccess(this.destination);
                this.destination = null;
                console.log('Employee', meta.name, 'arrived to', destination.id);
            } else {
                pathFinder.calculate();
            }
        }

        if (relief) {
            if (!this.reliefExpirationTime) {
                const { limit } = this.relief;
                this.reliefExpirationTime = time + randRange(limit.min, limit.max) * 1000;
            }
            if (time > this.reliefExpirationTime) {
                console.log('Oh no! Employee', meta.name, 'could not hold their', relief.id);
                this.setRelief(null);
            }
        }
    }
}