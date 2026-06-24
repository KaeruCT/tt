import Phaser from 'phaser';
import { PHASE } from '../systems/DayCycle';
import { TILE_SIZE } from '../systems/TilemapManager';
import Button from '../ui/Button';
import { light } from '../ui/common';
import Text from '../ui/Text';

// Landscape layout: 426×240 canvas
// Build buttons: 2 rows × 4 columns, evenly spaced
const BTN_COLS = [6, 112, 218, 324];
const BTN_ROWS = [28, 54];

const BUILD_MODE_BUTTONS = [
  { id: 'dig', label: '⛏ Dig', col: 0, row: 0 },
  { id: 'desk', label: '🪑 Desk', col: 1, row: 0 },
  { id: 'carpet', label: '🟫 Carpet', col: 2, row: 0 },
  { id: 'decor', label: '🌿 Decor', col: 3, row: 0 },
  { id: 'pee', label: '🚽 Pee', col: 0, row: 1 },
  { id: 'poo', label: '🚽 Poo', col: 1, row: 1 },
  { id: 'sink', label: '🚰 Sink', col: 2, row: 1 },
  { id: 'shower', label: '🚿 Shower', col: 3, row: 1 },
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

    const stored = localStorage.getItem('business');

    this.buildUi();

    if (!stored) {
      this._showIntro();
    }
  }

  // ===================================================================
  // UI Construction
  // ===================================================================

  buildUi() {
    // --- Top header bar ---
    this.bg = this.add.graphics().setScrollFactor(0).setDepth(998);
    this.bg.fillStyle(0x000000, 0.7);
    this.bg.fillRect(0, 0, 426, 24);

    // Funds (top-left)
    this.fundsBox = new Text(this, 6, 3);
    this.add.existing(this.fundsBox);

    // Day/Night phase indicator
    this.phaseText = new Text(this, 90, 3, '☀ Day');
    this.add.existing(this.phaseText);

    // Phase timer
    this.phaseTimer = new Text(this, 180, 3, '40s');
    this.add.existing(this.phaseTimer);

    // Event indicator
    this.eventText = new Text(this, 240, 3, '');
    this.add.existing(this.eventText);

    // Employee count
    this.empCountText = new Text(this, 380, 3, '');
    this.add.existing(this.empCountText);

    // Progress bar (below header text)
    this.graphics = this.add.graphics().setScrollFactor(0).setDepth(999);

    // --- Build mode panel (night only) ---
    this.buildBg = this.add.graphics().setScrollFactor(0).setDepth(998);
    this.buildBg.fillStyle(0x000000, 0.6);
    this.buildBg.fillRect(0, 24, 426, 56);
    this.buildBg.setVisible(false);

    this.buildButtons = [];
    BUILD_MODE_BUTTONS.forEach((def) => {
      const x = BTN_COLS[def.col];
      const y = BTN_ROWS[def.row];
      const btn = new Button(this, x, y, def.label, () => {
        this.office.setBuildMode(def.id);
        this._highlightBuildButton(def.id);
      });
      btn.setVisible(false);
      this.add.existing(btn);
      this.buildButtons.push({ ...def, button: btn, active: def.id === 'dig' });
    });

    // Build cost display (below buttons)
    this.buildCostText = new Text(this, 6, 82, '');
    this.buildCostText.setVisible(false);
    this.add.existing(this.buildCostText);

    // --- Bottom bar ---
    const BOTTOM_Y = 215;

    // Hire button (day only)
    this.hireButton = new Button(this, 6, BOTTOM_Y, '+ Hire ($50)', () => {
      this.office.hireEmployee();
    });
    this.add.existing(this.hireButton);

    // Skip night button (night only)
    this.skipNightBtn = new Button(this, 6, BOTTOM_Y, 'Skip Night', () => {
      this.office.dayCycle.skipPhase();
    });
    this.skipNightBtn.setVisible(false);
    this.add.existing(this.skipNightBtn);

    // Janitor toggle (night only)
    this.janitorBtn = new Button(this, 120, BOTTOM_Y, 'Janitor: OFF', () => {
      this.office.economy.janitorEnabled = !this.office.economy.janitorEnabled;
      this.janitorBtn.setText(`Janitor: ${this.office.economy.janitorEnabled ? 'ON' : 'OFF'}`);
    });
    this.janitorBtn.setVisible(false);
    this.add.existing(this.janitorBtn);

    // Daily report text (above bottom bar)
    this.reportText = new Text(this, 6, 195, '');
    this.reportText.setVisible(false);
    this.add.existing(this.reportText);

    // Reset button (bottom-right)
    this.resetButton = new Button(this, 370, BOTTOM_Y, 'RESET', () => {
      localStorage.removeItem('business');
      window.location.reload();
    });
    this.add.existing(this.resetButton);

    // Zoom controls (right edge, near top)
    this.zoomInBtn = new Button(this, 398, 100, '+', () => {
      const cam = this.office.cameras.main;
      cam.zoom = Math.min(cam.zoom * 1.3, 3);
    });
    this.add.existing(this.zoomInBtn);

    this.zoomOutBtn = new Button(this, 398, 120, '-', () => {
      const cam = this.office.cameras.main;
      cam.zoom = Math.max(cam.zoom / 1.3, 0.5);
    });
    this.add.existing(this.zoomOutBtn);
  }

  _showIntro() {
    const { width, height } = this.sys.game.canvas;

    const overlay = this.add
      .graphics({ fillStyle: { color: 0x000000, alpha: 0.75 } })
      .setScrollFactor(0)
      .setDepth(10000);
    overlay.fillRect(0, 0, width, height);

    const lines = [
      'Welcome to Dungeon Office!',
      '',
      '☀ DAY: Employees work at desks',
      '   and earn you money.',
      '   Click an employee to see info.',
      '',
      '🚽 Employees need bathroom breaks.',
      '   Build toilets or they will...',
      '   make a mess on the floor.',
      '',
      '🌙 NIGHT: Build & expand!',
      '   Dig new rooms, place desks,',
      '   toilets, sinks & more.',
      '',
      'Goal: Grow your office & keep',
      'employees happy!',
    ];

    const introText = new Text(this, 30, 20, lines.join('\n'), {
      fill: '#fff',
      fontSize: '12px',
      fontFamily: 'monospace',
      lineSpacing: 2,
    }).setDepth(10001);
    this.add.existing(introText);

    const dismissBtn = new Button(this, width / 2 - 30, height - 40, '[ OK ]', () => {
      overlay.destroy();
      introText.destroy();
      dismissBtn.destroy();
    }).setDepth(10001);
    this.add.existing(dismissBtn);
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
      ` | Rev:$${report.revenue} Sal:-$${report.salaryCost}`,
      `Mnt:-$${report.maintenanceCost} Rent:-$${report.rentCost}`,
    ].join('');

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

    this.fireButton = new Button(this, padding + 1, 160, 'FIRE', () => {
      this.selectedEmployee.fire();
      this.selectEmployee(null);
    }).setDepth(9999);
    this.add.existing(this.fireButton);

    this.employeeStats = new Text(this, padding + 60, 160).setDepth(9999);
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

    this.empCountText.setText(`👤 ${this.office.employees.getChildren().length}`);

    // Phase progress bar (full width below header)
    this.graphics.clear();
    const progress = this.office.dayCycle.getPhaseProgress();
    const barY = 22;
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(0, barY, 426, 2);
    const barColor = this.office.dayCycle.isPlayMode() ? 0x44aaff : 0x6666cc;
    this.graphics.fillStyle(barColor, 1);
    this.graphics.fillRect(0, barY, 426 * progress, 2);

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
