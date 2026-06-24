import remove from 'lodash/remove';
import { RELIEF_TYPES } from './relief';

/**
 * Business manager handles employee tracking, save/load, and coordinates
 * with EconomyManager for financial operations.
 */
export class Business {
  constructor({ onFundsChange } = {}) {
    this.employees = [];
    this.reliefPoints = [];
    this.droppings = [];
    this.employeeCost = 50;
    this.employeeSalary = 10;
    this.onFundsChange = onFundsChange;
  }

  getEmployees() {
    return this.employees;
  }

  addEmployee(e) {
    this.employees.push(e.meta);
  }

  getDroppings() {
    return this.droppings;
  }

  addDropping(d) {
    this.droppings.push(d.meta);
  }

  removeDropping(d) {
    remove(this.droppings, { id: d.meta.id });
  }

  addReliefPoint(r) {
    this.reliefPoints.push(r.meta);
  }

  getReliefPoints() {
    return this.reliefPoints;
  }

  employeeRemoval(e, type) {
    if (type === 'fired') {
      this.employeeCost += 5;
    }
    if (type === 'quit') {
      this.employeeCost += 10;
      this.employeeSalary += 5;
    }
    remove(this.employees, { id: e.meta.id });
  }

  /**
   * Save business state to localStorage along with other game systems.
   */
  save(economy, dayCycle, eventManager, tilemap) {
    const state = {
      employees: this.employees,
      reliefPoints: this.reliefPoints,
      droppings: this.droppings,
      employeeCost: this.employeeCost,
      employeeSalary: this.employeeSalary,
      economy: economy.save(),
      dayCycle: dayCycle.save(),
      events: eventManager.save(),
      tilemap: tilemap ? tilemap.save() : null,
    };
    localStorage.setItem('business', JSON.stringify(state));
  }

  /**
   * Load all game state from localStorage.
   * Returns the stored tilemap data (if any) for the scene to restore.
   */
  load(data, economy, dayCycle, eventManager) {
    if (!data) return null;

    this.employees = data.employees || [];
    this.reliefPoints = data.reliefPoints || [];
    this.droppings = data.droppings || [];
    this.employeeCost = data.employeeCost || 50;
    this.employeeSalary = data.employeeSalary || 10;

    if (economy && data.economy) economy.load(data.economy);
    if (dayCycle && data.dayCycle) dayCycle.load(data.dayCycle);
    if (eventManager && data.events) eventManager.load(data.events, Object.values(RELIEF_TYPES));

    return data.tilemap || null;
  }
}
