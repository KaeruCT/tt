import Phaser from 'phaser';
import { Business } from '../logic/business';
import { RELIEF_TYPES } from '../logic/relief';
import DecorSprite from '../sprites/Decor';
import Desk from '../sprites/Desk';
import Dropping from '../sprites/Dropping';
import Employee from '../sprites/Employee';
import ReliefPoint from '../sprites/ReliefPoint';
import DayCycle, { PHASE } from '../systems/DayCycle';
import EconomyManager from '../systems/EconomyManager';
import EventManager from '../systems/EventManager';
import TilemapManager, { TILE_SIZE, TILE_TYPES } from '../systems/TilemapManager';
import { rollTraits } from '../systems/TraitSystem';
import { CLOTHES_COLORS, generateUUID, HAIR_COLORS, SKIN_COLORS } from '../utils/misc';
import { randBool, randRange, randValue } from '../utils/rand';

const NAMES = [
  'Abdullah',
  'Luciano',
  'Oliver',
  'Cezar',
  'Julio',
  'Alejandra',
  'Eric',
  'Alex',
  'Nick',
  'Patrick',
  'Katherine',
  'Mohammed',
  'Andres',
  'Oscar',
  'Sahil',
  'Catherine',
  'Anna',
  'Omer',
  'Alvaro',
  'David',
  'Ivan',
  'Kate',
  'Carina',
  'Francisco',
  'Laura',
  'Marcela',
  'Eva',
  'Adriana',
  'Lucia',
  'Helena',
  'Nicole',
  'Anastasia',
  'Mary',
  'Christine',
  'Sofia',
  'Monica',
];

const HOBBIES = [
  'videogames',
  'playing music',
  'bouldering',
  'hiking',
  'knitting',
  'cooking',
  'crafts',
  'travelling',
  'painting',
  'poetry',
  'reading',
  'football',
  'basketball',
  'volleyball',
  'cricket',
  'brewing',
  'chess',
  'backpacking',
  'archery',
  'bodybuilding',
  'magic',
  'cycling',
  'martial arts',
  'rock collecting',
  'sommelier',
  'voluntering',
  'poker',
  'playing guitar',
  'playing piano',
  'fishing',
  'surfing',
  'bowling',
  'interior design',
  'languages',
  'movies',
  'dancing',
  'board games',
  'fanfics',
  'writing',
  'philosophy',
  'woodworking',
  'fashion',
];

const BUILD_MODES = {
  DIG: { id: 'dig', label: 'Dig', costFn: 'getDigCost', icon: '\u26CF' },
  DESK: { id: 'desk', label: 'Desk', cost: 30, icon: '\uD83E\uDE91' },
  PEE: { id: 'pee', label: 'Pee Point', costFn: 'getFacilityCost', costArg: 'pee', icon: '\uD83D\uDEBD' },
  POO: { id: 'poo', label: 'Poo Point', costFn: 'getFacilityCost', costArg: 'poo', icon: '\uD83D\uDEBD' },
  SINK: { id: 'sink', label: 'Sink', costFn: 'getFacilityCost', costArg: 'wash_hands', icon: '\uD83D\uDEB0' },
  SHOWER: { id: 'shower', label: 'Shower', costFn: 'getFacilityCost', costArg: 'shower', icon: '\uD83D\uDEBF' },
  CARPET: { id: 'carpet', label: 'Carpet', costFn: 'getCarpetCost', icon: '\uD83D\uDFEB' },
  DECOR: { id: 'decor', label: 'Decor', cost: 10, icon: '\uD83C\uDF3F' },
};

export default class OfficeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OfficeScene', active: true });
  }

  preload() {
    this.load.image('Dungeon_Tileset', 'assets/2d/tileset/Dungeon_Tileset.png');
    this.load.spritesheet('employee', 'assets/2d/char.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('hair', 'assets/2d/hair.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('clothes', 'assets/2d/clothes.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('relief_point', 'assets/2d/relief.png', { frameWidth: 16, frameHeight: 16 });
    this.load.plugin('rexpinchplugin', 'assets/rexpinchplugin.min.js', true);
  }

  create() {
    this.t = 0;
    this.fundIncrement = 0;
    this.hud = this.scene.get('HudScene');

    // --- Systems ---
    this.tilemap = new TilemapManager(this);
    this.tilemap.create('Dungeon_Tileset', 'Dungeon_Tileset');

    this.economy = new EconomyManager({
      onFundsChange: this.onFundsChange.bind(this),
      onDailyReport: this.onDailyReport.bind(this),
    });

    this.dayCycle = new DayCycle({
      dayDuration: 40,
      nightDuration: 20,
      onPhaseChange: this.onPhaseChange.bind(this),
    });

    this.eventManager = new EventManager(this);
    this.business = new Business();

    // --- Restore saved state ---
    const stored = localStorage.getItem('business');
    if (stored) {
      const data = JSON.parse(stored);
      const tilemapData = this.business.load(data, this.economy, this.dayCycle, this.eventManager);
      if (tilemapData) {
        this.tilemap.load(tilemapData);
      }
    }

    // --- Camera ---
    this.initCamera();

    // --- Day/Night overlay ---
    this.phaseOverlay = this.add.graphics().setDepth(500).setAlpha(0);

    // --- Groups ---
    this.employees = this.add.group();
    this.reliefPoints = this.add.group();
    this.droppings = this.add.group();
    this.desks = this.add.group();
    this.decor = this.add.group();

    // --- Build mode state ---
    this.buildMode = BUILD_MODES.DIG;
    this.buildCursor = this.add.graphics().setDepth(100).setAlpha(0.6);
    this.buildCursorVisible = false;
    this._buildGrid = null;

    // Ghost preview (semi-transparent preview of what will be placed)
    this._ghostPreview = this.add.graphics().setDepth(99).setAlpha(0.4);
    this._ghostPrevType = null;

    // Buildable area overlay (dim non-walkable tiles during night)
    this._buildableOverlay = this.add.graphics().setDepth(1).setAlpha(0.25);
    this._buildableOverlayVisible = false;

    // --- Restore employees ---
    if (stored) {
      const storedEmployees = this.business.getEmployees();
      for (const se of storedEmployees) {
        this.addEmployee(se);
      }

      const storedReliefPoints = this.business.getReliefPoints();
      for (const srp of storedReliefPoints) {
        this.tilemap.setObject(srp.gridX, srp.gridY, srp.reliefId);
        const pixelPos = this.tilemap.gridToPixel(srp.gridX, srp.gridY);
        const reliefPoint = new ReliefPoint(this, {
          id: srp.id,
          reliefId: srp.reliefId,
          x: pixelPos.x,
          y: pixelPos.y,
          gridX: srp.gridX,
          gridY: srp.gridY,
          broken: srp.broken || false,
          usages: srp.usages || 0,
          upgrades: srp.upgrades || [],
        });
        this.reliefPoints.add(reliefPoint);
      }

      const droppings = this.business.getDroppings();
      for (const d of droppings) {
        this.addDropping(d, false);
      }

      this._restoreObjectSprites();
    } else {
      this.addEmployee();
      const startTiles = this.tilemap.getEmptyFloorTiles();
      if (startTiles.length >= 2) {
        const mid = Math.floor(startTiles.length / 2);
        this.placeObject(startTiles[mid].x, startTiles[mid].y, 'poo');
        this.placeObject(startTiles[mid - 1].x, startTiles[mid - 1].y, 'pee');
      }
    }

    // --- Input ---
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerdown', this.onPointerDown, this);

    // Expose for tests
    window.__officeScene = this;
  }

  // ===================================================================
  // Camera
  // ===================================================================

  initCamera() {
    const camera = this.cameras.main;

    const cx = Math.floor(this.tilemap.cols / 2) * TILE_SIZE;
    const cy = Math.floor(this.tilemap.rows / 2) * TILE_SIZE;
    camera.centerOn(cx, cy);

    this.plugins
      .get('rexpinchplugin')
      .add(this)
      .on('drag1', (dragScale) => {
        const v = dragScale.drag1Vector;
        camera.scrollX -= v.x / camera.zoom;
        camera.scrollY -= v.y / camera.zoom;
      })
      .on(
        'pinch',
        (dragScale) => {
          camera.zoom *= dragScale.scaleFactor;
        },
        this,
      );
  }

  // ===================================================================
  // Phase Change
  // ===================================================================

  onPhaseChange(phase, day) {
    this.hud.onPhaseChange(phase, day);

    if (phase === PHASE.NIGHT) {
      this._enterNight();
    } else {
      this._enterDay();
    }

    // Crossfade world tint
    this._animatePhaseOverlay(phase);
  }

  _animatePhaseOverlay(_phase) {
    // No world-space overlay — the day/night HUD indicator is sufficient.
    // World-space tinting was washing out the carefully chosen tile colors.
    this.phaseOverlay.clear();
    this.phaseOverlay.setAlpha(0);
  }

  _enterNight() {
    const nightDurationMs = this.dayCycle.nightDuration * 1000;
    this.employees.getChildren().forEach((e) => {
      e.body.setVelocity(0, 0);
      e.stopAnimations();
      e.nightPaused = true;
      if (e.relief?.expirationTime) {
        e.relief.expirationTime += nightDurationMs;
      }
      // Spawn ZZZ particles for sleeping employees
      this._spawnSleepParticles(e);
    });

    this.reliefPoints.getChildren().forEach((rp) => {
      if (rp.meta.flooded) {
        rp.meta.flooded = false;
        rp.updateAnimation();
      }
    });

    this.reliefPoints.getChildren().forEach((rp) => {
      if (rp.meta.broken) {
        rp.fix();
      }
    });

    if (this.economy.janitorEnabled) {
      this._cleanAllDroppings();
    }

    const employeeCount = this.employees.getChildren().length;
    const reliefCounts = {};
    this.reliefPoints.getChildren().forEach((rp) => {
      reliefCounts[rp.reliefId] = (reliefCounts[rp.reliefId] || 0) + 1;
    });
    const dugTiles =
      this.tilemap.getTilesOfType(TILE_TYPES.STONE_FLOOR).length +
      this.tilemap.getTilesOfType(TILE_TYPES.CARPET_FLOOR).length;

    this.economy.processEndOfDay(employeeCount, reliefCounts, dugTiles);

    // Draw buildable area overlay
    this._drawBuildableOverlay();
  }

  _enterDay() {
    this.employees.getChildren().forEach((e) => {
      e.nightPaused = false;
      // Morning stretch animation
      this._playStretchAnimation(e);
      if (!e.relief) {
        e.goToDesk();
      } else {
        e.destination = null;
        e.path = [];
        e.body.setVelocity(0, 0);
      }
    });

    this.buildCursorVisible = false;
    this.buildCursor.clear();
    this._buildableOverlay.clear();
    this._buildableOverlayVisible = false;
  }

  _spawnSleepParticles(employee) {
    if (!employee?.active) return;
    let _count = 0;
    const timer = this.time.addEvent({
      delay: 800,
      repeat: 4,
      callback: () => {
        if (!employee.nightPaused || !employee.active) {
          timer.remove();
          return;
        }
        this._emitParticle(employee.x, employee.y - 12, 'Z', '#aabbdd', 600);
        _count++;
      },
    });
  }

  _playStretchAnimation(employee) {
    if (!employee?.active) return;
    // Quick scale pulse to simulate stretch
    this.tweens.add({
      targets: employee,
      scaleY: 1.2,
      scaleX: 0.9,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  _drawBuildableOverlay() {
    // Disabled — dark overlay was making tiles look muddy.
  }

  _cleanAllDroppings() {
    this.droppings.getChildren().forEach((d) => d.destroy());
    this.droppings.clear(true, true);
  }

  _restoreObjectSprites() {
    const desks = this.tilemap.getObjectsOfType('desk');
    for (const d of desks) {
      this.desks.add(new Desk(this, d.gridX, d.gridY));
    }
    const decors = this.tilemap.getObjectsOfType('decor');
    for (const d of decors) {
      this.decor.add(new DecorSprite(this, d.gridX, d.gridY));
    }
  }

  onDailyReport(report) {
    this.hud.onDailyReport(report);
  }

  // ===================================================================
  // Particle System
  // ===================================================================

  _emitParticle(x, y, text, color, duration) {
    const p = this.add
      .text(x, y, text, {
        fill: color || '#ffffff',
        fontSize: '6px',
        fontFamily: '"Press Start 2P", monospace',
      })
      .setDepth(5000)
      .setAlpha(1);
    this.tweens.add({
      targets: p,
      y: y - 16,
      alpha: 0,
      duration: duration || 500,
      ease: 'Sine.easeOut',
      onComplete: () => p.destroy(),
    });
  }

  _emitBuildParticles(gridX, gridY, color) {
    const cx = gridX * TILE_SIZE + TILE_SIZE / 2;
    const cy = gridY * TILE_SIZE + TILE_SIZE / 2;
    for (let i = 0; i < 4; i++) {
      const px = cx + (Math.random() - 0.5) * 8;
      const py = cy + (Math.random() - 0.5) * 8;
      const p = this.add.graphics().setDepth(5000);
      p.fillStyle(color, 1);
      p.fillRect(px, py, 2, 2);
      this.tweens.add({
        targets: p,
        y: py - 12 + Math.random() * 8,
        x: px + (Math.random() - 0.5) * 12,
        alpha: 0,
        duration: 400,
        ease: 'Sine.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  _emitDustParticle(x, y) {
    const p = this.add.graphics().setDepth(5000);
    const px = x + (Math.random() - 0.5) * 4;
    const py = y + (Math.random() - 0.5) * 2;
    p.fillStyle(0x8a7a5a, 0.6);
    p.fillRect(px, py, 1, 1);
    this.tweens.add({
      targets: p,
      y: py - 4,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeOut',
      onComplete: () => p.destroy(),
    });
  }

  // ===================================================================
  // Screen Shake
  // ===================================================================

  _screenShake(intensity = 3, duration = 200) {
    const cam = this.cameras.main;
    cam.shake(duration, intensity / 1000);
  }

  // ===================================================================
  // Build Mode
  // ===================================================================

  onPointerMove(pointer) {
    if (!this.dayCycle.isBuildMode()) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const grid = this.tilemap.pixelToGrid(worldPoint.x, worldPoint.y);

    this.buildCursor.clear();
    this._ghostPreview.clear();

    if (grid.x < 0 || grid.x >= this.tilemap.cols || grid.y < 0 || grid.y >= this.tilemap.rows) return;

    const px = grid.x * TILE_SIZE;
    const py = grid.y * TILE_SIZE;

    const canPlace = this._canBuildHere(grid.x, grid.y);
    const color = canPlace ? 0x5ba85b : 0xa84a4a;

    // Cursor rect with animated dashes (blinking corners)
    const dashPhase = Math.floor((this.t % 40) / 10);
    this.buildCursor.lineStyle(1, color, 0.8);

    // Top edge
    for (let i = 0; i < 4; i++) {
      if ((i + dashPhase) % 2 === 0) {
        this.buildCursor.lineBetween(px + i * 4, py, px + i * 4 + 4, py);
      }
      // Bottom
      if ((i + dashPhase) % 2 === 0) {
        this.buildCursor.lineBetween(px + i * 4, py + TILE_SIZE, px + i * 4 + 4, py + TILE_SIZE);
      }
      // Left
      if ((i + dashPhase) % 2 === 0) {
        this.buildCursor.lineBetween(px, py + i * 4, px, py + i * 4 + 4);
      }
      // Right
      if ((i + dashPhase) % 2 === 0) {
        this.buildCursor.lineBetween(px + TILE_SIZE, py + i * 4, px + TILE_SIZE, py + i * 4 + 4);
      }
    }

    // Ghost preview
    if (canPlace) {
      this._ghostPreview.fillStyle(0xffffff, 0.15);
      this._ghostPreview.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    this.buildCursorVisible = true;
    this._buildGrid = grid;
  }

  onPointerDown(_pointer) {
    if (!this.dayCycle.isBuildMode()) return;
    if (!this._buildGrid) return;

    const { x, y } = this._buildGrid;
    if (!this._canBuildHere(x, y)) return;

    // Check affordability first
    const mode = this.buildMode;
    const cost = this._getBuildCost(mode);
    if (!this.economy.canAfford(cost)) {
      this._cantAffordFlash();
      return;
    }

    this._executeBuild(x, y);
  }

  _getBuildCost(mode) {
    if (mode.costFn) {
      if (mode.id === 'dig') return this.tilemap.getDigCost();
      if (mode.id === 'carpet') return this.tilemap.getCarpetCost();
      return this.economy.getFacilityCost(mode.costArg);
    }
    return mode.cost || 0;
  }

  _cantAffordFlash() {
    // Red flash on funds
    if (this.hud.fundsBox) {
      this.tweens.add({
        targets: this.hud.fundsBox,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 2,
      });
    }
    this._screenShake(2, 100);
  }

  _canBuildHere(gridX, gridY) {
    const mode = this.buildMode;

    if (mode.id === 'dig') {
      return this.tilemap.getTileType(gridX, gridY) === TILE_TYPES.ROCK;
    }

    if (mode.id === 'carpet') {
      return this.tilemap.getTileType(gridX, gridY) === TILE_TYPES.STONE_FLOOR && !this.tilemap.getObject(gridX, gridY);
    }

    return this.tilemap.canPlaceObject(gridX, gridY);
  }

  _executeBuild(gridX, gridY) {
    const mode = this.buildMode;
    const cost = this._getBuildCost(mode);

    if (!this.economy.canAfford(cost)) return;

    const success = this._doBuild(gridX, gridY, mode);
    if (success) {
      this.economy.takeFunds(cost);
      this._onBuildSuccess(gridX, gridY, mode);
    }
  }

  _onBuildSuccess(gridX, gridY, mode) {
    // Particle effects
    const colors = {
      dig: 0x8a7a6a,
      desk: 0x8a6a4a,
      carpet: 0x6a5a4a,
      decor: 0x4a8a4a,
      pee: 0x6a8aaa,
      poo: 0x6a4a2a,
      sink: 0x6a8aaa,
      shower: 0x5a8aaa,
    };
    const color = colors[mode.id] || 0xffffff;
    this._emitBuildParticles(gridX, gridY, color);

    // Screen flash
    const px = gridX * TILE_SIZE + TILE_SIZE / 2;
    const py = gridY * TILE_SIZE + TILE_SIZE / 2;
    const flash = this.add.graphics().setDepth(5000);
    flash.fillStyle(0xffffff, 0.3);
    flash.fillRect(px - 8, py - 8, 16, 16);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  _doBuild(gridX, gridY, mode) {
    switch (mode.id) {
      case 'dig':
        return this.tilemap.dig(gridX, gridY);

      case 'carpet':
        return this.tilemap.setCarpet(gridX, gridY);

      case 'desk': {
        const ok = this.tilemap.canPlaceObject(gridX, gridY);
        if (!ok) return false;
        this.tilemap.setObject(gridX, gridY, 'desk');
        this.desks.add(new Desk(this, gridX, gridY));
        return true;
      }

      case 'pee':
      case 'poo':
      case 'sink':
      case 'shower': {
        const ok = this.tilemap.canPlaceObject(gridX, gridY);
        if (!ok) return false;
        const reliefId = mode.id === 'sink' ? 'wash_hands' : mode.id;
        this.placeObject(gridX, gridY, reliefId);
        return true;
      }

      case 'decor': {
        const ok = this.tilemap.canPlaceObject(gridX, gridY);
        if (!ok) return false;
        this.tilemap.setObject(gridX, gridY, 'decor');
        this.decor.add(new DecorSprite(this, gridX, gridY));
        return true;
      }

      default:
        return false;
    }
  }

  setBuildMode(modeKey) {
    const mode = Object.values(BUILD_MODES).find((m) => m.id === modeKey);
    if (mode) this.buildMode = mode;
  }

  // ===================================================================
  // Objects
  // ===================================================================

  placeObject(gridX, gridY, objectType) {
    this.tilemap.setObject(gridX, gridY, objectType);
    const pixelPos = this.tilemap.gridToPixel(gridX, gridY);

    if (objectType === 'pee' || objectType === 'poo' || objectType === 'wash_hands' || objectType === 'shower') {
      const reliefPoint = new ReliefPoint(this, {
        id: generateUUID(),
        reliefId: objectType,
        x: pixelPos.x,
        y: pixelPos.y,
        gridX,
        gridY,
        broken: false,
        usages: 0,
        upgrades: [],
      });
      this.reliefPoints.add(reliefPoint);
      this.business.addReliefPoint(reliefPoint);
      return reliefPoint;
    }
    return null;
  }

  addDropping(meta, save = true) {
    const drop = new Dropping(this, meta);
    this.droppings.add(drop);
    if (save) this.business.addDropping(drop);
  }

  // ===================================================================
  // Employee Management
  // ===================================================================

  addEmployee(storedMeta = null) {
    const emptyDesks = this.tilemap.getObjectsOfType('desk').filter((d) => {
      const existing = this.employees
        .getChildren()
        .find((e) => e.meta.desk && e.meta.desk.gridX === d.gridX && e.meta.desk.gridY === d.gridY);
      return !existing;
    });

    if (!storedMeta && emptyDesks.length === 0) {
      const emptyTiles = this.tilemap.getEmptyFloorTiles();
      if (emptyTiles.length > 0) {
        const pos = emptyTiles[0];
        this.tilemap.setObject(pos.x, pos.y, 'desk');
        this.desks.add(new Desk(this, pos.x, pos.y));
        return this.addEmployee();
      }
      return false;
    }

    const i = this.employees.getChildren().length;
    const meta = storedMeta || {
      id: generateUUID(),
      name: randValue(NAMES),
      age: randRange(18, 50),
      hobbies: Array.from({ length: randRange(1, 3) }, () => randValue(HOBBIES)),
      tint: SKIN_COLORS[i % SKIN_COLORS.length],
      hair: randValue(HAIR_COLORS),
      clothes: randValue(CLOTHES_COLORS),
      traits: rollTraits(),
      stats: {
        work: { duration: 0 },
        poo: { times: 0, duration: 0, outside: 0 },
        pee: { times: 0, duration: 0, outside: 0 },
        wash_hands: { times: 0, duration: 0 },
      },
    };

    let desk;
    if (storedMeta) {
      desk = this.tilemap
        .getObjectsOfType('desk')
        .find((d) => d.gridX === storedMeta.desk?.gridX && d.gridY === storedMeta.desk?.gridY);
    }
    if (!desk) {
      const desks = this.tilemap.getObjectsOfType('desk').filter((d) => {
        const taken = this.employees
          .getChildren()
          .find((e) => e.meta.desk && e.meta.desk.gridX === d.gridX && e.meta.desk.gridY === d.gridY);
        return !taken;
      });
      if (desks.length === 0) return false;
      desk = desks[0];
    }

    meta.desk = { gridX: desk.gridX, gridY: desk.gridY, meta: { id: `desk-${desk.gridX}-${desk.gridY}` } };

    const pixelPos = this.tilemap.gridToPixel(desk.gridX, desk.gridY);
    const e = new Employee(this, meta, pixelPos.x, pixelPos.y, this.tilemap);

    // Fade-in animation for new hires
    if (!storedMeta) {
      e.setAlpha(0);
      e.setScale(0.5);
      e.decorations.forEach((d) => d.setAlpha(0));
      this.tweens.add({
        targets: [e, ...e.decorations],
        alpha: 1,
        duration: 500,
        ease: 'Back.easeOut',
        onStart: () => {
          this.tweens.add({
            targets: e,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut',
          });
        },
      });
    }

    this.employees.add(e);
    e.body.setCollideWorldBounds(true);

    if (!storedMeta) this.business.addEmployee(e);

    return true;
  }

  hireEmployee() {
    this.economy.doIfAffordable(() => this.addEmployee(), this.economy.employeeCost);
  }

  removeEmployee(e, type) {
    this.business.employeeRemoval(e, type);
  }

  /**
   * Play quit/fire animation then remove.
   */
  animateEmployeeRemoval(e) {
    if (!e?.active) return;
    // Scale down + fade + drop
    this.tweens.add({
      targets: [e, ...e.decorations],
      alpha: 0,
      scaleY: 0.1,
      y: e.y + 8,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => {
        e.onEmployeeRemoval('quit');
      },
    });
    // Poof particles
    for (let i = 0; i < 6; i++) {
      this._emitParticle(e.x, e.y, '.', '#d4c5a9', 400 + Math.random() * 200);
    }
  }

  selectEmployee(e) {
    this.hud.selectEmployee(e);
    // Selection ring
    this._clearSelectionRing();
    if (e) {
      this._selectionRing = this.add.graphics().setDepth(e.depth - 1);
      this._selectionRing.lineStyle(1, 0xc9a84c, 0.6);
      this._selectionRing.strokeCircle(e.x, e.y, 10);
      this._selectedEmployee = e;
    }
  }

  _clearSelectionRing() {
    if (this._selectionRing) this._selectionRing.destroy();
    this._selectedEmployee = null;
  }

  // ===================================================================
  // Relief Points
  // ===================================================================

  findReliefPoint(reliefId) {
    const points = this.reliefPoints.getChildren().filter((p) => p.supportsRelief(reliefId));
    const cleanAndEmpty = points.filter((p) => !p.busy && !p.meta.broken);
    return randValue(cleanAndEmpty.length ? cleanAndEmpty : points);
  }

  getReliefPointCounts() {
    const counts = {};
    this.reliefPoints.getChildren().forEach((rp) => {
      counts[rp.reliefId] = (counts[rp.reliefId] || 0) + 1;
    });
    return counts;
  }

  _tryWashHands(employee) {
    const sinks = this.reliefPoints.getChildren().filter((p) => p.reliefId === 'wash_hands' && p.canUse());
    if (sinks.length === 0) {
      employee.goToDesk();
      return;
    }
    const nearest = sinks.reduce((best, s) => {
      const dist = Math.abs(s.x - employee.x) + Math.abs(s.y - employee.y);
      if (!best || dist < best.dist) return { point: s, dist };
      return best;
    }, null);

    if (nearest) {
      employee.setRelief(RELIEF_TYPES.wash_hands);
      employee.triggerRestroomAttempt(() => nearest.point);
    } else {
      employee.goToDesk();
    }
  }

  // ===================================================================
  // Funds
  // ===================================================================

  onFundsChange(amount) {
    this.hud.onFundsChange(amount);
  }

  // ===================================================================
  // Update Loop
  // ===================================================================

  update(time, _delta) {
    this.t++;
    const delta = this.game.loop.delta;

    // Phase progress bar

    if (this.dayCycle.isPlayMode()) {
      this._updateDayPhase(time, delta);
    }

    // Build mode visibility
    if (this.dayCycle.isBuildMode()) {
      this.buildCursor.setVisible(this.buildCursorVisible);
      this._ghostPreview.setVisible(this.buildCursorVisible);
    } else {
      this.buildCursor.setVisible(false);
      this._ghostPreview.setVisible(false);
    }

    // Selection ring follows employee
    if (this._selectedEmployee?.active) {
      this._selectionRing.clear();
      this._selectionRing.lineStyle(1, 0xc9a84c, 0.5 + Math.sin(this.t * 0.05) * 0.2);
      this._selectionRing.strokeCircle(this._selectedEmployee.x, this._selectedEmployee.y, 10);
    } else if (this._selectionRing) {
      this._clearSelectionRing();
    }

    // Save periodically
    if (this.t % 300 === 0) {
      this.business.save(this.economy, this.dayCycle, this.eventManager, this.tilemap);
    }
  }

  _updateDayPhase(time, delta) {
    const activeEvents = this.eventManager.getActiveEffects();
    const workStopped = activeEvents.workStopped === true;

    this.employees.getChildren().forEach((e) => {
      if (e.nightPaused) return;

      const t = this.t + Math.floor(e.seed * 1000);

      // Event speed modifier
      if (activeEvents.speedMultiplier) {
        e.speed = e.initialSpeed * activeEvents.speedMultiplier;
      } else {
        e.speed = e.initialSpeed;
      }

      // Scare employees
      if (activeEvents.scareEmployees && e.working && t % 200 === 0) {
        e.working = false;
        e.body.setVelocity((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
        // Panic wiggle
        e.triggerPanic = true;
        setTimeout(() => {
          if (e.active) e.goToDesk();
        }, 2000);
      }

      // Walking dust particles
      if (e.body.velocity.x !== 0 || e.body.velocity.y !== 0) {
        if (t % 8 === 0) this._emitDustParticle(e.x, e.y + 6);
      }

      // Arrival dust puff
      if (e.destination === null && e._wasMoving) {
        this._emitParticle(e.x, e.y + 4, '\u2022', '#8a7a5a', 300);
      }
      e._wasMoving = e.body.velocity.x !== 0 || e.body.velocity.y !== 0;

      if (t % 100 === 0) {
        // Relief logic
        const relief = e.relief;
        const urgencyMult = activeEvents.pooUrgencyMultiplier && !relief ? activeEvents.pooUrgencyMultiplier : 1.0;
        const triggerChance = 0.1 * urgencyMult;

        if (!relief && time > e.nextReliefMinTime && randBool(triggerChance)) {
          const needsPoo = randBool(0.5);
          const needsPee = randBool(0.35);
          const needsSmoke = randBool(0.15);

          if (needsSmoke && this.eventManager.activeEvents.length === 0) {
            e.setRelief(RELIEF_TYPES.smoke_break);
          } else if (needsPoo) {
            e.setRelief(RELIEF_TYPES.poo);
          } else if (needsPee) {
            e.setRelief(RELIEF_TYPES.pee);
          }

          if (e.relief) {
            e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
          }
        }

        if (relief) {
          if (!e.reliefPoint && !e.destination && !e.path.length) {
            e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
          }

          if (t % 500 === 0 && !relief.inProgress && relief.shouldAttemptAgain(t)) {
            e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
          }

          if (relief.expirationTime && time > relief.expirationTime) {
            if (!relief.inProgress && !(e.destination === null && e.reliefPoint !== null)) {
              // Panic animation before accident
              e.triggerPanic = true;
              const expiredRelief = relief;
              e.setRelief(null);
              setTimeout(() => e.releaseInPlace(expiredRelief), randRange(500, 2000));
            }
          }
        }
      }

      e.update(time, delta);

      if (e.working && !workStopped) {
        const rate = this.economy.getWorkRate(e, activeEvents);
        this.fundIncrement += (delta / 1000) * rate;
      }
    });

    // Z-depth sorting
    this.employees.getChildren().forEach((c) => {
      c.setDepth(c.y);
    });

    // Apply fund increments
    if (this.fundIncrement > 1) {
      const trunc = Math.trunc(this.fundIncrement);
      this.economy.addFunds(trunc);
      this.fundIncrement -= trunc;
    }

    // Update events
    this.eventManager.update(delta, this.employees.getChildren().length);
    this.hud.updateEvents(this.eventManager.getActiveEventNames());
  }

  // ===================================================================
  // Event Handlers
  // ===================================================================

  spawnRats(_evt) {
    console.log('[Event] Dungeon rats invade! Employees stop working.');
  }

  clearRats(_evt) {
    console.log('[Event] Rats cleared. Work resumes.');
  }

  inspectOffice(_evt) {
    // Banner handled via EventManager end event - we register a post-hoc banner
    const droppingCount = this.droppings.getChildren().length;
    const fine = droppingCount * 5;
    if (fine > 0) {
      this.economy.takeFunds(fine);
      console.log(`[Event] Health inspector fines $${fine} for ${droppingCount} droppings.`);
    } else {
      console.log('[Event] Health inspector finds office clean. No fine.');
    }
  }

  floodReliefPoints(count) {
    const available = this.reliefPoints.getChildren().filter((rp) => !rp.meta.flooded && !rp.meta.broken);
    const toFlood = available.slice(0, Math.min(count, available.length));
    toFlood.forEach((rp) => {
      rp.meta.flooded = true;
      rp.updateAnimation();
    });
  }

  onWaterMainBreak(evt) {
    this.floodReliefPoints(evt.definition.effect.floodReliefPoints || 1);
  }

  onWaterMainBreakEnd(_evt) {}

  // ===================================================================
  // Employee Info
  // ===================================================================

  getEmployeeInfo(e) {
    const { working, meta, relief } = e;
    const { name, age, hobbies, traits } = meta;

    let info = `${name}\nAge: ${age}\n`;
    if (traits && traits.length > 0) {
      info += `Traits: ${traits.map((t) => t.name).join(', ')}\n`;
    }
    info += `\nHobbies:\n - ${hobbies.join('\n - ')}\n\n`;
    info += `Working: ${working ? 'yes' : 'no'}\n`;
    if (meta.sadness) {
      info += `Couldn't hold it ${meta.sadness} time(s)\n`;
    }
    if (relief) {
      if (relief.inProgress) {
        info += `Currently: ${relief.relief.label}\n`;
      } else {
        info += `Needs to ${relief.relief.label}\n`;
        info += `Has tried ${relief.attempts} time(s)\n`;
      }
    }
    return info;
  }

  getEmployeeStats(e) {
    const { stats } = e.meta;
    const f = (d) => Math.floor(d / 1000);

    let info = 'Time...\n';
    info += ` - Working: ${f(stats.work.duration)}\n`;
    info += ` - Peeing: ${f(stats.pee.duration)}\n`;
    info += ` - Pooping: ${f(stats.poo.duration)}\n`;

    info += '\nTotals\n';
    info += ` - Pee: ${stats.pee.times} (${stats.pee.outside} on floor)\n`;
    info += ` - Poo: ${stats.poo.times} (${stats.poo.outside} on floor)\n`;
    return info;
  }
}
