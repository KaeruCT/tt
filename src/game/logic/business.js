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
        this.onFundsChange = onFundsChange;
    }

    addEmployee() {
        this.employees += 1;
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

    getFacilityCost(type) {
        return this.facilityCost[type];
    }

    paySalaries() {
        const total = this.employees * this.employeeSalary;
        this.takeFunds(total);
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
