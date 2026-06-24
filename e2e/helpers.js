/**
 * Playwright helpers for testing the Phaser 3 Toilet Game.
 * Updated for the dynamic tilemap + day/night cycle architecture.
 */

/**
 * Wait for Phaser to boot and scenes to be ready.
 */
export async function waitForGame(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 10_000 });
  await page.waitForFunction(
    () => {
      const office = window.__officeScene;
      if (!office) return false;
      return office.economy !== undefined && office.tilemap !== undefined;
    },
    null,
    { timeout: 10_000 },
  );
}

/**
 * Get basic business/economy state.
 */
export async function getBusiness(page) {
  return page.evaluate(() => {
    const office = window.__officeScene;
    return {
      funds: office.economy.getFunds(),
      formattedFunds: office.economy.getFormattedFunds(),
      employeeCount: office.employees.getChildren().length,
      reliefPointCount: office.reliefPoints.getChildren().length,
      currentDay: office.dayCycle.currentDay,
      currentPhase: office.dayCycle.currentPhase,
      employeeCost: office.economy.employeeCost,
      employeeSalary: office.economy.employeeSalary,
    };
  });
}

/**
 * Hire an employee.
 */
export async function hireEmployee(page) {
  return page.evaluate(() => {
    const office = window.__officeScene;
    const before = office.employees.getChildren().length;
    office.hireEmployee();
    return office.employees.getChildren().length > before;
  });
}

/**
 * Place a relief point directly.
 */
export async function buyReliefPoint(page, reliefId = 'pee') {
  return page.evaluate((id) => {
    const office = window.__officeScene;
    const tm = office.tilemap;
    const emptyTiles = tm.getEmptyFloorTiles();
    if (emptyTiles.length === 0) return false;
    const pos = emptyTiles[0];
    const rp = office.placeObject(pos.x, pos.y, id);
    return rp !== null;
  }, reliefId);
}

/**
 * Fire the first employee.
 */
export async function fireFirstEmployee(page) {
  return page.evaluate(() => {
    const office = window.__officeScene;
    const employees = office.employees.getChildren();
    if (!employees.length) return false;
    employees[0].fire();
    return true;
  });
}

/**
 * Get employee details.
 */
export async function getEmployees(page) {
  return page.evaluate(() => {
    const office = window.__officeScene;
    return office.employees.getChildren().map((e) => ({
      id: e.meta.id,
      name: e.meta.name,
      working: e.working,
      sadness: e.meta.sadness,
      traits: (e.meta.traits || []).map((t) => t.name),
      relief: e.relief ? { id: e.relief.id, inProgress: e.relief.inProgress } : null,
    }));
  });
}

/**
 * Advance game time by calling day cycle update with delta ms.
 */
export async function advanceTime(page, seconds) {
  return page.evaluate((secs) => {
    const office = window.__officeScene;
    office.dayCycle.update(secs * 1000);
  }, seconds);
}

/**
 * Save and reload the page.
 */
export async function reloadAndGetBusiness(page) {
  await page.evaluate(() => {
    const office = window.__officeScene;
    office.business.save(office.economy, office.dayCycle, office.eventManager, office.tilemap);
  });
  await page.reload();
  await waitForGame(page);
  return getBusiness(page);
}

/**
 * Clear saved game state from localStorage.
 */
export async function clearSave(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('business'));
}
