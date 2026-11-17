/**
 * ASTEROID MINIGAME DEBUG DEMO
 * A rough page for playing a run through the controller and checking that
 * the hit test agrees with the drawn curve. Not the cockpit design.
 * run with:
 *        npm run dev:asteroids -w client # starts Vite and opens http://localhost:5173/src/demos/asteroidDemo.html
 */
import Konva from 'konva';
import {AsteroidMiniGameController} from '../Asteroids/AsteroidMiniGameController';
import {AsteroidFieldComponent} from '../Asteroids/components/AsteroidFieldComponent';
import {FIELD_SIZE} from '../Asteroids/constants';
import {FORMS} from '../Asteroids/math/forms';
import type {MiniGameResult, Screen} from '../Asteroids/types';
import {AsteroidIntroView} from '../Asteroids/views/AsteroidIntroView';
import {GraphComponent} from '../Graphing/GraphComponent';
import {ImageComponent} from '../UI/components';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  FONT_CONTHRAX,
  FONT_PLANET_KOSMOS,
} from '../UI/constants';

// Stand-in preview with a grid, until TargetingPreviewComponent (4d) exists.
const DEMO_PREVIEW_SIZE = 200;
const GAP = 20;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`asteroidDemo.html is missing #${id}`);
  }
  return element as T;
}

const title = byId('title');
const info = byId('info');
const inputsBox = byId('inputs');
const status = byId('status');
const action = byId<HTMLButtonElement>('action');
const log = byId('log');

const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

// The debug game and result screens use a small canvas; the real views
// (so far only the intro) use the full 800×500 design canvas.
const DEBUG_SIZE = {
  width: FIELD_SIZE + GAP + DEMO_PREVIEW_SIZE,
  height: FIELD_SIZE,
};
const DESIGN_SIZE = {width: DESIGN_WIDTH, height: DESIGN_HEIGHT};

const stage = new Konva.Stage({container: 'container', ...DEBUG_SIZE});
const layer = new Konva.Layer();
stage.add(layer);

let inputs: HTMLInputElement[] = [];

function setAction(label: string, onClick: () => void, disabled = false) {
  action.textContent = label;
  action.onclick = onClick;
  action.disabled = disabled;
}

function texts(): string[] {
  return inputs.map(input => input.value);
}

function clearScreen() {
  layer.destroyChildren();
  layer.batchDraw();
  inputsBox.replaceChildren();
  inputs = [];
  status.textContent = '';
  action.hidden = false;
  stage.size(DEBUG_SIZE);
}

// The real intro view from step 4f, on the game's background.
function showIntro() {
  title.textContent = 'Asteroid minigame (debug)';
  info.textContent = 'Intro: the real AsteroidIntroView.';
  action.hidden = true;
  stage.size(DESIGN_SIZE);
  const background = new ImageComponent(
    0,
    0,
    DESIGN_WIDTH,
    DESIGN_HEIGHT,
    '/assets/background.jpeg',
  );
  const intro = new AsteroidIntroView(() => controller.launch());
  layer.add(background.getGroup(), intro.getGroup());
  layer.batchDraw();
}

function showGame() {
  const {model} = controller;
  const question = model.currentQuestion;
  const form = FORMS[question.formId];
  const asteroidList = question.asteroids
    .map(a => `(${a.position.x}, ${a.position.y})`)
    .join(', ');

  title.textContent = `Question ${model.questionNumber}/${model.questionCount} · level ${question.difficulty}`;
  info.textContent = `${form.name}: ${form.template}\nAsteroids: ${asteroidList}`;

  // The real window from step 4c, at its real size.
  const field = new AsteroidFieldComponent(
    0,
    0,
    FIELD_SIZE,
    question.asteroids,
  );
  const preview = new GraphComponent(
    FIELD_SIZE + GAP,
    0,
    DEMO_PREVIEW_SIZE,
    DEMO_PREVIEW_SIZE,
  );
  layer.add(field.getGroup(), preview.getGroup());
  layer.batchDraw();

  const updatePreview = () => {
    const expression = controller.preview(texts());
    preview.clearFunction('preview');
    if (expression === null) {
      status.textContent = 'Fill every field with a number or fraction.';
    } else {
      preview.addFunction(expression, 'preview');
      status.textContent = `Preview: y = ${expression}`;
    }
    action.disabled = expression === null;
  };

  const fire = () => {
    const result = controller.fire(texts());
    if (result === null) {
      return;
    }
    field.showShot(result);
    inputs.forEach(input => (input.disabled = true));
    status.textContent =
      `${result.hit ? 'HIT' : 'MISS'}: hits [${result.hits.join(', ')}]\n` +
      `y = ${result.expression}`;
    setAction(model.isFinished ? 'Results' : 'Next', () => controller.next());
  };

  inputs = form.coefficients.map(letter => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    label.append(`${letter} =`, input);
    inputsBox.append(label);
    input.addEventListener('input', updatePreview);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !action.disabled) {
        action.click();
      }
    });
    return input;
  });
  inputs[0]?.focus();

  setAction('Fire', fire, true);
  updatePreview();
}

function showResult(score: number) {
  const {model} = controller;
  title.textContent = 'Run over';
  info.textContent =
    `Score: ${score}/${model.questionCount}\n` +
    (model.earnedHint ? 'Hint earned!' : 'No hint this time.');
  setAction('Continue', () => controller.exit());
}

function show(screen: Screen) {
  clearScreen();
  switch (screen.type) {
    case 'AsteroidIntro':
      showIntro();
      break;
    case 'AsteroidGame':
      showGame();
      break;
    case 'AsteroidResult':
      showResult(screen.score);
      break;
  }
}

// No retry: the player gets one run per trigger, then control goes back to
// the game. Reload the page to play again.
function finish(result: MiniGameResult) {
  title.textContent = 'Minigame over';
  info.textContent =
    'In the real game, control goes back to the planet now.\n' +
    'Reload the page to play again.';
  action.hidden = true;
  log.textContent = `finish() was called with:\n${JSON.stringify(result, null, 2)}`;
}

const controller = new AsteroidMiniGameController(show, finish);

// Load the fonts first so the real views look like the game. Start anyway
// if they fail, with the browser's fallback font.
Promise.all(fonts.map(font => font.load()))
  .then(loaded => loaded.forEach(font => document.fonts.add(font)))
  .catch(error => console.error('Font loading failed:', error))
  .finally(() => controller.start());
