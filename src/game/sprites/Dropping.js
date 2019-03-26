import Phaser from 'phaser';
import { RELIEF_TYPES } from '../logic/relief';

export default class Dropping extends Phaser.GameObjects.Sprite {
    constructor(scene, meta) {
        super(scene, meta.x, meta.y, 'relief_point');
        scene.physics.world.enable(this);
        scene.add.existing(this);
        this.meta = meta;
        this.reliefId = meta.reliefId;

        this.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.fix());

        const { anims } = this.scene;
        anims.create({
            key: 'dropping-shit',
            frames: anims.generateFrameNumbers('relief_point', { start: 12, end: 12 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'dropping-piss',
            frames: anims.generateFrameNumbers('relief_point', { start: 13, end: 13 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.play(this.getAnimation(), true);
    }

    fix() {
        const { business } = this.scene;
        const cost = business.getDroppingCleanCost(this.reliefId);
        business.doIfAffordable(() => {
            business.removeDropping(this);
            this.destroy();
            return true;
        }, cost);
    }

    getAnimation() {
        if (this.reliefId === RELIEF_TYPES.poo.id) return 'dropping-shit';
        if (this.reliefId === RELIEF_TYPES.pee.id) return 'dropping-piss';
    }
}
