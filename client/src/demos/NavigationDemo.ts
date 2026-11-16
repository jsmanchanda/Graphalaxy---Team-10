import {FONT_CONTHRAX, FONT_PLANET_KOSMOS} from '../UI/constants';
import {NavigationScreenModel} from '../UI/types';
import {UiManager} from '../UI/UIManager';
import {allPlanets} from './demoPlanets';

const model: NavigationScreenModel = {
  type: 'navigation',
  planets: allPlanets,
  overallStatus: 0.2,
};

const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

Promise.all(fonts.map(f => f.load()))
  .then(loaded => {
    loaded.forEach(f => document.fonts.add(f));
    const ui = new UiManager('container', () => {});
    ui.displayScreen(model);
  })
  .catch(err => console.error('Startup failed:', err));
