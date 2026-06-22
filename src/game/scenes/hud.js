import Phaser from 'phaser';
import { PHASE } from '../systems/DayCycle';
import { TILE_SIZE } from '../systems/TilemapManager';
import Button from '../ui/Button';
import { light } from '../ui/common';
import Text from '../ui/Text';

// Button grid: 4 columns × 2 rows starting at y=65, spaced 55px apart
const BTN_X = [8, 66, 124, 182];
const BTN_Y = [65, 82];
const BUILD_MODE_BUTTONS = [
  { id: 'dig', label: '⛏ Dig', col: 0, row: 0 },
  { id: 'desk', label: '🪑 Desk', col: 1, row: 0 },
  { id: 'carpet', label: '🟫 Carp', col: 2, row: 0 },
  { id: 'decor', label: '🌿 Dec', col: 3, row: 0 },
  { id: 'pee', label: '🚽 Pee', col: 0, row: 1 },
  { id: 'poo', label: '🚽 Poo', col: 1, row: 1 },
  { id: 'sink', label: '🚰 Sink', col: 2, row: 1 },
  { id: 'shower', label: '🚿 Shwr', col: 3, row: 1 },
];

export default class HudScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HudScene', active: true });
  }

  create() {
    this.office = this.scene.get('OfficeScene');
    this.selectedEmployee = null;
    this.buildButtons = [];
    this.activeBuildMode = 'dig';

    this.buildUi();
  }

  // ===================================================================
  // UI Construction
  // ===================================================================

  buildUi() {
    // Funds display
    this.fundsBox = new Text(this, 8, 4);
    this.add.existing(this.fundsBox);

    // Day/Night indicator
    this.phaseText = new Text(this, 64, 4, '☀ Day');
    this.add.existing(this.phaseText);

    this.phaseTimer = new Text(this, 124, 4, '40s');
    this.add.existing(this.phaseTimer);

    // Event indicator
    this.eventText = new Text(this, 160, 4, '');
    this.add.existing(this.eventText);

    // Hire button (day only, bottom-left)
    this.hireButton = new Button(this, 8, 395, '+ Hire ($50)', () => {
      this.office.hireEmployee();
    });
    this.add.existing(this.hireButton);

    // Build mode buttons (night only)
    this.buildButtons = [];
    this.buildCostText = new Text(this, 8, 100, '');
    this.buildCostText.setVisible(false);
    this.add.existing(this.buildCostText);

    BUILD_MODE_BUTTONS.forEach((def) => {
      const x = BTN_X[def.col];
      const y = BTN_Y[def.row];
      const btn = new Button(this, x, y, def.label, () => {
        this.office.setBuildMode(def.id);
        this._highlightBuildButton(def.id);
      });
      btn.setVisible(false);
      this.add.existing(btn);
      this.buildButtons.push({ ...def, button: btn, active: def.id === 'dig' });
    });

    // Skip night button (night only, bottom area)
    this.skipNightBtn = new Button(this, 8, 395, 'Skip Night', () => {
      this.office.dayCycle.skipPhase();
    });
    this.skipNightBtn.setVisible(false);
    this.add.existing(this.skipNightBtn);

    // Janitor toggle (night only)
    this.janitorBtn = new Button(this, 100, 395, 'Jan: OFF', () => {
      this.office.economy.janitorEnabled = !this.office.economy.janitorEnabled;
      this.janitorBtn.setText(`Jan: ${this.office.economy.janitorEnabled ? 'ON' : 'OFF'}`);
    });
    this.janitorBtn.setVisible(false);
    this.add.existing(this.janitorBtn);

    // Daily report text (shown briefly at night start)
    this.reportText = new Text(this, 8, 375, '');
    this.reportText.setVisible(false);
    this.add.existing(this.reportText);

    // Reset button (always visible, bottom-right)
    this.resetButton = new Button(this, 175, 415, 'RESET', () => {
      localStorage.removeItem('business');
      window.location.reload();
    });
    this.add.existing(this.resetButton);

    // Background bar for top header
    this.bg = this.add.graphics().setScrollFactor(0).setDepth(998);
    this.bg.fillStyle(0x000000, 0.7);
    this.bg.fillRect(0, 0, 240, 22);

    // Background for build menu (shown during night)
    this.buildBg = this.add.graphics().setScrollFactor(0).setDepth(998);
    this.buildBg.fillStyle(0x000000, 0.6);
    this.buildBg.fillRect(0, 60, 240, 52);
    this.buildBg.setVisible(false);

    this.graphics = this.add.graphics().setScrollFactor(0).setDepth(999);
  }

  _highlightBuildButton(activeId) {
    this.activeBuildMode = activeId;
  }

  // ===================================================================
  // Phase Change
  // ===================================================================

  onPhaseChange(phase, day) {
    if (phase === PHASE.NIGHT) {
      this.phaseText.setText(`🌙 Night (D${day})`);
      this._showBuildMode(true);
    } else {
      this.phaseText.setText(`☀ Day ${day}`);
      this._showBuildMode(false);
    }
  }

  _showBuildMode(show) {
    this.buildButtons.forEach((b) => b.button.setVisible(show));
    this.buildCostText.setVisible(show);
    this.buildBg.setVisible(show);
    this.skipNightBtn.setVisible(show);
    this.janitorBtn.setVisible(show);
    this.hireButton.setVisible(!show);
  }

  // ===================================================================
  // Daily Report
  // ===================================================================

  onDailyReport(report) {
    const text = [
      `Day Report: ${report.profit >= 0 ? '+' : ''}$${report.profit}`,
      `Rev:$${report.revenue} Sal:-$${report.salaryCost}`,
      `Mnt:-$${report.maintenanceCost} Rent:-$${report.rentCost}`,
    ].join(' | ');

    this.reportText.setText(text);
    this.reportText.setVisible(true);

    this.time.delayedCall(5000, () => {
      this.reportText.setVisible(false);
    });
  }

  // ===================================================================
  // Events
  // ===================================================================

  updateEvents(events) {
    if (events.length > 0) {
      this.eventText.setText(events.map((e) => `${e.icon}${e.remaining}s`).join(' '));
    } else {
      this.eventText.setText('');
    }
  }

  // ===================================================================
  // Funds
  // ===================================================================

  onFundsChange(amount) {
    if (!this.fundsBox) return;
    const positive = amount > 0;
    const symbol = positive ? '+' : '-';
    const absAmount = Math.abs(amount);
    const dist = 10;
    const style = { ...light, fill: positive ? '#6f6' : '#f66' };
    const text = new Text(
      this,
      this.fundsBox.x + (positive ? 8 : 20),
      this.fundsBox.y + (positive ? dist : 0),
      `${symbol}$${absAmount}`,
      style,
    );
    this.add.existing(text);

    this.tweens.add({
      targets: text,
      y: this.fundsBox.y + (positive ? 0 : dist),
      onComplete: () => text.destroy(),
      duration: 300,
    });
  }

  // ===================================================================
  // Employee Selection
  // ===================================================================

  selectEmployee(e) {
    this._clearEmployeePopup();

    this.selectedEmployee = e;
    if (!this.selectedEmployee) return;

    const { width, height } = this.sys.game.canvas;
    const padding = TILE_SIZE;

    this.overlay = this.add
      .graphics({ fillStyle: { color: 0x000000, alpha: 0.6 } })
      .setScrollFactor(0)
      .setDepth(9999);
    this.overlay.fillRect(padding, padding * 2, width - padding * 2, height - padding * 4);

    this.employeeInfo = new Text(this, padding + 1, padding * 2 + 1).setDepth(9999);
    this.employeeInfo.setText(this.office.getEmployeeInfo(this.selectedEmployee));
    this.add.existing(this.employeeInfo);

    this.fireButton = new Button(this, padding + 1, 200, 'FIRE', () => {
      this.selectedEmployee.fire();
      this.selectEmployee(null);
    }).setDepth(9999);
    this.add.existing(this.fireButton);

    this.employeeStats = new Text(this, padding + 40, 200).setDepth(9999);
    this.employeeStats.setText(this.office.getEmployeeStats(this.selectedEmployee));
    this.add.existing(this.employeeStats);

    this.closeButton = new Button(this, width - padding * 2, padding * 2 + 1, 'X', () => {
      this.selectEmployee(null);
    }).setDepth(9999);
    this.add.existing(this.closeButton);

    this.time.delayedCall(300, () => {
      if (this.selectedEmployee) this.selectEmployee(this.selectedEmployee);
    });
  }

  _clearEmployeePopup() {
    if (this.fireButton) this.fireButton.destroy();
    if (this.closeButton) this.closeButton.destroy();
    if (this.employeeInfo) this.employeeInfo.destroy();
    if (this.employeeStats) this.employeeStats.destroy();
    if (this.overlay) this.overlay.destroy();
  }

  // ===================================================================
  // Update Loop
  // ===================================================================

  update() {
    if (!this.office.economy) return;

    this.fundsBox.setText(this.office.economy.getFormattedFunds());

    const remaining = Math.ceil(this.office.dayCycle.getTimeRemaining());
    this.phaseTimer.setText(`${remaining}s`);

    // Phase progress bar (narrow, below header)
    this.graphics.clear();
    const progress = this.office.dayCycle.getPhaseProgress();
    const barX = 124;
    const barY = 18;
    const barW = 60;
    this.graphics.fillStyle(0x444444, 1);
    this.graphics.fillRect(barX, barY, barW, 3);
    const barColor = this.office.dayCycle.isPlayMode() ? 0x44aaff : 0x4444ff;
    this.graphics.fillStyle(barColor, 1);
    this.graphics.fillRect(barX, barY, barW * progress, 3);

    // Build mode cost display
    if (this.office.dayCycle.isBuildMode() && this.buildCostText.visible) {
      const mode = this.office.buildMode;
      let cost = 'Free';
      if (mode.costFn) {
        if (mode.id === 'dig') cost = `$${this.office.tilemap.getDigCost()}`;
        else if (mode.id === 'carpet') cost = `$${this.office.tilemap.getCarpetCost()}`;
        else cost = `$${this.office.economy.getFacilityCost(mode.costArg)}`;
      } else if (mode.cost) {
        cost = `$${mode.cost}`;
      }
      this.buildCostText.setText(`${mode.label}  Cost: ${cost}`);
    }
  }
}
