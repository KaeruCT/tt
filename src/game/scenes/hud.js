import Phaser from 'phaser';
import { PHASE } from '../systems/DayCycle';
import { TILE_SIZE } from '../systems/TilemapManager';
import Button from '../ui/Button';
import {
  BTN_BG,
  BUILD_PANEL_ALPHA,
  BUILD_PANEL_BG,
  DAY_PROGRESS,
  HUD_BG,
  HUD_BG_ALPHA,
  light,
  NIGHT_PROGRESS,
  PANEL_BG,
  PANEL_BORDER,
  PANEL_TITLE_BG,
  PROGRESS_BG,
  TEXT_GOLD,
} from '../ui/common';
import Text from '../ui/Text';

// Landscape layout: 426×240 canvas
// Build buttons: 2 rows × 4 columns, evenly spaced
const BTN_COLS = [6, 112, 218, 324];
const BTN_ROWS = [28, 54];

const BUILD_MODE_BUTTONS = [
  { id: 'dig', label: 'Dig', col: 0, row: 0 },
  { id: 'desk', label: 'Desk', col: 1, row: 0 },
  { id: 'carpet', label: 'Carpet', col: 2, row: 0 },
  { id: 'decor', label: 'Decor', col: 3, row: 0 },
  { id: 'pee', label: 'Pee', col: 0, row: 1 },
  { id: 'poo', label: 'Poo', col: 1, row: 1 },
  { id: 'sink', label: 'Sink', col: 2, row: 1 },
  { id: 'shower', label: 'Shower', col: 3, row: 1 },
];

// Event notification icons
const _EVENT_ICONS = {
  burrito_tuesday: '\uD83C\uDF2F',
  dungeon_rats: '\uD83D\uDC00',
  water_main_break: '\uD83D\uDCA7',
  inspector_visit: '\uD83D\uDD0D',
  overtime_crunch: '\u23F0',
  power_outage: '\uD83D\uDD0C',
  dungeon_monster: '\uD83D\uDC7E',
  coffee_spill: '\u2615',
};

export default class HudScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HudScene', active: true });
  }

  create() {
    this.office = this.scene.get('OfficeScene');
    this.selectedEmployee = null;
    this.buildButtons = [];
    this.activeBuildMode = 'dig';
    this._milestones = new Set();
    this._toasts = [];

    const stored = localStorage.getItem('business');

    this.buildUi();

    if (!stored) {
      this._showTitleScreen();
    }
  }

  // ===================================================================
  // UI Construction
  // ===================================================================

  buildUi() {
    // --- Top header bar ---
    this.bg = this.add.graphics().setScrollFactor(0).setDepth(998);
    this.bg.fillStyle(HUD_BG, HUD_BG_ALPHA);
    this.bg.fillRect(0, 0, 426, 24);

    // Pixel border below header
    this.bg.lineStyle(1, PANEL_BORDER, 0.8);
    this.bg.lineBetween(0, 24, 426, 24);

    // Funds (top-left) with coin icon
    this.fundsBox = new Text(this, 6, 4, '\uD83E\uDE99 $200');
    this.add.existing(this.fundsBox);

    // Day/Night phase indicator
    this.phaseText = new Text(this, 110, 4, '\u2600 Day');
    this.add.existing(this.phaseText);

    // Phase timer
    this.phaseTimer = new Text(this, 200, 4, '40s');
    this.add.existing(this.phaseTimer);

    // Event indicator
    this.eventText = new Text(this, 260, 4, '');
    this.add.existing(this.eventText);

    // Employee count
    this.empCountText = new Text(this, 380, 4, '');
    this.add.existing(this.empCountText);

    // Progress bar (below header text) - now with glow effect
    this.graphics = this.add.graphics().setScrollFactor(0).setDepth(999);

    // --- Build mode panel (night only) ---
    this.buildBg = this.add.graphics().setScrollFactor(0).setDepth(998);
    this.buildBg.fillStyle(BUILD_PANEL_BG, BUILD_PANEL_ALPHA);
    this.buildBg.fillRect(0, 24, 426, 62);
    this.buildBg.setVisible(false);

    // Build panel borders
    this.buildPanelBorder = this.add.graphics().setScrollFactor(0).setDepth(998);
    this.buildPanelBorder.lineStyle(1, PANEL_BORDER, 0.5);
    this.buildPanelBorder.strokeRect(0, 24, 426, 62);
    this.buildPanelBorder.setVisible(false);

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
    this.buildCostText = new Text(this, 6, 80, '');
    this.buildCostText.setVisible(false);
    this.add.existing(this.buildCostText);

    // Build cost tooltip cursor tracker
    this._buildTooltip = null;

    // --- Bottom bar ---
    const BOTTOM_Y = 215;

    // Hire button (day only)
    this.hireButton = new Button(this, 6, BOTTOM_Y, '+ Hire $50', () => {
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
    this.janitorBtn = new Button(this, 160, BOTTOM_Y, 'Janitor:OFF', () => {
      this.office.economy.janitorEnabled = !this.office.economy.janitorEnabled;
      this.janitorBtn.setText(`Janitor:${this.office.economy.janitorEnabled ? 'ON' : 'OFF'}`);
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

    // --- Event notification banner ---
    this.eventBanner = this.add.graphics().setScrollFactor(0).setDepth(10002);
    this.eventBannerText = null;
    this.eventBannerTween = null;

    // --- Toast notification system ---
    this._toastContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(10001);
  }

  _showTitleScreen() {
    const { width, height } = this.sys.game.canvas;

    // Pause the game scene so nothing ticks or accepts input behind the title
    this.office.scene.pause();

    // Fully opaque background so it reads as a modal screen
    const overlay = this.add
      .graphics({ fillStyle: { color: 0x0a0806, alpha: 1 } })
      .setScrollFactor(0)
      .setDepth(10000);
    overlay.fillRect(0, 0, width, height);

    // Input blocker — an invisible interactive zone that swallows clicks
    // so nothing behind the overlay can be activated
    const blocker = this.add
      .zone(width / 2, height / 2, width, height)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive();

    // Decorative pixel border
    const border = this.add.graphics().setScrollFactor(0).setDepth(10001);
    border.lineStyle(2, 0x8a7a4a, 0.8);
    border.strokeRect(16, 16, width - 32, height - 32);
    border.lineStyle(1, 0x5a4a2a, 0.5);
    border.strokeRect(18, 18, width - 36, height - 36);

    // Title
    const title = this.add
      .text(width / 2, 40, 'DUNGEON\nOFFICE', {
        fill: '#c9a84c',
        fontSize: '16px',
        fontFamily: '"Press Start 2P", monospace',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10001);
    this.add.existing(title);

    // Subtitle
    const subtitle = this.add
      .text(width / 2, 90, 'Manage your dungeon.\nKeep employees happy.', {
        fill: '#d4c5a9',
        fontSize: '8px',
        fontFamily: '"Press Start 2P", monospace',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10001);
    this.add.existing(subtitle);

    // Instructions
    const lines = [
      '\u2600 DAY: Work & earn',
      '  Click employees',
      '',
      '\uD83D\uDEBD Bathroom breaks:',
      '  Build toilets or...',
      '  mess on the floor.',
      '',
      '\uD83C\uDF19 NIGHT: Build!',
      '  Dig, place desks,',
      '  toilets, decor & more.',
    ];

    const instrText = this.add
      .text(40, 118, lines.join('\n'), {
        fill: '#d4c5a9',
        fontSize: '7px',
        fontFamily: '"Press Start 2P", monospace',
        lineSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(10001);
    this.add.existing(instrText);

    // Start button — elevate the border depth so it renders above the overlay
    const startBtn = new Button(this, width / 2 - 50, height - 50, 'START GAME', () => {
      overlay.destroy();
      blocker.destroy();
      border.destroy();
      title.destroy();
      subtitle.destroy();
      instrText.destroy();
      startBtn.destroy();
      // Resume the game scene
      this.office.scene.resume();
    }).setDepth(10002);
    if (startBtn._border) startBtn._border.setDepth(10001);
    this.add.existing(startBtn);
  }

  _highlightBuildButton(activeId) {
    this.activeBuildMode = activeId;
    // Update all build buttons to show active state
    this.buildButtons.forEach((b) => {
      if (b.id === activeId) {
        // Selected state: brighter border via custom styling
        b.button._drawBorder(0x7a6a3a);
      } else {
        b.button._drawBorder(BTN_BG);
      }
    });
  }

  // ===================================================================
  // Phase Change
  // ===================================================================

  onPhaseChange(phase, day) {
    if (phase === PHASE.NIGHT) {
      this.phaseText.setText(`\uD83C\uDF19 Night D${day}`);
      this._showBuildMode(true);
    } else {
      this.phaseText.setText(`\u2600 Day ${day}`);
      this._showBuildMode(false);
    }
  }

  _showBuildMode(show) {
    this.buildButtons.forEach((b) => b.button.setVisible(show));
    this.buildCostText.setVisible(show);
    this.buildBg.setVisible(show);
    this.buildPanelBorder.setVisible(show);
    this.skipNightBtn.setVisible(show);
    this.janitorBtn.setVisible(show);
    this.hireButton.setVisible(!show);
  }

  // ===================================================================
  // Daily Report (styled panel)
  // ===================================================================

  onDailyReport(report) {
    const { width, height } = this.sys.game.canvas;
    const panelW = 280;
    const panelH = 80;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;

    // Panel background
    const panelBg = this.add.graphics().setScrollFactor(0).setDepth(10002);
    panelBg.fillStyle(PANEL_BG, 0.95);
    panelBg.fillRect(px, py, panelW, panelH);
    panelBg.lineStyle(2, PANEL_BORDER, 1);
    panelBg.strokeRect(px, py, panelW, panelH);
    // Title bar
    panelBg.fillStyle(PANEL_TITLE_BG, 1);
    panelBg.fillRect(px, py, panelW, 20);
    panelBg.lineStyle(1, PANEL_BORDER, 0.8);
    panelBg.lineBetween(px, py + 20, px + panelW, py + 20);

    const title = this.add
      .text(px + 8, py + 4, 'DAILY REPORT', {
        fill: TEXT_GOLD,
        fontSize: '8px',
        fontFamily: '"Press Start 2P", monospace',
      })
      .setScrollFactor(0)
      .setDepth(10003);
    this.add.existing(title);

    const profitColor = report.profit >= 0 ? '#7bba6a' : '#d95757';
    const body = this.add
      .text(
        px + 8,
        py + 26,
        [
          `Profit: ${report.profit >= 0 ? '+' : ''}$${report.profit}`,
          `Revenue: $${report.revenue}`,
          `Salaries: -$${report.salaryCost}`,
          `Upkeep:   -$${report.maintenanceCost + report.rentCost}`,
        ].join('\n'),
        {
          fill: '#d4c5a9',
          fontSize: '7px',
          fontFamily: '"Press Start 2P", monospace',
          lineSpacing: 4,
        },
      )
      .setScrollFactor(0)
      .setDepth(10003);
    this.add.existing(body);

    // Profit highlight
    const profitText = this.add
      .text(px + 8, py + 26, `Profit: ${report.profit >= 0 ? '+' : ''}$${report.profit}`, {
        fill: profitColor,
        fontSize: '7px',
        fontFamily: '"Press Start 2P", monospace',
      })
      .setScrollFactor(0)
      .setDepth(10004);
    this.add.existing(profitText);

    // Dismiss after delay
    this.time.delayedCall(5000, () => {
      panelBg.destroy();
      title.destroy();
      body.destroy();
      profitText.destroy();
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

  /**
   * Show an event notification banner that slides in from the top.
   */
  showEventBanner(eventName, icon, _duration) {
    const { width } = this.sys.game.canvas;
    const bannerH = 20;
    const restY = 28; // Final resting y position for both box and text

    // Clear previous
    if (this.eventBannerText) this.eventBannerText.destroy();
    if (this.eventBannerTween) this.eventBannerTween.stop();

    // Draw the box at y=0 inside the Graphics so Graphics.y alone controls position
    this.eventBanner.clear();
    this.eventBanner.fillStyle(0x3a1a0a, 0.95);
    this.eventBanner.fillRect(20, 0, width - 40, bannerH);
    this.eventBanner.lineStyle(1, 0x8a7a4a, 0.8);
    this.eventBanner.strokeRect(20, 0, width - 40, bannerH);

    // Center text vertically inside the banner (4px padding from top)
    this.eventBannerText = this.add
      .text(width / 2, 4, `${icon} ${eventName}!`, {
        fill: '#d4c5a9',
        fontSize: '8px',
        fontFamily: '"Press Start 2P", monospace',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10003);
    this.add.existing(this.eventBannerText);

    // Slide in from above: start off-screen, tween to restY
    const startY = -bannerH;
    this.eventBannerText.y = startY;
    this.eventBanner.y = startY;
    this.eventBannerTween = this.tweens.add({
      targets: [this.eventBannerText, this.eventBanner],
      y: restY,
      duration: 300,
      ease: 'Back.easeOut',
      hold: 2000,
      yoyo: true,
      onComplete: () => {
        if (this.eventBannerText) this.eventBannerText.destroy();
        this.eventBanner.clear();
      },
    });
  }

  // ===================================================================
  // Funds
  // ===================================================================

  onFundsChange(amount) {
    if (!this.fundsBox) return;
    const positive = amount > 0;
    const symbol = positive ? '+' : '-';
    const absAmount = Math.abs(amount);
    const style = { ...light, fill: positive ? '#7bba6a' : '#d95757' };
    const text = new Text(
      this,
      this.fundsBox.x + 100,
      this.fundsBox.y + (positive ? 8 : -8),
      `${symbol}$${absAmount}`,
      style,
    );
    this.add.existing(text);

    // Arc upward and fade
    this.tweens.add({
      targets: text,
      y: text.y + (positive ? -15 : 15),
      x: text.x + 10,
      alpha: 0,
      duration: 600,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  // ===================================================================
  // Milestone Toasts
  // ===================================================================

  showMilestone(message) {
    const { width } = this.sys.game.canvas;
    const toastY = 140;

    const bg = this.add.graphics().setScrollFactor(0).setDepth(10003);
    bg.fillStyle(0x2a1a0a, 0.9);
    const textW = message.length * 7 + 16;
    bg.fillRect((width - textW) / 2, toastY, textW, 20);
    bg.lineStyle(1, 0xc9a84c, 0.8);
    bg.strokeRect((width - textW) / 2, toastY, textW, 20);

    const toast = this.add
      .text(width / 2, toastY + 4, message, {
        fill: '#c9a84c',
        fontSize: '8px',
        fontFamily: '"Press Start 2P", monospace',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10004)
      .setAlpha(0);
    this.add.existing(toast);

    this.tweens.add({
      targets: [toast, bg],
      alpha: 1,
      y: '-=5',
      duration: 300,
      ease: 'Back.easeOut',
      hold: 2000,
      yoyo: true,
      onComplete: () => {
        toast.destroy();
        bg.destroy();
      },
    });
  }

  checkMilestones(employeeCount, funds) {
    const milestones = [
      { key: 'first_hire', count: 1, msg: 'First Employee Hired!' },
      { key: 'team_5', count: 5, msg: 'Team of 5!' },
      { key: 'team_10', count: 10, msg: 'Office of 10!' },
      { key: 'rich_500', funds: 500, msg: '$500 Saved!' },
      { key: 'rich_1000', funds: 1000, msg: '$1,000 Fortune!' },
    ];

    for (const m of milestones) {
      if (this._milestones.has(m.key)) continue;
      let triggered = false;
      if (m.count !== undefined && employeeCount >= m.count) triggered = true;
      if (m.funds !== undefined && funds >= m.funds) triggered = true;
      if (triggered) {
        this._milestones.add(m.key);
        this.showMilestone(m.msg);
      }
    }
  }

  // ===================================================================
  // Employee Selection (styled pixel panel)
  // ===================================================================

  selectEmployee(e) {
    this._clearEmployeePopup();

    this.selectedEmployee = e;
    if (!this.selectedEmployee) return;

    const { width, height } = this.sys.game.canvas;
    const pad = TILE_SIZE;
    const panelX = pad;
    const panelY = pad * 2;
    const panelW = width - pad * 2;
    const panelH = height - pad * 4;

    // Panel background
    this.overlay = this.add
      .graphics({ fillStyle: { color: 0x000000, alpha: 0.5 } })
      .setScrollFactor(0)
      .setDepth(9999);
    this.overlay.fillRect(0, 0, width, height);

    this.panel = this.add.graphics().setScrollFactor(0).setDepth(9999);
    this.panel.fillStyle(PANEL_BG, 0.95);
    this.panel.fillRect(panelX, panelY, panelW, panelH);
    this.panel.lineStyle(2, PANEL_BORDER, 1);
    this.panel.strokeRect(panelX, panelY, panelW, panelH);
    // Title bar
    this.panel.fillStyle(PANEL_TITLE_BG, 1);
    this.panel.fillRect(panelX, panelY, panelW, 20);
    this.panel.lineStyle(1, PANEL_BORDER, 0.8);
    this.panel.lineBetween(panelX, panelY + 20, panelX + panelW, panelY + 20);

    // Title
    this.panelTitle = this.add
      .text(panelX + 8, panelY + 4, e.meta.name, {
        fill: TEXT_GOLD,
        fontSize: '8px',
        fontFamily: '"Press Start 2P", monospace',
      })
      .setScrollFactor(0)
      .setDepth(9999);
    this.add.existing(this.panelTitle);

    // Body text
    const bodyText = this._formatEmployeeBody(e);
    this.employeeInfo = this.add
      .text(panelX + 8, panelY + 26, bodyText, {
        fill: '#d4c5a9',
        fontSize: '6px',
        fontFamily: '"Press Start 2P", monospace',
        lineSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(9999);
    this.add.existing(this.employeeInfo);

    // Fire button
    this.fireButton = new Button(this, panelX + 8, panelY + panelH - 40, 'FIRE', () => {
      this.selectedEmployee.fire();
      this.selectEmployee(null);
    }).setDepth(9999);
    this.add.existing(this.fireButton);

    // Stats
    this.employeeStats = this.add
      .text(panelX + 80, panelY + panelH - 36, this._formatEmployeeStats(e), {
        fill: '#d4c5a9',
        fontSize: '6px',
        fontFamily: '"Press Start 2P", monospace',
        lineSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(9999);
    this.add.existing(this.employeeStats);

    // Close button
    this.closeButton = new Button(this, panelX + panelW - 30, panelY + 4, 'X', () => {
      this.selectEmployee(null);
    }).setDepth(9999);
    this.add.existing(this.closeButton);

    // Refresh every 300ms
    this._refreshTimer = this.time.delayedCall(300, () => {
      if (this.selectedEmployee && this.employeeInfo) {
        this.employeeInfo.setText(this._formatEmployeeBody(this.selectedEmployee));
        this.employeeStats.setText(this._formatEmployeeStats(this.selectedEmployee));
      }
    });
  }

  _formatEmployeeBody(e) {
    const { meta, working, relief } = e;
    let info = `Age: ${meta.age}\n`;
    if (meta.traits?.length) {
      info += `Traits: ${meta.traits.map((t) => t.name).join(', ')}\n`;
    }
    info += `\nHobbies:\n${meta.hobbies.map((h) => ` -${h}`).join('\n')}\n`;
    info += `\nWorking: ${working ? 'yes' : 'no'}`;
    if (meta.sadness) info += `\nSadness: ${meta.sadness}/3`;
    if (relief) {
      if (relief.inProgress) {
        info += `\nCurrently: ${relief.relief.label}`;
      } else {
        info += `\nNeeds to ${relief.relief.label}`;
        info += `\nTried ${relief.attempts}x`;
      }
    }
    return info;
  }

  _formatEmployeeStats(e) {
    const { stats } = e.meta;
    const f = (d) => Math.floor(d / 1000);
    return [
      'Stats:',
      `Work:${f(stats.work.duration)}s`,
      `Pee:${f(stats.pee.duration)}s`,
      `Poo:${f(stats.poo.duration)}s`,
      `Accidents:${stats.pee.outside + stats.poo.outside}`,
    ].join('\n');
  }

  _clearEmployeePopup() {
    if (this._refreshTimer) {
      this._refreshTimer.remove();
      this._refreshTimer = null;
    }
    if (this.fireButton) this.fireButton.destroy();
    if (this.closeButton) this.closeButton.destroy();
    if (this.employeeInfo) this.employeeInfo.destroy();
    if (this.employeeStats) this.employeeStats.destroy();
    if (this.panelTitle) this.panelTitle.destroy();
    if (this.panel) this.panel.destroy();
    if (this.overlay) this.overlay.destroy();
  }

  // ===================================================================
  // Update Loop
  // ===================================================================

  update() {
    if (!this.office.economy) return;

    const funds = this.office.economy.funds;
    this.fundsBox.setText(`\uD83E\uDE99 $${Math.floor(funds)}`);

    const remaining = Math.ceil(this.office.dayCycle.getTimeRemaining());
    this.phaseTimer.setText(`${remaining}s`);

    const empCount = this.office.employees.getChildren().length;
    this.empCountText.setText(`\uD83D\uDC64 ${empCount}`);

    // Check milestones
    this.checkMilestones(empCount, funds);

    // Phase progress bar with glow effect
    this.graphics.clear();
    const progress = this.office.dayCycle.getPhaseProgress();
    const barY = 23;

    // Background track
    this.graphics.fillStyle(PROGRESS_BG, 1);
    this.graphics.fillRect(0, barY, 426, 3);

    // Glow (slightly wider, transparent bar behind main bar)
    const barColor = this.office.dayCycle.isPlayMode() ? DAY_PROGRESS : NIGHT_PROGRESS;
    this.graphics.fillStyle(barColor, 0.3);
    this.graphics.fillRect(0, barY - 1, 426 * progress, 5);

    // Main bar
    this.graphics.fillStyle(barColor, 1);
    this.graphics.fillRect(0, barY, 426 * progress, 3);

    // Highlight edge on the progress bar
    if (progress > 0.01) {
      this.graphics.fillStyle(0xffffff, 0.2);
      this.graphics.fillRect(0, barY, 426 * progress, 1);
    }

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
      this.buildCostText.setText(`${mode.label}  Cost:${cost}`);
    }
  }
}
