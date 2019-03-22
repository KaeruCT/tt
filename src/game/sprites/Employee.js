import Phaser from 'phaser';
import { TILE_DIMENSION } from '../utils/misc';
import { Relief } from '../logic/relief';
import Dropping from './Dropping';
import { Hair, Clothes } from './EmployeeDecorations';

export default class Employee extends Phaser.GameObjects.Sprite {
    constructor(scene, meta, x, y, pathFinder) {
        super(scene, x, y, 'employee');
        scene.physics.world.enable(this);
        scene.add.existing(this);
        this.setOrigin(0.5, 0.75);
        this.speed = 100;
        this.meta = meta;
        this.path = [];
        this.pathFinder = pathFinder;
        this.tint = meta.tint;
        this.working = true;
        this.reliefPoint = null;
        this.nextReliefMinTime = 0;
        this.relief = null;
        this.time = 0;
        this.seed = Math.random();
        this.meta.sadness = 0;
        this.sadnessLimit = 2;

        this.decorations = [
            new Hair(this, meta.hair),
            new Clothes(this, meta.clothes),
        ];

        this.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.selectEmployee(this));

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
        const { scene } = this;
        if (!scene) return;
        if (!scene.worldLayer) return;
        const p = scene.worldLayer.worldToTileXY(this.x, this.y);
        const d = scene.worldLayer.worldToTileXY(this.destination.x, this.destination.y);
        this.pathFinder.findPath(
            p.x,
            p.y,
            d.x,
            d.y,
            this.onPathUpdate.bind(this)
        );
    }

    onPathUpdate(path) {
        const { meta, destination } = this;
        if (path !== null) {    
            path.shift(); // first path coordinates are the starting point
            this.path = path;
            console.log('Employee', meta.name, 'going to', destination.meta.id);
        } else {
            path = [];
            console.log('Employee', meta.name, 'could not find a path to', destination.meta.id);
        }
    }

    setRelief(relief) {
        if (!relief) {
            this.relief = null;
            return;
        }

        this.relief = new Relief(relief, this.time, () => {
            console.log('Employee', this.meta.name, 'started to', relief.id);
        }, () => {
            this.nextReliefMinTime = this.time + relief.cooldown * 1000;
            console.log('Employee', this.meta.name, 'finished', relief.id);
            this.setRelief(null);
            this.goToDesk();
        });
    }

    startToRelieve() {
        const { relief, reliefPoint } = this;

        if (!relief) return;
        this.relief.release(reliefPoint);
    }

    giveUp() {
        if (this.relief) this.relief.attempted(this.time);
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
            if (!destination.canUse()) {
                console.log(this.meta.name, 'went to', destination.meta.id, 'but it was busy');
                this.giveUp();
            } else {
                this.startToRelieve();
            }
        });
    };

    onEmployeeRemoval(type) {
        this.meta.desk.clear();
        if (this.relief && this.reliefPoint) this.relief.release(this.reliefPoint);
        this.business.employeeRemoval(this, type);
        if (this.scene.selectedEmployee === this) this.scene.selectEmployee(null);
        this.decorations.forEach(d => d.destroy());
        this.destroy();
    }

    fire() {
        console.log('Employee', this.meta.name, 'was fired!');
        this.onEmployeeRemoval('fire');
    }

    quit() {
        console.log('Employee', this.meta.name, 'quit!');
        this.onEmployeeRemoval('quit');
    }

    update(time) {
        this.time = time;
        const { scene, meta, pathFinder, speed, destination, path, body, relief } = this;
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
            this.playAnimation('employee-up');
        } else if (body.velocity.y > 0) {
            this.playAnimation('employee-down');
        } else if (body.velocity.x < 0) {
            this.playAnimation('employee-left');
        } else if (body.velocity.x > 0) {
            this.playAnimation('employee-right');
        } else {
            if (destination === null) this.stopAnimations();
        }

        if (destination) {
            const d = scene.worldLayer.worldToTileXY(destination.x, destination.y);
            if (current.x === d.x && current.y === d.y) {
                this.onDestinationSuccess && this.onDestinationSuccess(this.destination);
                this.destination = null;
                console.log('Employee', meta.name, 'arrived to', destination.meta.id);
            } else {
                pathFinder.calculate();
            }
        }

        if (this.relief && this.relief.expirationTime && time > this.relief.expirationTime) {
            console.log('Oh no! Employee', meta.name, 'could not hold their', relief.id);
            this.sadness += 1;
            new Dropping(this.scene, {}, this.relief.id, this.x, this.y);
            this.setRelief(null);

            if (this.meta.sadness >= this.sadnessLimit) {
                this.quit();
            }
        }

        this.decorations.forEach(d => d.update());
    }

    playAnimation(name) {
        this.anims.play(name, true);
        this.decorations.forEach(d => d.anims.play(d.getAnimationName(name, 'employee'), true));
    }
    
    stopAnimations() {
        this.anims.stop();
        this.decorations.forEach(d => d.anims.stop());
    }

    setDepth(depth) {
        super.setDepth(depth);
        this.decorations.forEach(d => d.setDepth(depth));
    }
}
