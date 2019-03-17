import Phaser from 'phaser';

export default class Decoration extends Phaser.GameObjects.Sprite {
    constructor(parent, sprite, tint) {
        super(parent.scene, parent.x, parent.y, sprite);
        this.parent = parent;
        this.spriteName = sprite;
        parent.scene.physics.world.enable(this);
        parent.scene.add.existing(this);
        this.tint = tint;
    }

    update() {
        this.x = this.parent.x;
        this.y = this.parent.y;
    }

    getAnimationName(name, parentName) {
        return name.replace(parentName, this.spriteName);
    }
}
