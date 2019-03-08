const style = {
    initial: { fill: '#aaa' },
    hover: { fill: '#acf' },
    active: { fill: '#afc' },
};

export default class Button extends Phaser.GameObjects.Text {
  constructor(scene, x, y, text, callback) {
    super(scene, x, y, text, style.initial);

    this.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.enterButtonHoverState() )
      .on('pointerout', () => this.enterButtonRestState() )
      .on('pointerdown', () => this.enterButtonActiveState() )
      .on('pointerup', () => {
        this.enterButtonHoverState();
        callback();
      });
  }

  enterButtonHoverState() {
    this.setStyle(style.hover);
  }

  enterButtonRestState() {
    this.setStyle(style.initial);
  }

  enterButtonActiveState() {
    this.setStyle(style.active);
  }
}