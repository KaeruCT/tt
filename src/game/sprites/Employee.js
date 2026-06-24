import Phaser from 'phaser';
import { Relief } from '../logic/relief';
import { TILE_SIZE } from '../systems/TilemapManager';
import { generateUUID } from '../utils/misc';
import { Clothes, Hair } from './EmployeeDecorations';

export default class Employee extends Phaser.GameObjects.Sprite {
  constructor(scene, meta, x, y, tilemap) {
    super(scene, x, y, 'employee');
    scene.physics.world.enable(this);
    scene.add.existing(this);
    this.setOrigin(0.5, 0.75);
    this.initialSpeed = 100;
    this.speed = this.initialSpeed;
    this.meta = meta;
    this.path = [];
    this.tilemap = tilemap;
    this.tint = meta.tint;
    this.working = true;
    this.reliefPoint = null;
    this.nextReliefMinTime = 0;
    this.relief = null;
    this.time = 0;
    this.seed = Math.random();
    this.meta.sadness = this.meta.sadness || 0;
    this.sadnessLimit = 3;
    this.nightPaused = false;
    this.destination = null;
    this.onDestinationSuccess = null;

    this.decorations = [new Hair(this, meta.hair), new Clothes(this, meta.clothes)];

    // Needs indicator (emoji floating above head)
    this.needsIndicator = scene.add
      .text(x, y - 14, '', { fontSize: '10px', fontFamily: 'monospace' })
      .setOrigin(0.5)
      .setDepth(99999);

    this.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.selectEmployee(this));

    const { anims } = this.scene;
    anims.create({
      key: 'employee-down',
      frames: anims.generateFrameNumbers('employee', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'employee-left',
      frames: anims.generateFrameNumbers('employee', { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'employee-right',
      frames: anims.generateFrameNumbers('employee', { start: 8, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'employee-up',
      frames: anims.generateFrameNumbers('employee', { start: 12, end: 15 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  setDestination(destination) {
    this.working = false;
    return new Promise((resolve) => {
      this.destination = destination;
      this.reliefPoint = destination;
      this._updatePathFinder();
      this.onDestinationSuccess = resolve;
    });
  }

  _updatePathFinder() {
    const { scene, tilemap } = this;
    if (!scene) return;
    if (!this.destination) return;

    const from = tilemap.pixelToGrid(this.x, this.y);
    const to =
      this.destination.gridX !== undefined
        ? { x: this.destination.gridX, y: this.destination.gridY }
        : tilemap.pixelToGrid(this.destination.x || 0, this.destination.y || 0);

    tilemap.findPath(from.x, from.y, to.x, to.y, this._onPathUpdate.bind(this));
  }

  _onPathUpdate(path) {
    if (path !== null) {
      if (path.length > 0) path.shift();
      this.path = path;
      console.log('Employee', this.meta.name, 'path found,', path.length, 'steps');
    } else {
      this.path = [];
      console.log('Employee', this.meta.name, 'no path found');
    }
  }

  setRelief(relief) {
    if (!relief) {
      this.relief = null;
      return;
    }

    this.relief = new Relief(
      relief,
      this.time,
      () => console.log('Employee', this.meta.name, 'started', relief.label),
      () => {
        this.nextReliefMinTime = this.time + relief.cooldown * 1000;
        console.log('Employee', this.meta.name, 'finished', relief.label);
        if (this.meta.stats[relief.id]) {
          this.meta.stats[relief.id].times += 1;
        }
        this.setRelief(null);

        // Auto-wash hands after pee/poo if a sink is available
        if ((relief.id === 'pee' || relief.id === 'poo') && this.scene._tryWashHands) {
          this.scene._tryWashHands(this);
        } else {
          this.goToDesk();
        }
      },
    );
  }

  startToRelieve() {
    const { relief, reliefPoint } = this;
    this.speed = this.initialSpeed;
    if (!relief) return;
    this.relief.release(reliefPoint);
  }

  giveUp() {
    if (this.relief) this.relief.attempted(this.time);
    this.speed += 5;
    this.goToDesk();
  }

  goToDesk() {
    const desk = this.meta.desk;
    if (!desk) {
      this.working = true;
      return;
    }
    const pixelPos = this.tilemap.gridToPixel(desk.gridX, desk.gridY);
    const dest = { x: pixelPos.x, y: pixelPos.y, gridX: desk.gridX, gridY: desk.gridY, meta: desk.meta };
    this.setDestination(dest).then(() => {
      this.working = true;
    });
  }

  triggerRestroomAttempt(findReliefPoint) {
    if (!this.relief) return;

    // Smoke breaks don't need a relief point
    if (this.relief.relief?.outdoor) {
      this.startToRelieve();
      return;
    }

    const reliefPoint = findReliefPoint(this.relief.id);
    if (!reliefPoint) {
      console.log('No proper restroom for', this.meta.name);
      this.giveUp();
      return;
    }

    this.setDestination(reliefPoint).then((destination) => {
      const cantUse = typeof destination.canUse === 'function' && !destination.canUse();
      if (cantUse) {
        console.log(this.meta.name, 'went to relief point but it was busy');
        this.giveUp();
      } else {
        this.startToRelieve();
      }
    });
  }

  onEmployeeRemoval(type) {
    this.scene.removeEmployee(this, type);
    if (this.relief && this.reliefPoint) this.relief.release(this.reliefPoint);
    if (this.scene.hud?.selectedEmployee === this) this.scene.hud.selectEmployee(null);
    this.decorations.forEach((d) => d.destroy());
    this.destroy();
  }

  fire() {
    console.log('Employee', this.meta.name, 'fired!');
    this.onEmployeeRemoval('fire');
  }

  quit() {
    console.log('Employee', this.meta.name, 'quit!');
    this.onEmployeeRemoval('quit');
  }

  update(time, delta) {
    if (this.nightPaused) return;
    this.time = time;

    const { tilemap, speed, destination, path, body, relief, meta } = this;
    const dx = body.velocity.x ? (body.velocity.x > 0 ? -1 : 1) : 0;
    const dy = body.velocity.y ? (body.velocity.y > 0 ? -1 : 1) : 0;
    const current = tilemap.pixelToGrid(this.x + dx * TILE_SIZE * 0.5, this.y + dy * TILE_SIZE * 0.5);

    // Follow path
    const nextPoint = path.length && path[0];
    if (nextPoint) {
      const nextPx = nextPoint.x * TILE_SIZE + TILE_SIZE / 2;
      const nextPy = nextPoint.y * TILE_SIZE + TILE_SIZE / 2;

      if (nextPy < this.y) body.setVelocityY(-speed);
      else if (nextPy > this.y) body.setVelocityY(speed);
      else body.setVelocityY(0);

      if (nextPx < this.x) body.setVelocityX(-speed);
      else if (nextPx > this.x) body.setVelocityX(speed);
      else body.setVelocityX(0);

      body.velocity.normalize().scale(speed);

      if (current.x === nextPoint.x && current.y === nextPoint.y) {
        path.shift();
        body.setVelocityY(0);
        body.setVelocityX(0);
      }
    }

    // Animations
    if (body.velocity.y < 0) this.playAnimation('employee-up');
    else if (body.velocity.y > 0) this.playAnimation('employee-down');
    else if (body.velocity.x < 0) this.playAnimation('employee-left');
    else if (body.velocity.x > 0) this.playAnimation('employee-right');
    else if (destination === null) this.stopAnimations();

    // Check arrival
    if (destination) {
      const d =
        this.destination.gridX !== undefined
          ? { x: this.destination.gridX, y: this.destination.gridY }
          : tilemap.pixelToGrid(destination.x || 0, destination.y || 0);

      if (current.x === d.x && current.y === d.y) {
        if (this.onDestinationSuccess) {
          this.onDestinationSuccess(this.destination);
          this.onDestinationSuccess = null;
        }
        this.destination = null;
        console.log('Employee', meta.name, 'arrived');
      }
    }

    this.decorations.forEach((d) => d.update());

    // Update needs indicator
    if (this.needsIndicator) {
      this.needsIndicator.setPosition(this.x, this.y - 14);
      if (this.relief && !this.relief.inProgress) {
        const icons = { pee: '💧', poo: '💩', wash_hands: '🧼', shower: '🚿', smoke_break: '🚬' };
        this.needsIndicator.setText(icons[this.relief.id] || '❓');
        this.needsIndicator.setAlpha(0.7 + Math.sin(this.time * 0.005) * 0.3);
      } else if (this.relief?.inProgress) {
        this.needsIndicator.setText('⏳');
        this.needsIndicator.setAlpha(0.8);
      } else {
        this.needsIndicator.setText('');
      }
    }

    if (this.working) {
      meta.stats.work.duration += delta;
    } else if (relief?.inProgress && meta.stats[relief.id]) {
      meta.stats[relief.id].duration += delta;
    }
  }

  releaseInPlace(relief) {
    const { scene, meta, x, y } = this;
    console.log('Oh no! Employee', meta.name, 'could not hold their', relief.id);
    meta.sadness += 1;
    scene.addDropping({ id: generateUUID(), reliefId: relief.id, x, y });
    relief.forcedFinish();
    if (meta.stats[relief.id]) {
      meta.stats[relief.id].outside += 1;
    }

    if (meta.sadness >= this.sadnessLimit) {
      this.quit();
    }
  }

  playAnimation(name) {
    this.anims.play(name, true);
    this.decorations.forEach((d) => d.anims.play(d.getAnimationName(name, 'employee'), true));
  }

  stopAnimations() {
    this.anims.stop();
    this.decorations.forEach((d) => d.anims.stop());
  }

  setDepth(depth) {
    super.setDepth(depth);
    this.decorations.forEach((d) => d.setDepth(depth));
  }
}
