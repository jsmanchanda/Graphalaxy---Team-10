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

/** Finds text using the wording the player sees. */
function findText(label: string) {
  return view
    ?.getGroup()
    .findOne((node: Konva.Node) => node.getAttr('text') === label);
}

/** Finds a button using the label the player sees. */
function findButton(label: string): Konva.Group {
  const button = findText(label)?.getParent();
  if (button instanceof Konva.Group) return button;
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
      /\b waves? matched\.$/.test(String(node.getAttr('text'))),
    )
    ?.getAttr('text');
}

describe('Radio-wave minigame', () => {
  it('requires three correct answers in 65 seconds to earn a hint', () => {
    expect(makeRadioWaveMinigameScreen().config).toMatchObject({
      correctAnswersForHint: 3,
      timeLimitSeconds: 65,
    });
  });

  it('updates the signal banner as correct answers reach the hint goal', () => {
    startGame();
    const banner = view?.getGroup().findOne((node: Konva.Node) => {
      return node.getAttr('text') === 'SIGNAL: SEARCHING (0/3)';
    });
    expect(banner).toBeDefined();

    submitAnswer('9');
    expect(banner?.getAttr('text')).toBe('SIGNAL: SEARCHING (0/3)');

    answerCorrectQuestions(2);
    expect(banner?.getAttr('text')).toBe('SIGNAL: SEARCHING (2/3)');

    submitAnswer();
    expect(banner?.getAttr('text')).toBe('SIGNAL:');
    expect(banner?.getAttr('fill')).toBe('#ffffff');
    const found = banner?.getParent()?.findOne((node: Konva.Node) => {
      return node.getAttr('text') === 'FOUND (3/3)';
    });
    expect(found?.getAttr('fill')).toBe('#86efac');
  });

  it('shows results when time runs out and cleans up the controls and timer', () => {
    const onAction = startGame();

    vi.advanceTimersByTime(ROUND_LENGTH_MS - 100);
    expect(getScoreText()).toBeUndefined();

    vi.advanceTimersByTime(100);
    expect(getScoreText()).toBe('0 of 3 waves matched.');
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
    {score: 0, earnsHint: false, scoreText: '0 of 3 waves matched.'},
    {score: 2, earnsHint: false, scoreText: '2 of 3 waves matched.'},
    {score: 3, earnsHint: true, scoreText: '3 waves matched.'},
    {score: 4, earnsHint: true, scoreText: '4 waves matched.'},
  ])(
    'reports addHint=$earnsHint for $score correct answers',
    ({score, earnsHint, scoreText}) => {
      const onAction = startGame();
      answerCorrectQuestions(score);

      vi.advanceTimersByTime(ROUND_LENGTH_MS);
      expect(getScoreText()).toBe(scoreText);
      expect(
        findText(earnsHint ? 'Signal restored!' : 'Signal lost!'),
      ).toBeDefined();
      expect(
        findText(earnsHint ? 'Hint earned.' : 'No hint earned.'),
      ).toBeDefined();

      findButton('Go to lesson').fire('click');
      expect(onAction).toHaveBeenCalledExactlyOnceWith({
        type: 'endMiniGame',
        addHint: earnsHint,
      });
    },
  );

  it('reports the result only once after repeated clicks or taps', () => {
    const onAction = startGame();
    answerCorrectQuestions(3);
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
    expect(getScoreText()).toBe('0 of 3 waves matched.');
  });

  it.each(['amplitude', 'frequency', 'horizontal-shift', 'vertical-shift'])(
    'uses a whole-number step for the %s control',
    name => {
      startGame();
      expect(elements.find(input => input.name === name)?.step).toBe('1');
    },
  );

  it.each([
    {name: 'horizontal-shift', value: '-1.99'},
    {name: 'vertical-shift', value: '-1.99'},
  ])('does not score decimal values in $name', ({name, value}) => {
    startGame();
    setInputValue('amplitude', '1');
    setInputValue('frequency', '1');
    setInputValue('horizontal-shift', '-2');
    setInputValue('vertical-shift', '-2');
    setInputValue(name, value);
    findButton('SUBMIT').fire('click');

    vi.advanceTimersByTime(ROUND_LENGTH_MS);
    expect(getScoreText()).toBe('0 of 3 waves matched.');
  });

  it.each(['horizontal-shift', 'vertical-shift'])(
    'blocks decimal typing and paste in %s while allowing integers',
    name => {
      startGame();
      const input = elements.find(element => element.name === name);
      const beforeInput = input?.addEventListener.mock.calls.find(
        ([event]) => event === 'beforeinput',
      )?.[1];
      const paste = input?.addEventListener.mock.calls.find(
        ([event]) => event === 'paste',
      )?.[1];
      const preventDefault = vi.fn();

      beforeInput({data: '.', preventDefault});
      paste({clipboardData: {getData: () => '-1.5'}, preventDefault});
      expect(preventDefault).toHaveBeenCalledTimes(2);

      beforeInput({data: '-', preventDefault});
      beforeInput({data: '2', preventDefault});
      paste({clipboardData: {getData: () => '-2'}, preventDefault});
      expect(preventDefault).toHaveBeenCalledTimes(2);
    },
  );

  it('accepts the whole-number target after rejecting a decimal shift', () => {
    // This makes the target y = 4 sin(3(x - 2)) + 2.
    vi.mocked(Math.random).mockReturnValue(0.99);
    startGame();
    setInputValue('amplitude', '4');
    setInputValue('frequency', '3');
    setInputValue('vertical-shift', '2');
    setInputValue('horizontal-shift', '-0.1');
    findButton('SUBMIT').fire('click');

    setInputValue('horizontal-shift', '2');
    findButton('SUBMIT').fire('click');
    vi.advanceTimersByTime(ROUND_LENGTH_MS);
    expect(getScoreText()).toBe('1 of 3 waves matched.');
  });

  it('opens settings from the gear icon', () => {
    const onAction = vi.fn();
    view = new RadioWaveMinigameView(onAction, makeRadioWaveMinigameScreen());

    view.getGroup().findOne('.settingsIcon')?.fire('click');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'openSettings'});
  });

  it('stops the clock and hides the inputs while paused, then carries on', () => {
    startGame();
    vi.advanceTimersByTime(ROUND_LENGTH_MS - 1000);

    view?.pause();
    expect(controlsContainer?.style).toMatchObject({display: 'none'});
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(ROUND_LENGTH_MS * 2);
    expect(getScoreText()).toBeUndefined();

    view?.resume();
    expect(controlsContainer?.style).toMatchObject({display: 'flex'});
    // The same question is still answerable with the time that was left.
    submitAnswer();
    vi.advanceTimersByTime(900);
    expect(getScoreText()).toBeUndefined();
    vi.advanceTimersByTime(200);
    expect(getScoreText()).toBe('1 of 3 waves matched.');
  });

  it('pauses harmlessly before the round starts', () => {
    const onAction = vi.fn();
    view = new RadioWaveMinigameView(onAction, makeRadioWaveMinigameScreen());

    view.pause();
    view.resume();
    expect(vi.getTimerCount()).toBe(0);

    findButton('START').fire('click');
    vi.advanceTimersByTime(ROUND_LENGTH_MS);
    expect(getScoreText()).toBe('0 of 3 waves matched.');
  });

  it('does not restart the timer after a correct answer', () => {
    startGame();
    vi.advanceTimersByTime(ROUND_LENGTH_MS / 2);
    submitAnswer();

    vi.advanceTimersByTime(ROUND_LENGTH_MS / 2);
    expect(getScoreText()).toBe('1 of 3 waves matched.');
    expect(vi.getTimerCount()).toBe(0);
  });
});
