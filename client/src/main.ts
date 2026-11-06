import {GameManager} from './Frontend/GameManager';
import {FONT_CONTHRAX, FONT_PLANET_KOSMOS} from './UI/constants';

// Load fonts before drawing anything, since Konva won't redraw when they arrive
const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

Promise.all(fonts.map(f => f.load()))
  .then(loaded => {
    loaded.forEach(f => document.fonts.add(f));
    return new GameManager().start();
  })
  .catch(err => console.error('Startup failed:', err));
