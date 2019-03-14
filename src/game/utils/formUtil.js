import AlignGrid from './alignGrid';

export default class FormUtil {
    constructor(config) {
        this.scene = config.scene;
        //get the game height and width
        const { width, height } = this.scene.sys.game.canvas;
        this.gameWidth = width;
        this.gameHeight = height;
        this.alignGrid = new AlignGrid({
            scene: this.scene,
            width: width,
            height: height,
            rows: config.rows,
            cols: config.cols
        });
    }
    showNumbers() {
        this.alignGrid.showNumbers();
    }
    scaleToGame(el, perW, perH) {
        this.scaleToGameW(el, perW);
        this.scaleToGameH(el, perH);
    }
    scaleToGameW(el, per) {
        const w = this.gameWidth * per;
        el.style.width = w + 'px';
    }
    scaleToGameH(el, per) {
        const h = this.gameHeight * per;
        el.style.height = h + 'px';
    }
    placeElementAt(index, el, centerX = true, centerY = false) {
        const pos = this.alignGrid.getPosByIndex(index);
        let { x, y } = pos;
        el.style.position = 'absolute';

        const w = this.toNum(el.style.width);  
        if (centerX == true) x -= w / 2;

        const h = this.toNum(el.style.height);
        if (centerY == true) y -= h / 2;

        el.style.top = `${y}px`;
        el.style.left = `${x}px`;
    }
    //changes 100px to 100
    toNum(s) {
        return parseInt(s.replace('px', ''));
    }
}