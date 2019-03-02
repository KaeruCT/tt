
require('normalize.css/normalize.css');
require('./styles/index.scss');
require('./game/index.js');

window.addEventListener('touchmove', function(event) {
    event.preventDefault();
}, false);