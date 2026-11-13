import {FONT_CONTHRAX, FONT_PLANET_KOSMOS} from '../UI/constants';
import {UiManager} from '../UI/UIManager';
import {RadioWaveMinigameScreenModel} from '../UI/types';

const model: RadioWaveMinigameScreenModel = {
  type: 'radioWaveMinigame',
  question: {
    amplitude: 2,
    frequency: 1,
    horizontalShift: 0,
    verticalShift: 0,
  },
  config: {
    timeLimitSeconds: 60,
    correctAnswersForHint: 5,
  },
};

const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

Promise.all(fonts.map(font => font.load()))
  .then(loaded => {
    loaded.forEach(font => document.fonts.add(font));
    const ui = new UiManager('container', () => {});
    ui.displayScreen(model);
  })
  .catch(error => console.error('Startup failed:', error));
