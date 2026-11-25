import {GameManager} from './Frontend/GameManager';
import {
  FONT_CONTHRAX,
  FONT_PLANET_KOSMOS,
  PRELOAD_IMAGES,
} from './UI/constants';
import {preloadImages} from './UI/imageCache';

// Load fonts before drawing anything, since Konva won't redraw when they arrive
const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

Promise.all([
  Promise.all(fonts.map(f => f.load())),
  preloadImages(PRELOAD_IMAGES),
])
  .then(([loaded]) => {
    loaded.forEach(f => document.fonts.add(f));
    return new GameManager().start();
  })
  .catch(err => console.error('Startup failed:', err));
