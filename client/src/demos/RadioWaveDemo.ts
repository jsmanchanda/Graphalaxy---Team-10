import {
  FONT_CONTHRAX,
  FONT_PLANET_KOSMOS,
  RADIO_WAVE_IMAGES,
} from '../UI/constants';
import {preloadImages} from '../UI/imageCache';
import {UiManager} from '../UI/UIManager';
import {makeRadioWaveMinigameScreen} from '../Frontend/screenModelMaker';

const model = makeRadioWaveMinigameScreen();

const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

Promise.all([
  Promise.all(fonts.map(font => font.load())),
  preloadImages([
    '/assets/background.jpeg',
    '/assets/general-nav.png',
    ...Object.values(RADIO_WAVE_IMAGES),
  ]),
])
  .then(([loaded]) => {
    loaded.forEach(font => document.fonts.add(font));
    const ui = new UiManager('container', () => {});
    ui.displayScreen(model);
  })
  .catch(error => console.error('Startup failed:', error));
