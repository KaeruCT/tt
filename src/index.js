import 'normalize.css/normalize.css';
import './styles/index.scss';
import './game/index.js';

window.addEventListener(
  'touchmove',
  (event) => {
    event.preventDefault();
  },
  false,
);
