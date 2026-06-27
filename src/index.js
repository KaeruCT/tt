import 'normalize.css/normalize.css';
import './styles/index.scss';

// Wait for web fonts to load before starting the game
// to avoid Phaser text rendering crashes with unloaded fonts.
async function start() {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await import('./game/index.js');
}
start();

window.addEventListener(
  'touchmove',
  (event) => {
    event.preventDefault();
  },
  false,
);
