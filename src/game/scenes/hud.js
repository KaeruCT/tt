import Phaser from 'phaser';
import { TILE_DIMENSION } from '../utils/misc';
import Text from '../ui/Text';
import Button from '../ui/Button';
import { light } from '../ui/common';
import { RELIEF_TYPES } from '../logic/relief';

export default class HudScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HudScene', active: true });
    }

    create() {
        this.buildUi();
        this.office = this.scene.get('OfficeScene');
        this.selectedEmployee = null;
    }

    selectEmployee(e) {
        if (this.selectedEmployee) {
            this.fireButton.destroy();
            this.closeButton.destroy();
            this.employeeInfo.destroy();
            this.employeeStats.destroy();
            this.overlay.destroy();
        }

        this.selectedEmployee = e;
        if (!this.selectedEmployee) return;

        const { width, height } = this.sys.game.canvas;
        const padding = TILE_DIMENSION;
        this.overlay = this.add.graphics({
            fillStyle: {
                color: 0x000000,
                alpha: 0.6,
            }
        })
            .setScrollFactor(0)
            .setDepth(9999);

        this.overlay.fillRect(padding, padding * 2, width - padding * 2, height - padding * 4);

        this.employeeInfo = new Text(this, padding + 1, padding * 2 + 1)
            .setDepth(9999);
        this.employeeInfo.setText(this.getEmployeeInfo(this.selectedEmployee));
        this.add.existing(this.employeeInfo);

        this.fireButton = new Button(this, padding + 1, 200, 'FIRE', () => {
            this.selectedEmployee.fire();
        }).setDepth(9999);
        this.add.existing(this.fireButton);

        this.employeeStats = new Text(this, padding + 40, 200)
            .setDepth(9999);
        this.employeeStats.setText(this.getEmployeeStats(this.selectedEmployee));
        this.add.existing(this.employeeStats);

        this.closeButton = new Button(this, width - padding * 2, padding * 2 + 1, 'X', () => {
            this.selectEmployee(null);
        }).setDepth(9999);
        this.add.existing(this.closeButton);

        // HACK: update employee info periodically, should be more elegant
        setTimeout(() => {
            if (this.selectedEmployee) this.selectEmployee(this.selectedEmployee);
        }, 300);
    }

    buildUi() {
        this.fundsBox = new Text(this, 20, 4);
        this.add.existing(this.fundsBox);

        this.hireButton = new Button(this, 100, 4, 'EMPLOYEE', () => {
            this.office.hireEmployee();
        });
        this.add.existing(this.hireButton);

        this.pissoirButton = new Button(this, 168, 4, 'URNL', () => {
            this.office.buyReliefPoint(RELIEF_TYPES.pee.id);
        });
        this.add.existing(this.pissoirButton);

        this.toiletButton = new Button(this, 210, 4, 'TLT', () => {
            this.office.buyReliefPoint(RELIEF_TYPES.poo.id);
        });
        this.add.existing(this.toiletButton);

        this.resetButton = new Button(this, 4, 360, 'RESET', () => {
            this.paused = true;
            localStorage.setItem('reset', true);
            window.location.reload();
        });
        this.add.existing(this.resetButton);

        this.priceInfo = new Text(this, 50, 360, '');
        this.add.existing(this.priceInfo);

        this.bg = this.add.graphics()
            .setScrollFactor(0)
            .setDepth(998);
        this.bg.fillStyle(0x000000, 0.6);
        this.bg.fillRect(0, 0, 320, TILE_DIMENSION * 2);

        this.graphics = this.add.graphics()
            .setScrollFactor(0)
            .setDepth(999);
    }

    onFundsChange(amount, item) {
        if (!this.fundsBox) return;
        const positive = amount > 0;
        const symbol = positive ? '+' : '-';
        const absAmount = Math.abs(amount);
        const dist = 10;
        const style = { ...light, fill: positive ? '#6f6' : '#f66' };
        const text = new Text(this, this.fundsBox.x + (positive ? 8 : 20), this.fundsBox.y + (positive ? dist : 0), `${symbol}$${absAmount}`, style);
        this.add.existing(text);

        this.tweens.add({
            targets: text,
            y: this.fundsBox.y + (positive ? 0 : dist),
            onComplete: () => text.destroy(),
            duration: 300,
        });

        if (item) {
            this.onPurchase(item);
        }
    }

    onPurchase(item) {
        const { game } = this.sys;  
        const style = {
            ...light,
            backgroundColor: '#000000aa',
            align: 'center',
            fontSize: '26px',
        };
        const text = new Text(this, game.config.width/2, game.config.height/2, `+1 ${item}`, style);
        text.setOrigin(0.5);
        this.add.existing(text);

        this.tweens.add({
            targets: text,
            alpha: 0,
            onComplete: () => text.destroy(),
            duration: 1500,
        });
    }

    update() {
        this.updateUi();
    }

    getEmployeeInfo(e) {
        const { working, meta, relief } = e;
        const { name, age, hobbies } = e.meta;
        let info = `${name}\n\nAge: ${age}\n\nHobbies:\n - ${hobbies.join('\n - ')}\n\n`;
        info += `Working: ${working ? 'yes' : 'no'}\n`;
        if (meta.sadness) {
            info += `Couldn't hold it ${meta.sadness} time(s)\n`;
        }
        if (relief) {
            if (relief.inProgress) {
                info += `Is currently doing: ${relief.id}\n`;
            } else {
                info += `Needs to ${relief.id}\n`;
                info += `Has tried to go ${relief.attempts} time(s)\n`;
            }
        }
        return info;
    }

    getEmployeeStats(e) {
        const { stats } = e.meta;
        const f = (d) => Math.floor(d / 1000);

        let info = 'Time...\n';
        info += ` - Working: ${f(stats.work.duration)}\n`;
        info += ` - Peeing: ${f(stats[RELIEF_TYPES.pee.id].duration)}\n`;
        info += ` - Pooping: ${f(stats[RELIEF_TYPES.poo.id].duration)}\n`;

        info += `\nTotals\n`;
        info += ` - Pee: ${stats[RELIEF_TYPES.pee.id].times} (${stats[RELIEF_TYPES.pee.id].outside} on floor)\n`;
        info += ` - Poo: ${stats[RELIEF_TYPES.poo.id].times} (${stats[RELIEF_TYPES.poo.id].outside} on floor)\n`;
        return info;
    }

    getCostsText() {
        const { business } = this.office;
        const employeeCost = business.employeeCost;
        const employeeSalary = business.employeeSalary;
        const peeCost = business.getFacilityCost(RELIEF_TYPES.pee.id);
        const pooCost = business.getFacilityCost(RELIEF_TYPES.poo.id);
        return `EMPLOYEE: $${employeeCost} ($${employeeSalary} daily)\nURNL: $${peeCost} - TLT: $${pooCost}`;
    }

    updateUi() {
        const { business } = this.office;
        if (!business) return;

        const { currentTime, dayLength } = business;
        this.fundsBox.setText(`${business.getFormattedFunds()}`);
        this.priceInfo.setText(this.getCostsText());

        const dayCompletion = dayLength - currentTime / dayLength;
        const rad = 6;
        const cx = 12;
        const cy = 12;
        this.graphics.clear();
        this.graphics.fillStyle(0x444444, 1);
        this.graphics.fillEllipse(cx, cy, rad * 2, rad * 2);
        this.graphics.lineStyle(2, 0xcccccc, 1);
        this.graphics.beginPath();
        this.graphics.arc(cx, cy, rad, Phaser.Math.DegToRad(270), Phaser.Math.DegToRad(270 + dayCompletion * 360), true);
        this.graphics.strokePath();
    }
}
