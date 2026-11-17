/**
 * ASTEROID MINIGAME DEBUG DEMO
 * A rough page for playing a run through the controller and checking that
 * the hit test agrees with the drawn curve. Not the cockpit design.
 * run with:
 *        npm run dev:asteroids -w client # starts Vite and opens http://localhost:5173/src/demos/asteroidDemo.html
 */
import Konva from 'konva';
import {AsteroidMiniGameController} from '../Asteroids/AsteroidMiniGameController';
import {WINDOW_MAX, WINDOW_MIN} from '../Asteroids/math/asteroids';
import {FORMS} from '../Asteroids/math/forms';
import type {MiniGameResult, Screen} from '../Asteroids/types';
import {GraphComponent} from '../Graphing/GraphComponent';

const GRAPH_SIZE = 600;
const PREVIEW_SIZE = 200;
const GAP = 20;
const PIXELS_PER_UNIT = GRAPH_SIZE / (WINDOW_MAX - WINDOW_MIN);

const ASTEROID_STYLE = {stroke: 'orange', fill: 'rgba(255, 165, 0, 0.25)'};
const DESTROYED_STYLE = {stroke: 'red', fill: 'rgba(239, 68, 68, 0.6)'};

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
  width: GRAPH_SIZE + GAP + PREVIEW_SIZE,
  height: GRAPH_SIZE,
});
const layer = new Konva.Layer();
stage.add(layer);

let controller: AsteroidMiniGameController;
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

  // GraphComponent's default window is -10..10, the same as WINDOW_MIN/MAX.
  const field = new GraphComponent(0, 0, GRAPH_SIZE, GRAPH_SIZE);
  const preview = new GraphComponent(
    GRAPH_SIZE + GAP,
    0,
    PREVIEW_SIZE,
    PREVIEW_SIZE,
  );
  layer.add(field.getGroup(), preview.getGroup());

  const circles = question.asteroids.map(asteroid => {
    const circle = new Konva.Circle({
      x: field.convertToPixelsX(asteroid.position.x),
      y: field.convertToPixelsY(asteroid.position.y),
      radius: asteroid.radius * PIXELS_PER_UNIT,
      strokeWidth: 2,
      ...ASTEROID_STYLE,
    });
    field.getGroup().add(circle);
    return circle;
  });
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
    field.addFunction(result.expression, 'shot');
    result.hits.forEach((hit, i) => {
      if (hit) {
        circles[i].setAttrs(DESTROYED_STYLE);
      }
    });
    layer.batchDraw();
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

function finish(result: MiniGameResult) {
  log.textContent = `finish() was called with:\n${JSON.stringify(result, null, 2)}`;
  setAction('Play again', newRun);
}

function newRun() {
  log.textContent = '';
  controller = new AsteroidMiniGameController(show, finish);
  controller.start();
}

newRun();
