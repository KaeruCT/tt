export class Business {
    constructor() {
        this.name = 'Big Co. Inc';
        this.funds = 100;
        this.employeeCost = 50;
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
}