import Decoration from './Decoration';

export class Hair extends Decoration {
    constructor(parent, tint) {
        super(parent, 'hair', tint);

        this.setOrigin(0.5, 0.75);
        
        const { anims } = parent.scene;
        anims.create({
            key: 'hair-down',
            frames: anims.generateFrameNumbers('hair', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'hair-left',
            frames: anims.generateFrameNumbers('hair', { start: 4, end: 7 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'hair-right',
            frames: anims.generateFrameNumbers('hair', { start: 8, end: 11 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'hair-up',
            frames: anims.generateFrameNumbers('hair', { start: 12, end: 15 }),
            frameRate: 10,
            repeat: -1
        });
    }
}

export class Clothes extends Decoration {
    constructor(parent, tint) {
        super(parent, 'clothes', tint);

        this.setOrigin(0.5, 0.75);

        const { anims } = parent.scene;
        anims.create({
            key: 'clothes-down',
            frames: anims.generateFrameNumbers('clothes', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'clothes-left',
            frames: anims.generateFrameNumbers('clothes', { start: 4, end: 7 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'clothes-right',
            frames: anims.generateFrameNumbers('clothes', { start: 8, end: 11 }),
            frameRate: 10,
            repeat: -1
        });
        anims.create({
            key: 'clothes-up',
            frames: anims.generateFrameNumbers('clothes', { start: 12, end: 15 }),
            frameRate: 10,
            repeat: -1
        });
    }
}
