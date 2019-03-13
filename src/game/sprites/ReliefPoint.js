import Phaser from 'phaser';
import { RELIEF_TYPES } from '../logic/relief';

export default class ReliefPoint extends Phaser.GameObjects.Sprite {
    constructor(scene, meta, x, y) {
        super(scene, x, y, 'relief_point');
        scene.physics.world.enable(this);
        scene.add.existing(this);
        this.meta = meta;

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
        this.flipX = true; // TODO: this might not make sense for the final sprite
        if (meta.type === RELIEF_TYPES.poo.id) {
            this.anims.play('toilet', true);
        }
        if (meta.type === RELIEF_TYPES.pee.id) {
            this.anims.play('pissoir', true);
        }
    }
}
