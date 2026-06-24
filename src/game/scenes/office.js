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
  DIG: { id: 'dig', label: 'Dig', costFn: 'getDigCost', icon: '⛏' },
  DESK: { id: 'desk', label: 'Desk', cost: 30, icon: '🪑' },
  PEE: { id: 'pee', label: 'Pee Point', costFn: 'getFacilityCost', costArg: 'pee', icon: '🚽' },
  POO: { id: 'poo', label: 'Poo Point', costFn: 'getFacilityCost', costArg: 'poo', icon: '🚽' },
  SINK: { id: 'sink', label: 'Sink', costFn: 'getFacilityCost', costArg: 'wash_hands', icon: '🚰' },
  SHOWER: { id: 'shower', label: 'Shower', costFn: 'getFacilityCost', costArg: 'shower', icon: '🚿' },
  CARPET: { id: 'carpet', label: 'Carpet', costFn: 'getCarpetCost', icon: '🟫' },
  DECOR: { id: 'decor', label: 'Decor', cost: 10, icon: '🌿' },
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
      // Restore tilemap (dug tiles, placed objects like desks/decor)
      if (tilemapData) {
        this.tilemap.load(tilemapData);
      }
    }

    // --- Camera ---
    this.initCamera();

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

    // --- Restore employees ---
    if (stored) {
      const storedEmployees = this.business.getEmployees();
      for (const se of storedEmployees) {
        this.addEmployee(se);
      }

      // Restore relief points from save
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

      // Restore desk and decor sprites from tilemap grid
      this._restoreObjectSprites();
    } else {
      // Fresh game: start with 1 employee
      this.addEmployee();
      // Place a poo point and a pee point in the starting room
      const startTiles = this.tilemap.getEmptyFloorTiles();
      if (startTiles.length >= 2) {
        const mid = Math.floor(startTiles.length / 2);
        this.placeObject(startTiles[mid].x, startTiles[mid].y, 'poo');
        this.placeObject(startTiles[mid - 1].x, startTiles[mid - 1].y, 'pee');
      }
    }

    // --- Input for build mode ---
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
    const _mapPixelW = this.tilemap.cols * TILE_SIZE;
    const _mapPixelH = this.tilemap.rows * TILE_SIZE;

    // Start camera centered on the starting room
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
  // Phase Change (Day ↔ Night)
  // ===================================================================

  onPhaseChange(phase, day) {
    this.hud.onPhaseChange(phase, day);

    if (phase === PHASE.NIGHT) {
      this._enterNight();
    } else {
      this._enterDay();
    }
  }

  _enterNight() {
    // Pause all employees
    const nightDurationMs = this.dayCycle.nightDuration * 1000;
    this.employees.getChildren().forEach((e) => {
      e.body.setVelocity(0, 0);
      e.stopAnimations();
      e.nightPaused = true;
      // Extend relief expiration so it doesn't expire while paused
      if (e.relief?.expirationTime) {
        e.relief.expirationTime += nightDurationMs;
      }
    });

    // Un-flood any relief points from water main break
    this.reliefPoints.getChildren().forEach((rp) => {
      if (rp.meta.flooded) {
        rp.meta.flooded = false;
        rp.updateAnimation();
      }
    });

    // Auto-repair facilities
    this.reliefPoints.getChildren().forEach((rp) => {
      if (rp.meta.broken) {
        rp.fix();
      }
    });

    // Janitor cleans droppings if enabled
    if (this.economy.janitorEnabled) {
      this._cleanAllDroppings();
    }

    // Process end-of-day finances
    const employeeCount = this.employees.getChildren().length;
    const reliefCounts = {};
    this.reliefPoints.getChildren().forEach((rp) => {
      reliefCounts[rp.reliefId] = (reliefCounts[rp.reliefId] || 0) + 1;
    });
    const dugTiles =
      this.tilemap.getTilesOfType(TILE_TYPES.STONE_FLOOR).length +
      this.tilemap.getTilesOfType(TILE_TYPES.CARPET_FLOOR).length;

    this.economy.processEndOfDay(employeeCount, reliefCounts, dugTiles);
  }

  _enterDay() {
    // Resume employees
    this.employees.getChildren().forEach((e) => {
      e.nightPaused = false;
      // Only return to desk if they don't have an active relief need.
      // Employees with a need will resume their pathfinding next tick.
      if (!e.relief) {
        e.goToDesk();
      } else {
        // Re-trigger pathfinding to their relief point
        e.destination = null;
        e.path = [];
        e.body.setVelocity(0, 0);
      }
    });

    // Clear build cursor
    this.buildCursorVisible = false;
    this.buildCursor.clear();
  }

  _cleanAllDroppings() {
    this.droppings.getChildren().forEach((d) => d.destroy());
    this.droppings.clear(true, true);
  }

  /**
   * Create sprites for all desk and decor objects in the tilemap grid.
   * Called after loading a saved game.
   */
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
  // Build Mode
  // ===================================================================

  onPointerMove(pointer) {
    if (!this.dayCycle.isBuildMode()) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const grid = this.tilemap.pixelToGrid(worldPoint.x, worldPoint.y);

    this.buildCursor.clear();
    if (grid.x < 0 || grid.x >= this.tilemap.cols || grid.y < 0 || grid.y >= this.tilemap.rows) return;

    const px = grid.x * TILE_SIZE;
    const py = grid.y * TILE_SIZE;

    const canPlace = this._canBuildHere(grid.x, grid.y);
    const color = canPlace ? 0x00ff00 : 0xff0000;

    this.buildCursor.lineStyle(1, color, 0.8);
    this.buildCursor.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
    this.buildCursorVisible = true;
    this._buildGrid = grid;
  }

  onPointerDown(_pointer) {
    if (!this.dayCycle.isBuildMode()) return;
    if (!this._buildGrid) return;

    const { x, y } = this._buildGrid;
    if (!this._canBuildHere(x, y)) return;

    this._executeBuild(x, y);
  }

  _canBuildHere(gridX, gridY) {
    const mode = this.buildMode;

    if (mode.id === 'dig') {
      return this.tilemap.getTileType(gridX, gridY) === TILE_TYPES.ROCK;
    }

    if (mode.id === 'carpet') {
      return this.tilemap.getTileType(gridX, gridY) === TILE_TYPES.STONE_FLOOR && !this.tilemap.getObject(gridX, gridY);
    }

    // Object placement
    return this.tilemap.canPlaceObject(gridX, gridY);
  }

  _executeBuild(gridX, gridY) {
    const mode = this.buildMode;
    let cost = 0;

    if (mode.costFn) {
      if (mode.id === 'dig') {
        cost = this.tilemap.getDigCost();
      } else if (mode.id === 'carpet') {
        cost = this.tilemap.getCarpetCost();
      } else {
        cost = this.economy.getFacilityCost(mode.costArg);
      }
    } else if (mode.cost) {
      cost = mode.cost;
    }

    if (!this.economy.canAfford(cost)) return;

    const success = this._doBuild(gridX, gridY, mode);
    if (success) {
      this.economy.takeFunds(cost);
    }
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
      // Check no employee already assigned to this desk
      const existing = this.employees
        .getChildren()
        .find((e) => e.meta.desk && e.meta.desk.gridX === d.gridX && e.meta.desk.gridY === d.gridY);
      return !existing;
    });

    if (!storedMeta && emptyDesks.length === 0) {
      // No desks available - try to place one
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

  selectEmployee(e) {
    this.hud.selectEmployee(e);
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

  /**
   * Try to make an employee wash hands at a nearby sink after using a toilet.
   */
  _tryWashHands(employee) {
    const sinks = this.reliefPoints.getChildren().filter((p) => p.reliefId === 'wash_hands' && p.canUse());
    if (sinks.length === 0) {
      employee.goToDesk();
      return;
    }
    // Find nearest sink
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

  update(time, delta) {
    this.t++;

    // Update day/night cycle
    const _phaseChanged = this.dayCycle.update(delta);

    if (this.dayCycle.isPlayMode()) {
      this._updateDayPhase(time, delta);
    }

    if (this.dayCycle.isBuildMode() && this.buildCursorVisible) {
      this.buildCursor.setVisible(true);
    } else if (this.dayCycle.isBuildMode() === false) {
      this.buildCursor.setVisible(false);
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

      // Apply event speed modifier
      if (activeEvents.speedMultiplier) {
        e.speed = e.initialSpeed * activeEvents.speedMultiplier;
      } else {
        e.speed = e.initialSpeed;
      }

      // Dungeon monster scatters employees
      if (activeEvents.scareEmployees && e.working && t % 200 === 0) {
        e.working = false;
        e.body.setVelocity((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
        setTimeout(() => {
          if (e.active) e.goToDesk();
        }, 2000);
      }

      if (t % 100 === 0) {
        // Relief logic
        const relief = e.relief;

        // Event urgency multipliers make needs more frequent
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
          // Re-trigger pathfinding if employee has a need but no destination
          // (e.g. just resumed after night)
          if (!e.reliefPoint && !e.destination && !e.path.length) {
            e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
          }

          if (t % 500 === 0 && !relief.inProgress && relief.shouldAttemptAgain(t)) {
            e.triggerRestroomAttempt(this.findReliefPoint.bind(this));
          }

          if (relief.expirationTime && time > relief.expirationTime) {
            // Skip if already using a facility, or if employee has arrived at
            // the relief point (will start using it this tick's update)
            if (!relief.inProgress && !(e.destination === null && e.reliefPoint !== null)) {
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

    // Update z-depth
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
  // Event Handlers (called by EventManager)
  // ===================================================================

  spawnRats(_evt) {
    console.log('[Event] Dungeon rats invade! Employees stop working.');
  }

  clearRats(_evt) {
    console.log('[Event] Rats cleared. Work resumes.');
  }

  inspectOffice(_evt) {
    const droppingCount = this.droppings.getChildren().length;
    const fine = droppingCount * 5;
    if (fine > 0) {
      this.economy.takeFunds(fine);
      console.log(`[Event] Health inspector fines $${fine} for ${droppingCount} droppings.`);
    } else {
      console.log('[Event] Health inspector finds office clean. No fine.');
    }
  }

  /**
   * Flood a random subset of relief points (Water Main Break).
   */
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

  onWaterMainBreakEnd(_evt) {
    // Unflood all points at night transition (handled in _enterNight)
  }

  // ===================================================================
  // Employee Info (for HUD)
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
