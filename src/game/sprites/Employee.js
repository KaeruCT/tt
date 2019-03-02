export default class Employee {
    constructor(scene, x, y) {
        this.scene = scene;
        this.cursors = scene.input.keyboard.createCursorKeys();

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

        this.sprite = scene.physics.add
            .sprite(x, y, 'employee')
            .setSize(16, 8)
            .setOffset(0, 8);
    }

    update() {
        const { sprite, cursors } = this;
        const speed = 80;
        const prevVelocity = sprite.body.velocity.clone();
        // Stop any previous movement from the last frame
        sprite.setVelocity(0);

        // Horizontal movement
        if (cursors.left.isDown) {
            sprite.setVelocityX(-speed);
        } else if (cursors.right.isDown) {
            sprite.setVelocityX(speed);
        }

        // Vertical movement
        if (cursors.up.isDown) {
            sprite.setVelocityY(-speed);
        } else if (cursors.down.isDown) {
            sprite.setVelocityY(speed);
        }

        // Normalize and scale the velocity so that employee can't move faster along a diagonal
        sprite.body.velocity.normalize().scale(speed);

        // Update the animation last and give left/right animations precedence over up/down animations
        const { anims } = sprite;
        if (cursors.left.isDown) {
            anims.play('employee-left', true);
        } else if (cursors.right.isDown) {
            anims.play('employee-right', true);
        } else if (cursors.up.isDown) {
            anims.play('employee-up', true);
        } else if (cursors.down.isDown) {
            anims.play('employee-down', true);
        } else {
            anims.stop();

            // If we were moving, pick and idle frame to use
            //if (prevVelocity.x < 0) this.setTexture('atlas', 'misa-left');
            //else if (prevVelocity.x > 0) this.setTexture('atlas', 'misa-right');
            //else if (prevVelocity.y < 0) this.setTexture('atlas', 'misa-back');
            //else if (prevVelocity.y > 0) this.setTexture('atlas', 'misa-front');
        }
    }

    destroy() {
        this.sprite.destroy();
    }
}