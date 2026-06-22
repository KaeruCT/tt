import { RELIEF_TYPES } from '../logic/relief';

/**
 * Economy manager handles fund generation, operating costs, and daily reporting.
 */
export default class EconomyManager {
  constructor({ onFundsChange, onDailyReport } = {}) {
    this.funds = 200;
    this.totalRevenue = 0;
    this.totalExpenses = 0;
    this.onFundsChange = onFundsChange;
    this.onDailyReport = onDailyReport;

    // Cost definitions
    this.employeeCost = 50;
    this.employeeSalary = 10;

    // Facility costs
    this.facilityCost = {
      [RELIEF_TYPES.pee.id]: 100,
      [RELIEF_TYPES.poo.id]: 200,
      [RELIEF_TYPES.wash_hands.id]: 50,
      [RELIEF_TYPES.shower.id]: 300,
      [RELIEF_TYPES.smoke_break.id]: 0, // free - goes outside
    };

    // Facility maintenance cost per day
    this.facilityMaintenance = {
      [RELIEF_TYPES.pee.id]: 1,
      [RELIEF_TYPES.poo.id]: 2,
      [RELIEF_TYPES.wash_hands.id]: 0.5,
      [RELIEF_TYPES.shower.id]: 3,
    };

    this.droppingCleanCost = {
      [RELIEF_TYPES.pee.id]: 1,
      [RELIEF_TYPES.poo.id]: 3,
    };

    this.facilityFixCost = {
      [RELIEF_TYPES.pee.id]: 2,
      [RELIEF_TYPES.poo.id]: 5,
      [RELIEF_TYPES.wash_hands.id]: 1,
      [RELIEF_TYPES.shower.id]: 8,
    };

    // Rent: $0.1 per dug tile per day
    this.rentPerTile = 0.1;

    // Janitor service: optional, cleans droppings at night
    this.janitorEnabled = false;
    this.janitorCost = 5;

    // Track for daily report
    this.dayRevenue = 0;
    this.dayExpenses = 0;
    this.daySalaries = 0;
    this.dayMaintenance = 0;
    this.dayRent = 0;
    this.dayEvents = 0;

    // Operating metrics
    this.dugTiles = 0;
    this.reliefPointCounts = {};
  }

  getFunds() {
    return Math.floor(this.funds);
  }

  getFormattedFunds() {
    let funds = `$${this.getFunds()}`;
    funds = funds.replace('$-', '-$');
    return funds;
  }

  addFunds(amount) {
    this.funds += amount;
    this.dayRevenue += amount;
    if (this.onFundsChange) this.onFundsChange(amount);
  }

  takeFunds(amount) {
    this.funds -= amount;
    this.dayExpenses += amount;
    if (this.onFundsChange) this.onFundsChange(-amount);
  }

  getFacilityCost(reliefId) {
    return this.facilityCost[reliefId] || 100;
  }

  getFacilityFixCost(reliefId) {
    return this.facilityFixCost[reliefId] || 2;
  }

  getDroppingCleanCost(reliefId) {
    return this.droppingCleanCost[reliefId] || 1;
  }

  getFacilityMaintenanceCost(reliefId) {
    return this.facilityMaintenance[reliefId] || 0;
  }

  doIfAffordable(fn, cost) {
    if (this.getFunds() >= cost) {
      const success = fn();
      if (success) this.takeFunds(cost);
      return success;
    }
    return false;
  }

  canAfford(cost) {
    return this.getFunds() >= cost;
  }

  /**
   * Calculate daily salary cost.
   */
  getSalaryCost(employeeCount) {
    return employeeCount * this.employeeSalary;
  }

  /**
   * Calculate daily facility maintenance cost.
   */
  getMaintenanceCost(reliefPointCounts) {
    let total = 0;
    for (const [reliefId, count] of Object.entries(reliefPointCounts)) {
      total += (this.facilityMaintenance[reliefId] || 0) * count;
    }
    return total;
  }

  /**
   * Calculate daily rent based on dug tiles.
   */
  getRentCost(dugTiles) {
    return Math.floor(dugTiles * this.rentPerTile);
  }

  /**
   * Calculate daily janitor cost.
   */
  getJanitorCost() {
    return this.janitorEnabled ? this.janitorCost : 0;
  }

  /**
   * Process end-of-day finances.
   * @returns {object} Daily report
   */
  processEndOfDay(employeeCount, reliefPointCounts, dugTiles) {
    const salaryCost = this.getSalaryCost(employeeCount);
    const maintenanceCost = this.getMaintenanceCost(reliefPointCounts);
    const rentCost = this.getRentCost(dugTiles);
    const janitorCost = this.getJanitorCost();

    this.takeFunds(salaryCost);
    this.daySalaries = salaryCost;

    this.takeFunds(maintenanceCost);
    this.dayMaintenance = maintenanceCost;

    this.takeFunds(rentCost);
    this.dayRent = rentCost;

    if (janitorCost > 0) {
      this.takeFunds(janitorCost);
    }
    this.dayEvents = 0;

    const report = {
      revenue: this.dayRevenue,
      expenses: this.dayExpenses + salaryCost + maintenanceCost + rentCost + janitorCost,
      salaryCost,
      maintenanceCost,
      rentCost,
      janitorCost,
      profit: this.dayRevenue - (this.dayExpenses + salaryCost + maintenanceCost + rentCost + janitorCost),
      currentFunds: this.getFunds(),
    };

    // Reset daily trackers
    this.dayRevenue = 0;
    this.dayExpenses = 0;
    this.daySalaries = 0;
    this.dayMaintenance = 0;
    this.dayRent = 0;

    if (this.onDailyReport) {
      this.onDailyReport(report);
    }

    return report;
  }

  /**
   * Calculate the work fund generation rate for an employee.
   * Base: $1/sec. Modified by traits and events.
   */
  getWorkRate(employee, activeEffects) {
    let rate = 1.0;

    // Trait modifiers
    if (employee.meta?.traits) {
      for (const trait of employee.meta.traits) {
        if (trait.workSpeedMultiplier) {
          rate *= trait.workSpeedMultiplier;
        }
      }
    }

    // Event modifiers
    if (activeEffects?.workSpeedMultiplier) {
      rate *= activeEffects.workSpeedMultiplier;
    }

    // Carpet floor bonus
    // (handled by the scene checking tile type)

    return rate;
  }

  /**
   * Serialize for save/load.
   */
  save() {
    return {
      funds: this.funds,
      employeeCost: this.employeeCost,
      employeeSalary: this.employeeSalary,
      janitorEnabled: this.janitorEnabled,
      dayRevenue: this.dayRevenue,
      dayExpenses: this.dayExpenses,
    };
  }

  load(data) {
    if (!data) return;
    this.funds = data.funds ?? 200;
    this.employeeCost = data.employeeCost ?? 50;
    this.employeeSalary = data.employeeSalary ?? 10;
    this.janitorEnabled = data.janitorEnabled ?? false;
    this.dayRevenue = data.dayRevenue ?? 0;
    this.dayExpenses = data.dayExpenses ?? 0;
  }
}
