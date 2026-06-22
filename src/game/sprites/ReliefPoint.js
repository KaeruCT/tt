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
    this.gridX = meta.gridX;
    this.gridY = meta.gridY;

    this.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.startFixing());

    const { anims } = this.scene;
    anims.create({
      key: 'pissoir',
      frames: anims.generateFrameNumbers('relief_point', { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'toilet',
      frames: anims.generateFrameNumbers('relief_point', { start: 1, end: 1 }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'pissoir_dirty',
      frames: anims.generateFrameNumbers('relief_point', { start: 2, end: 2 }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'toilet_dirty',
      frames: anims.generateFrameNumbers('relief_point', { start: 3, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'pissoir_cleaning',
      frames: anims.generateFrameNumbers('relief_point', { start: 8, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'toilet_cleaning',
      frames: anims.generateFrameNumbers('relief_point', { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    anims.create({
      key: 'sink',
      frames: anims.generateFrameNumbers('relief_point', { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1,
    });
    this.flipX = true;
    this.updateAnimation();
  }

  supportsRelief(reliefId) {
    const type = RELIEF_TYPES[this.reliefId];
    if (!type) return false;
    return type.supported.includes(reliefId);
  }

  beginUsing() {
    this.busy = true;
  }

  stopUsing() {
    const relief = RELIEF_TYPES[this.reliefId];
    this.busy = false;
    this.meta.usages += 1;

    // Check breakage
    const durabilityMult = this._getUpgradeEffect('durabilityMultiplier') || 1;
    const effectiveMinUsages = Math.floor(relief.minPointUsages * durabilityMult);
    if (this.meta.usages >= effectiveMinUsages && randBool(0.8)) {
      if (!this._getUpgradeEffect('unbreakable')) {
        this.meta.broken = true;
        this.updateAnimation();
      }
    }
  }

  startFixing() {
    if (this.fixing) return;
    const { economy } = this.scene;
    const cost = economy.getFacilityFixCost(this.reliefId);
    economy.doIfAffordable(() => {
      this.fixing = true;
      this.updateAnimation();
      this.scene.time.delayedCall(RELIEF_TYPES[this.reliefId].fixPointTime * 1000, () => this.fix());
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
    return !this.fixing && !this.meta.broken && !this.busy && !this.meta.flooded;
  }

  // --- Upgrades ---

  hasUpgrade(upgradeId) {
    return this.meta.upgrades?.includes(upgradeId) || false;
  }

  addUpgrade(upgradeId) {
    if (!this.meta.upgrades) this.meta.upgrades = [];
    if (!this.meta.upgrades.includes(upgradeId)) {
      this.meta.upgrades.push(upgradeId);
    }
  }

  _getUpgradeEffect(effectKey) {
    if (!this.meta.upgrades) return null;
    // Import UPGRADES dynamically to avoid circular dep
    // For now, hardcode known effects
    if (effectKey === 'durabilityMultiplier' && this.meta.upgrades.includes('premium_stall')) return 1.5;
    if (effectKey === 'unbreakable' && this.meta.upgrades.includes('magical_plumbing')) return true;
    return null;
  }

  // --- Animation ---

  updateAnimation() {
    this.anims.play(this.getAnimation(), true);
  }

  getAnimation() {
    const { reliefId } = this;
    if (reliefId === 'poo') {
      if (this.fixing) return 'toilet_cleaning';
      if (this.meta.broken) return 'toilet_dirty';
      return 'toilet';
    }
    if (reliefId === 'pee' || reliefId === 'wash_hands' || reliefId === 'shower') {
      if (this.fixing) return 'pissoir_cleaning';
      if (this.meta.broken) return 'pissoir_dirty';
      return 'pissoir';
    }
    return 'pissoir';
  }
}
