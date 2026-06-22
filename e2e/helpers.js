/**
 * Playwright helpers for testing the Phaser 3 Toilet Game.
 *
 * All game interaction happens via page.evaluate() since the UI is
 * rendered on a Canvas. Access is through window.__game (exposed in
 * development mode by src/game/index.js).
 */

/**
 * Wait for Phaser to boot and scenes to be ready.
 */
export async function waitForGame(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 10_000 });
  await page.waitForFunction(
    () => {
      const game = window.__game;
      if (!game) return false;
      const office = game.scene.getScene('OfficeScene');
      const hud = game.scene.getScene('HudScene');
      return office && hud && office.business !== undefined && hud.fundsBox !== undefined;
    },
    null,
    { timeout: 10_000 },
  );
}

/**
 * Get the OfficeScene's business object.
 */
export async function getBusiness(page) {
  return page.evaluate(() => {
    const office = window.__game.scene.getScene('OfficeScene');
    return {
      funds: office.business.getFunds(),
      formattedFunds: office.business.getFormattedFunds(),
      employeeCount: office.employees.getChildren().length,
      reliefPointCount: office.reliefPoints.getChildren().length,
      currentDay: office.business.currentDay,
      currentTime: office.business.currentTime,
      employeeCost: office.business.employeeCost,
      employeeSalary: office.business.employeeSalary,
    };
  });
}

/**
 * Hire an employee via the OfficeScene method.
 */
export async function hireEmployee(page) {
  return page.evaluate(() => {
    const office = window.__game.scene.getScene('OfficeScene');
    const before = office.employees.getChildren().length;
    office.hireEmployee();
    return office.employees.getChildren().length > before;
  });
}

/**
 * Buy a relief point (pee or poo).
 * @param {'pee'|'poo'} reliefId
 */
export async function buyReliefPoint(page, reliefId = 'pee') {
  return page.evaluate((id) => {
    const office = window.__game.scene.getScene('OfficeScene');
    const before = office.reliefPoints.getChildren().length;
    office.buyReliefPoint(id);
    return office.reliefPoints.getChildren().length > before;
  }, reliefId);
}

/**
 * Fire the first employee.
 */
export async function fireFirstEmployee(page) {
  return page.evaluate(() => {
    const office = window.__game.scene.getScene('OfficeScene');
    const employees = office.employees.getChildren();
    if (!employees.length) return false;
    employees[0].fire();
    return true;
  });
}

/**
 * Get employee details for all current employees.
 */
export async function getEmployees(page) {
  return page.evaluate(() => {
    const office = window.__game.scene.getScene('OfficeScene');
    return office.employees.getChildren().map((e) => ({
      id: e.meta.id,
      name: e.meta.name,
      working: e.working,
      sadness: e.meta.sadness,
      relief: e.relief ? { id: e.relief.id, inProgress: e.relief.inProgress } : null,
    }));
  });
}

/**
 * Advance game time by a given number of seconds.
 * Calls the update loop directly to simulate time passing.
 */
export async function advanceTime(page, seconds) {
  return page.evaluate((secs) => {
    const office = window.__game.scene.getScene('OfficeScene');
    const delta = secs * 1000;
    office.business.passTime(delta);
  }, seconds);
}

/**
 * Save and reload the page, verifying state persistence.
 * Returns the business state after reload.
 */
export async function reloadAndGetBusiness(page) {
  // Trigger a save by advancing time slightly
  await advanceTime(page, 0.1);
  await page.reload();
  await waitForGame(page);
  return getBusiness(page);
}

/**
 * Clear saved game state from localStorage.
 * Navigates to the app first to ensure a valid origin.
 */
export async function clearSave(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('business'));
}
