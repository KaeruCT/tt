import { RELIEF_TYPES } from './relief';

export class Business {
    constructor({ onFundsChange }) {
        this.name = 'Big Co. Inc';
        this.funds = 100;
        this.employees = 0;
        this.employeeSalary = 10;
        this.employeeCost = 50;
        this.dayLength = 60;
        this.currentTime = 0;
        this.currentDay = 0;
        this.facilityCost = {
            [RELIEF_TYPES.pee.id]: 100,
            [RELIEF_TYPES.poo.id]: 200,
        };
        this.droppingCleanCost = {
            [RELIEF_TYPES.pee.id]: 2,
            [RELIEF_TYPES.poo.id]: 5,
        };
        this.facilityFixCost = {
            [RELIEF_TYPES.pee.id]: 5,
            [RELIEF_TYPES.poo.id]: 10,
        };
        this.onFundsChange = onFundsChange;
    }

    addEmployee(e) {
        this.employees += 1;
        e.business = this;
    }

    addFunds(inc) {
        this.funds += inc;
        this.onFundsChange(inc);
    }

    takeFunds(dec) {
        this.funds -= dec;
        this.onFundsChange(-dec);
    }

    getFunds() {
        return Math.floor(this.funds);
    }

    getFormattedFunds() {
        let funds = '$' + this.getFunds();
        funds = funds.replace('$-', '-$');
        return funds;
    }

    getFacilityCost(reliefId) {
        return this.facilityCost[reliefId];
    }

    getFacilityFixCost(reliefId) {
        return this.facilityFixCost[reliefId];
    }

    getDroppingCleanCost(reliefId) {
        return this.droppingCleanCost[reliefId];
    }

    paySalaries() {
        const total = this.employees * this.employeeSalary;
        this.takeFunds(total);
    }

    doIfAffordable(fn, cost) {
        if (this.getFunds() > cost) {
            const success = fn();
            if (success) this.takeFunds(cost);
        }
    }

    employeeFired(e) {
        this.employeeCost += 10;
    }

    employeeQuit(e) {
        this.employeeCost += 20;
        this.employeeSalary += 10;
    }

    passTime(delta) {
        this.currentTime += delta / 1000;

        if (this.currentTime > this.dayLength) {
            this.currentDay +=1;
            this.paySalaries();
            this.currentTime = 0;
        }
    }
}
