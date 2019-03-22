import { RELIEF_TYPES } from './relief';
import remove from 'lodash/remove';

export class Business {
    constructor({ onFundsChange }) {
        this.name = 'Big Co. Inc';
        this.funds = 100;
        this.employees = [];
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

    load(data) {
        Object.keys(this).forEach(k => {
            if (typeof this[k] === 'function') return;
            this[k] = data[k];
        });
    }

    getEmployees() {
        return this.employees;
    }

    addEmployee(e) {
        this.employees.push(e.meta);
        e.business = this;
        console.log(this.employees);
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
        const total = this.employees.length * this.employeeSalary;
        this.takeFunds(total);
    }

    doIfAffordable(fn, cost) {
        if (this.getFunds() > cost) {
            const success = fn();
            if (success) this.takeFunds(cost);
        }
    }

    employeeRemoval(e, type) {
        if (type === 'fired') {
            this.employeeCost += 10;
        }
        if (type === 'quit') {
            this.employeeCost += 20;
            this.employeeSalary += 10;
        }

        remove(this.employees, {
            id: e.meta.id
        });
    }

    passTime(delta) {
        this.currentTime += delta / 1000;

        if (this.currentTime > this.dayLength) {
            this.currentDay +=1;
            this.paySalaries();
            this.currentTime = 0;
        }

        localStorage.setItem('business', JSON.stringify(this));
    }
}
