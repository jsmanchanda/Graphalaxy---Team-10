/**
 * ASTEROID MINIGAME DEMO
 * Runs the asteroid minigame on its own, through a real UiManager, exactly
 * as the game does after the player picks Asteroid Defense.
 * run with:
 *        npm run dev:asteroids -w client # starts Vite and opens http://localhost:5173/src/demos/asteroidDemo.html
 */
import {FONT_CONTHRAX, FONT_PLANET_KOSMOS} from '../UI/constants';
import {UiManager} from '../UI/UIManager';

const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

// In the game, GameManager handles endMiniGame and moves on to the lesson.
// Here the run just ends: there is no retry, so reload to play again.
const ui = new UiManager('container', action => {
  if (action.type === 'endMiniGame') {
    console.log('endMiniGame', action);
    ui.displayScreen({
      type: 'title',
      title: `Minigame over (addHint: ${action.addHint}). Reload to play again.`,
    });
  }
});

// Load the fonts first so the screens look like the game. Start anyway if
// they fail, with the browser's fallback font.
Promise.all(fonts.map(font => font.load()))
  .then(loaded => loaded.forEach(font => document.fonts.add(font)))
  .catch(error => console.error('Font loading failed:', error))
  .finally(() => ui.displayScreen({type: 'asteroidMinigame'}));
