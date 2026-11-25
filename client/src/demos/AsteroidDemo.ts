/**
 * ASTEROID MINIGAME DEMO
 * Runs the asteroid minigame on its own, through a real UiManager, exactly
 * as the game does after the player picks Asteroid Defense.
 * run with:
 *        npm run dev:asteroids -w client # starts Vite and opens http://localhost:5173/src/demos/asteroidDemo.html
 */
import {
  FONT_CONTHRAX,
  FONT_PLANET_KOSMOS,
  PRELOAD_IMAGES,
} from '../UI/constants';
import {preloadImages} from '../UI/imageCache';
import {UiManager} from '../UI/UIManager';

const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

/** Builds the UI and opens the minigame, as GameManager does. */
function start(): void {
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
  ui.displayScreen({type: 'asteroidMinigame'});
}

// Load the fonts and images first, like main.ts, so nothing pops in late
// (the cockpit frame, the asteroid sprites, the background). Start anyway if
// a font fails, with the browser's fallback font; preloadImages never fails,
// it only warns about an image it couldn't load.
Promise.all([
  Promise.all(fonts.map(font => font.load())).then(loaded =>
    loaded.forEach(font => document.fonts.add(font)),
  ),
  preloadImages(PRELOAD_IMAGES),
])
  .catch(error => console.error('Font loading failed:', error))
  .finally(start);
