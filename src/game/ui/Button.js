import Phaser from 'phaser';
import { BTN_ACTIVE, BTN_BG, BTN_BORDER, BTN_HOVER, BTN_TEXT } from './common';

const baseStyle = {
  fill: BTN_TEXT,
  padding: { left: 6, right: 6, top: 4, bottom: 4 },
  fontSize: '10px',
  fontFamily: '"Press Start 2P", monospace',
};

export default class Button extends Phaser.GameObjects.Text {
  constructor(scene, x, y, text, callback) {
    super(scene, x, y, text, baseStyle);

    this._callback = callback;

    // Pixel-art border graphic
    this._border = scene.add.graphics().setScrollFactor(0).setDepth(998);
    this._borderVisible = true;

    this.setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(999)
      .on('pointerover', () => this._enterHover())
      .on('pointerout', () => this._enterRest())
      .on('pointerdown', () => this._enterActive())
      .on('pointerup', () => {
        this._enterRest();
        callback();
      });

    this._drawBorder(BTN_BG);
  }

  _drawBorder(bgColor) {
    if (!this._border) return;
    const b = this.getBounds();
    const pad = 2;
    this._border.clear();

    // Background fill
    this._border.fillStyle(bgColor, 1);
    this._border.fillRect(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2);

    // Pixel border: raised effect (top/left lighter, bottom/right darker)
    // Top edge
    this._border.fillStyle(BTN_BORDER, 1);
    this._border.fillRect(b.x - pad, b.y - pad, b.width + pad * 2, 1);
    // Left edge
    this._border.fillRect(b.x - pad, b.y - pad, 1, b.height + pad * 2);
    // Bottom edge (dark)
    this._border.fillStyle(0x2a1a0a, 1);
    this._border.fillRect(b.x - pad, b.y + b.height + pad - 1, b.width + pad * 2, 1);
    // Right edge (dark)
    this._border.fillRect(b.x + b.width + pad - 1, b.y - pad, 1, b.height + pad * 2);
  }

  _enterHover() {
    this._drawBorder(BTN_HOVER);
  }

  _enterRest() {
    this._drawBorder(BTN_BG);
  }

  _enterActive() {
    this._drawBorder(BTN_ACTIVE);
  }

  setDepth(value) {
    super.setDepth(value);
    if (this._border) this._border.setDepth(value - 1);
    return this;
  }

  setVisible(value) {
    super.setVisible(value);
    if (this._border) this._border.setVisible(value);
  }

  destroy() {
    if (this._border) this._border.destroy();
    super.destroy();
  }
}
