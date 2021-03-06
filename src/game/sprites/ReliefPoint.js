import Phaser from 'phaser';
import { RELIEF_TYPES } from '../logic/relief';
import { randBool } from '../utils/rand';

export default class ReliefPoint extends Phaser.GameObjects.Sprite {
    constructor(scene, meta) {
        super(scene, meta.x, meta.y, 'relief_point');
        scene.physics.world.enable(this);
        scene.add.existing(this);
        this.reliefId = meta.reliefId;
        this.meta = meta;
        this.busy = false;
        this.fixing = false;

        this.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.startFixing());

        const { anims } = this.scene;
        anims.create({
            key: 'pissoir',
            frames: anims.generateFrameNumbers('relief_point', { start: 0, end: 0 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'toilet',
            frames: anims.generateFrameNumbers('relief_point', { start: 1, end: 1 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'pissoir_dirty',
            frames: anims.generateFrameNumbers('relief_point', { start: 2, end: 2 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'toilet_dirty',
            frames: anims.generateFrameNumbers('relief_point', { start: 3, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'pissoir_cleaning',
            frames: anims.generateFrameNumbers('relief_point', { start: 8, end: 11 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'toilet_cleaning',
            frames: anims.generateFrameNumbers('relief_point', { start: 4, end: 7 }),
            frameRate: 10,
            repeat: -1
        });
        this.flipX = true; // TODO: this might not make sense for the final sprite
        this.updateAnimation();
    }

    supportsRelief(reliefId) {
        return RELIEF_TYPES[this.reliefId].supported.includes(reliefId);
    }

    beginUsing() {
        this.busy = true;
    }

    stopUsing() {
        const relief = RELIEF_TYPES[this.reliefId];
        this.busy = false;
        this.meta.usages += 1;
        if (this.meta.usages >= relief.minPointUsages && randBool(0.8)) {
            this.meta.broken = true;
            this.updateAnimation();
        }
    }

    startFixing() {
        if (this.fixing) return;

        const { business } = this.scene;
        const cost = business.getFacilityFixCost(this.reliefId);
        business.doIfAffordable(() => {
            const relief = RELIEF_TYPES[this.reliefId];

            this.fixing = true;
            this.updateAnimation();
            setTimeout(() => this.fix(), relief.fixPointTime * 1000);
            return true;
        }, cost);
    }

    fix() {
        this.fixing = false;
        this.meta.broken = false;
        this.meta.usages = 0;
        this.updateAnimation();
    }

    canUse() {
        return !this.fixing && !this.meta.broken && !this.busy;
    }

    updateAnimation() {
        this.anims.play(this.getAnimation(), true);
    }

    getAnimation() {
        const { reliefId } = this;
        let prefix;
        if (reliefId === RELIEF_TYPES.poo.id) {
            prefix = 'toilet';
        }
        if (reliefId === RELIEF_TYPES.pee.id) {
            prefix = 'pissoir';
        }

        if (this.fixing) return `${prefix}_cleaning`;
        if (this.meta.broken) return `${prefix}_dirty`;
        return `${prefix}`;
    }
}
