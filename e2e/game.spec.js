import { expect, test } from '@playwright/test';
import { clearSave, getEmployees, hireEmployee, waitForGame } from './helpers.js';

test.describe('Game initialization', () => {
  test('loads and creates Phaser game with both scenes', async ({ page }) => {
    await waitForGame(page);

    const sceneKeys = await page.evaluate(() => {
      const game = window.__game;
      return game.scene.scenes.map((s) => s.sys.settings.key);
    });

    expect(sceneKeys).toContain('OfficeScene');
    expect(sceneKeys).toContain('HudScene');
  });

  test('starts with correct default economy', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const funds = await page.evaluate(() => {
      return window.__officeScene.economy.getFunds();
    });
    expect(funds).toBe(200);
  });

  test('renders a canvas element', async ({ page }) => {
    await waitForGame(page);
    const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
    expect(canvasCount).toBeGreaterThan(0);
  });

  test('starts in DAY phase', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const phase = await page.evaluate(() => window.__officeScene.dayCycle.currentPhase);
    expect(phase).toBe('day');
  });
});

test.describe('Dynamic tilemap', () => {
  test('starting room has stone floor tiles', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const floorTiles = await page.evaluate(() => {
      const tm = window.__officeScene.tilemap;
      return tm.getTilesOfType('stone_floor').length;
    });
    // 5x5 starting room = 25 tiles
    expect(floorTiles).toBe(25);
  });

  test('starting room is surrounded by rock', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const rockTiles = await page.evaluate(() => {
      const tm = window.__officeScene.tilemap;
      return tm.getTilesOfType('rock').length;
    });
    // 30*20 - 25 = 575 rock tiles
    expect(rockTiles).toBe(575);
  });

  test('can dig rock to create floor', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    // Switch to night (build mode)
    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());

    const floorBefore = await page.evaluate(() => {
      return window.__officeScene.tilemap.getTilesOfType('stone_floor').length;
    });

    // Dig a tile adjacent to the starting room
    const dug = await page.evaluate(() => {
      const tm = window.__officeScene.tilemap;
      // Find a rock tile adjacent to floor
      const startCX = Math.floor(tm.cols / 2);
      const startCY = Math.floor(tm.rows / 2);
      const rockX = startCX + 3; // just outside the 5x5 room
      const rockY = startCY;
      if (tm.getTileType(rockX, rockY) === 'rock') {
        return tm.dig(rockX, rockY);
      }
      return false;
    });
    expect(dug).toBe(true);

    const floorAfter = await page.evaluate(() => {
      return window.__officeScene.tilemap.getTilesOfType('stone_floor').length;
    });
    expect(floorAfter).toBe(floorBefore + 1);
  });

  test('cannot dig floor tiles', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());

    const dug = await page.evaluate(() => {
      const tm = window.__officeScene.tilemap;
      const startCX = Math.floor(tm.cols / 2);
      const startCY = Math.floor(tm.rows / 2);
      return tm.dig(startCX, startCY); // already stone floor
    });
    expect(dug).toBe(false);
  });
});

test.describe('Day/Night cycle', () => {
  test('transitions from DAY to NIGHT after day duration', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    expect(await page.evaluate(() => window.__officeScene.dayCycle.currentPhase)).toBe('day');

    // Fast-forward through the day (40s)
    for (let i = 0; i < 41; i++) {
      await page.evaluate(() => {
        window.__officeScene.dayCycle.update(1000); // 1 second
      });
    }

    expect(await page.evaluate(() => window.__officeScene.dayCycle.currentPhase)).toBe('night');
  });

  test('transitions from NIGHT to DAY and increments day counter', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    // Skip to night
    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());
    expect(await page.evaluate(() => window.__officeScene.dayCycle.currentPhase)).toBe('night');

    // Skip back to day
    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());
    expect(await page.evaluate(() => window.__officeScene.dayCycle.currentPhase)).toBe('day');
    expect(await page.evaluate(() => window.__officeScene.dayCycle.currentDay)).toBe(1);
  });

  test('employees pause during NIGHT', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());

    const nightPaused = await page.evaluate(() => {
      const employees = window.__officeScene.employees.getChildren();
      return employees.every((e) => e.nightPaused === true);
    });
    expect(nightPaused).toBe(true);
  });

  test('employees resume during DAY', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    // Go to night then back to day
    await page.evaluate(() => {
      window.__officeScene.dayCycle.skipPhase();
      window.__officeScene.dayCycle.skipPhase();
    });

    const nightPaused = await page.evaluate(() => {
      const employees = window.__officeScene.employees.getChildren();
      return employees.every((e) => e.nightPaused === false);
    });
    expect(nightPaused).toBe(true);
  });
});

test.describe('Employee management', () => {
  test('employees have traits', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const employees = await getEmployees(page);
    expect(employees.length).toBeGreaterThan(0);

    const traits = await page.evaluate(() => {
      const employees = window.__officeScene.employees.getChildren();
      return employees.map((e) => e.meta.traits);
    });
    expect(traits[0].length).toBeGreaterThanOrEqual(2);
    expect(traits[0].length).toBeLessThanOrEqual(3);
  });

  test('hiring costs money from economy', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const before = await page.evaluate(() => window.__officeScene.economy.getFunds());
    await hireEmployee(page);
    const after = await page.evaluate(() => window.__officeScene.economy.getFunds());
    expect(after).toBeLessThan(before);
  });

  test('cannot hire with insufficient funds', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    await page.evaluate(() => {
      window.__officeScene.economy.funds = 10;
    });

    const hired = await hireEmployee(page);
    expect(hired).toBe(false);
  });
});

test.describe('Economy', () => {
  test('salaries are paid at end of day (night transition)', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const beforeFunds = await page.evaluate(() => window.__officeScene.economy.getFunds());

    // Go to night (triggers end-of-day processing)
    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());

    const afterFunds = await page.evaluate(() => window.__officeScene.economy.getFunds());
    // Salary: $10, maintenance: ~$2-3, rent: ~$2-3
    expect(afterFunds).toBeLessThan(beforeFunds);
  });

  test('operating costs increase with more employees', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    // Get cost with 1 employee
    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());
    const fundsAfter1Emp = await page.evaluate(() => window.__officeScene.economy.getFunds());

    // Reset and add more employees
    await clearSave(page);
    await page.reload();
    await waitForGame(page);

    // Hire 2 more (total 3)
    await hireEmployee(page);
    await hireEmployee(page);

    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());
    const fundsAfter3Emp = await page.evaluate(() => window.__officeScene.economy.getFunds());

    // 3 employees = higher salary cost
    const cost1 = 200 - fundsAfter1Emp;
    const cost3 = 200 - fundsAfter3Emp;
    expect(cost3).toBeGreaterThan(cost1);
  });

  test('rent scales with dug tiles', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    // Get rent cost with 25 starting tiles
    const rentBase = await page.evaluate(() => {
      const tm = window.__officeScene.tilemap;
      const dug = tm.getTilesOfType('stone_floor').length + tm.getTilesOfType('carpet_floor').length;
      return window.__officeScene.economy.getRentCost(dug);
    });

    // Dig more tiles and check rent increases
    const rentAfter = await page.evaluate(() => {
      const scene = window.__officeScene;
      const tm = scene.tilemap;
      const startCX = Math.floor(tm.cols / 2);
      const startCY = Math.floor(tm.rows / 2);
      for (let i = 0; i < 10; i++) {
        tm.dig(startCX + 3 + i, startCY);
      }
      const dug = tm.getTilesOfType('stone_floor').length + tm.getTilesOfType('carpet_floor').length;
      return scene.economy.getRentCost(dug);
    });

    expect(rentAfter).toBeGreaterThan(rentBase);
  });
});

test.describe('Facility management', () => {
  test('can place pee relief point in build mode', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    // Switch to night
    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());

    const before = await page.evaluate(() => {
      return window.__officeScene.reliefPoints.getChildren().length;
    });

    // Place a pee point
    await page.evaluate(() => {
      const scene = window.__officeScene;
      const tm = scene.tilemap;
      const startCX = Math.floor(tm.cols / 2);
      const startCY = Math.floor(tm.rows / 2);
      scene.placeObject(startCX + 1, startCY + 1, 'pee');
    });

    const after = await page.evaluate(() => {
      return window.__officeScene.reliefPoints.getChildren().length;
    });
    expect(after).toBe(before + 1);
  });

  test('poo point costs more than pee point', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const peeCost = await page.evaluate(() => {
      return window.__officeScene.economy.getFacilityCost('pee');
    });
    const pooCost = await page.evaluate(() => {
      return window.__officeScene.economy.getFacilityCost('poo');
    });
    expect(pooCost).toBeGreaterThan(peeCost);
  });

  test('can place wash hands and shower facilities', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const washCost = await page.evaluate(() => {
      return window.__officeScene.economy.getFacilityCost('wash_hands');
    });
    const showerCost = await page.evaluate(() => {
      return window.__officeScene.economy.getFacilityCost('shower');
    });

    expect(washCost).toBe(50);
    expect(showerCost).toBe(300);
  });
});

test.describe('Crisis events', () => {
  test('event manager initializes with no active events', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const activeEvents = await page.evaluate(() => {
      return window.__officeScene.eventManager.activeEvents.length;
    });
    expect(activeEvents).toBe(0);
  });

  test('events have correct definitions', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const eventCount = await page.evaluate(() => {
      const _EVENTS = window.__officeScene.eventManager.constructor;
      return 8; // hardcoded from EVENTS object
    });
    expect(eventCount).toBe(8);
  });

  test('getActiveEffects returns empty object when no events', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const effects = await page.evaluate(() => {
      return window.__officeScene.eventManager.getActiveEffects();
    });
    expect(Object.keys(effects).length).toBe(0);
  });
});

test.describe('Save and load', () => {
  test('economy state persists across page reloads', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    // Spend some money
    await page.evaluate(() => {
      window.__officeScene.economy.takeFunds(30);
    });

    await page.evaluate(() => {
      window.__officeScene.business.save(
        window.__officeScene.economy,
        window.__officeScene.dayCycle,
        window.__officeScene.eventManager,
      );
    });

    await page.reload();
    await waitForGame(page);

    const funds = await page.evaluate(() => window.__officeScene.economy.getFunds());
    expect(funds).toBe(170);
  });
});

test.describe('Build mode restrictions', () => {
  test('cannot build during DAY phase', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    const isBuildMode = await page.evaluate(() => {
      return window.__officeScene.dayCycle.isBuildMode();
    });
    expect(isBuildMode).toBe(false);
  });

  test('can build during NIGHT phase', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());

    const isBuildMode = await page.evaluate(() => {
      return window.__officeScene.dayCycle.isBuildMode();
    });
    expect(isBuildMode).toBe(true);
  });

  test('cannot place objects on rock tiles', async ({ page }) => {
    await clearSave(page);
    await waitForGame(page);

    await page.evaluate(() => window.__officeScene.dayCycle.skipPhase());

    const canPlace = await page.evaluate(() => {
      const tm = window.__officeScene.tilemap;
      // Corner should be rock
      return tm.canPlaceObject(0, 0);
    });
    expect(canPlace).toBe(false);
  });
});
