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
import {GraphComponent} from '../Graphing/GraphComponent';

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

const stage = new Konva.Stage({
  container: 'container',
  width: FIELD_SIZE + GAP + DEMO_PREVIEW_SIZE,
  height: FIELD_SIZE,
});
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
}

function showIntro() {
  title.textContent = 'Asteroid minigame (debug)';
  info.textContent =
    'Type coefficients so the curve passes through every asteroid.\n' +
    'One shot per question. 3/3 earns a hint.';
  setAction('Launch', () => controller.launch());
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
controller.start();
