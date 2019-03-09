export class Business {
    constructor() {
        this.name = 'Big Co. Inc';
        this.funds = 100;
        this.employees = 0;
        this.employeeSalary = 10;
        this.employeeCost = 50;
        this.dayLength = 30;
        this.currentTime = 0;
        this.currentDay = 0;
    }

    addEmployee() {
        this.employees += 1;
    }

    addFunds(inc) {
        this.funds += inc;
    }

    takeFunds(dec) {
        this.funds -= dec;
    }

    getFunds() {
        return Math.floor(this.funds);
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