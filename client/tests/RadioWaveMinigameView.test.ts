import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from './helpers/konvaStubs';
import {makeRadioWaveMinigameScreen} from '../src/Frontend/screenModelMaker';
import {RadioWaveMinigameView} from '../src/UI/screens/RadioWaveMinigameView';

installKonvaStubs();

const ROUND_LENGTH_MS =
  makeRadioWaveMinigameScreen().config.timeLimitSeconds * 1000;

/** Stands in for the HTML inputs and their container in these Node tests. */
class MockElement {
  name = '';
  type = '';
  step = '';
  value = '';
  style = {};
  append = vi.fn();
  remove = vi.fn();
  addEventListener = vi.fn();

  /** Number inputs return NaN when they are empty or contain invalid text. */
  get valueAsNumber() {
    if (this.value === '') return NaN;
    return Number(this.value);
  }
}

let elements: MockElement[];
let controlsContainer: MockElement | undefined;
let view: RadioWaveMinigameView | undefined;
let shapeId = 0;

beforeEach(() => {
  vi.useFakeTimers();

  // Fixed randomness makes the first target y = sin(x + 2) - 2.
  vi.spyOn(Math, 'random').mockReturnValue(0);

  // Konva also uses randomness for its internal shape colors. Give it unique
  // colors separately so our fixed question values do not cause collisions.
  vi.spyOn(Konva.Util, 'getHitColor').mockImplementation(() => {
    shapeId += 1;
    return '#' + shapeId.toString(16).padStart(6, '0');
  });

  // Provide only the browser features used by the minigame.
  elements = [];
  controlsContainer = undefined;
  vi.stubGlobal('window', {
    innerWidth: 800,
    innerHeight: 500,
    setInterval,
    clearInterval,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('document', {
    createElement: (tagName: string) => {
      const element = new MockElement();
      elements.push(element);
      if (tagName === 'div') controlsContainer = element;
      return element;
    },
    createTextNode: (text: string) => text,
    body: {append: vi.fn()},
  });
});

afterEach(() => {
  view?.getGroup().destroy();
  view = undefined;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Finds a button using the label the player sees. */
function findButton(label: string): Konva.Group {
  if (!view) throw new Error('The minigame has not been created');

  for (const child of view.getGroup().getChildren()) {
    if (child instanceof Konva.Group) {
      const labelNode = child.findOne(
        (node: Konva.Node) => node.getAttr('text') === label,
      );
      if (labelNode) return child;
    }
  }
  throw new Error(`Missing button: ${label}`);
}

/** Sets the same input value a player would type. */
function setInputValue(name: string, value: string): void {
  const input = elements.find(element => element.name === name);
  if (!input) throw new Error(`Missing input: ${name}`);
  input.value = value;
}

/** Creates the view and clicks START, returning the callback we check later. */
function startGame() {
  const onAction = vi.fn();
  view = new RadioWaveMinigameView(onAction, makeRadioWaveMinigameScreen());
  findButton('START').fire('click');
  return onAction;
}

/** Fills in the equation and clicks SUBMIT. Defaults match the first target. */
function submitAnswer(amplitude = '1', horizontalShift = '-2'): void {
  setInputValue('amplitude', amplitude);
  setInputValue('frequency', '1');
  setInputValue('horizontal-shift', horizontalShift);
  setInputValue('vertical-shift', '-2');
  findButton('SUBMIT').fire('click');
}

/** Builds a score through real submissions, without changing private state. */
function answerCorrectQuestions(count: number): void {
  // Fixed randomness repeats the same target. The game's repeat prevention
  // changes its amplitude, so the targets alternate between 1 and 2.
  let amplitude = '1';
  for (let i = 0; i < count; i++) {
    submitAnswer(amplitude);
    amplitude = amplitude === '1' ? '2' : '1';
  }
}

/** Reads the score displayed on the results screen. */
function getScoreText() {
  return view
    ?.getGroup()
    .findOne((node: Konva.Node) =>
      String(node.getAttr('text')).startsWith('Correct answers:'),
    )
    ?.getAttr('text');
}

describe('Radio-wave minigame', () => {
  it('requires five correct answers to earn a hint', () => {
    expect(makeRadioWaveMinigameScreen().config.correctAnswersForHint).toBe(5);
  });

  it('shows results when time runs out and cleans up the controls and timer', () => {
    const onAction = startGame();

    vi.advanceTimersByTime(ROUND_LENGTH_MS - 100);
    expect(getScoreText()).toBeUndefined();

    vi.advanceTimersByTime(100);
    expect(getScoreText()).toBe('Correct answers: 0');
    expect(controlsContainer?.remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expect(onAction).not.toHaveBeenCalled();

    findButton('Go to lesson').fire('click');
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: 'endMiniGame',
      addHint: false,
    });
  });

  it.each([
    {score: 0, earnsHint: false},
    {score: 4, earnsHint: false},
    {score: 5, earnsHint: true},
    {score: 6, earnsHint: true},
  ])(
    'reports addHint=$earnsHint for $score correct answers',
    ({score, earnsHint}) => {
      const onAction = startGame();
      answerCorrectQuestions(score);

      vi.advanceTimersByTime(ROUND_LENGTH_MS);
      expect(getScoreText()).toBe(`Correct answers: ${score}`);

      findButton('Go to lesson').fire('click');
      expect(onAction).toHaveBeenCalledExactlyOnceWith({
        type: 'endMiniGame',
        addHint: earnsHint,
      });
    },
  );

  it('reports the result only once after repeated clicks or taps', () => {
    const onAction = startGame();
    answerCorrectQuestions(5);
    vi.advanceTimersByTime(ROUND_LENGTH_MS);

    const continueButton = findButton('Go to lesson');
    continueButton.fire('click');
    continueButton.fire('click');
    continueButton.fire('tap');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: 'endMiniGame',
      addHint: true,
    });
  });

  it.each([
    {description: 'incorrect', amplitude: '9'},
    {description: 'empty', amplitude: ''},
    {description: 'invalid', amplitude: 'invalid'},
  ])('does not count an $description answer', ({amplitude}) => {
    startGame();
    submitAnswer(amplitude);

    vi.advanceTimersByTime(ROUND_LENGTH_MS);
    expect(getScoreText()).toBe('Correct answers: 0');
  });

  it('accepts a horizontal shift one full wave period away', () => {
    startGame();
    const equivalentShift = -2 + 2 * Math.PI;
    submitAnswer('1', String(equivalentShift));

    vi.advanceTimersByTime(ROUND_LENGTH_MS);
    expect(getScoreText()).toBe('Correct answers: 1');
  });

  it('does not restart the timer after a correct answer', () => {
    startGame();
    vi.advanceTimersByTime(ROUND_LENGTH_MS / 2);
    submitAnswer();

    vi.advanceTimersByTime(ROUND_LENGTH_MS / 2);
    expect(getScoreText()).toBe('Correct answers: 1');
    expect(vi.getTimerCount()).toBe(0);
  });
});
