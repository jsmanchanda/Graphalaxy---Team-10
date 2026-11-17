import {describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from '../helpers/konvaStubs';
import {AsteroidMiniGameModel} from '../../src/Asteroids/AsteroidMiniGameModel';
import type {
  CoefficientInputsHandle,
  CoefficientInputsOptions,
} from '../../src/Asteroids/components/CoefficientInputs';
import {ASTEROID_RADIUS} from '../../src/Asteroids/math/asteroids';
import type {Asteroid, AsteroidQuestion} from '../../src/Asteroids/types';
import {AsteroidMiniGameView} from '../../src/Asteroids/views/AsteroidMiniGameView';

// Build the real components in Node; see helpers/konvaStubs.ts
installKonvaStubs();

/** An asteroid at (x, y) with the default radius. */
function asteroidAt(x: number, y: number): Asteroid {
  return {position: {x, y}, radius: ASTEROID_RADIUS, destroyed: false};
}

/**
 * Hand-made questions with known answers, the same as asteroidModel.test.ts.
 * Built fresh for every test, since firing marks asteroids destroyed.
 */
function knownQuestions(): AsteroidQuestion[] {
  return [
    // y = 2x + 1 passes through (1, 3).
    {
      difficulty: 1,
      formId: 'linearSlopeIntercept',
      asteroids: [asteroidAt(1, 3)],
    },
    // y = (x - 0)² + 1 passes through (0, 1) and (1, 2).
    {
      difficulty: 2,
      formId: 'quadraticVertex',
      asteroids: [asteroidAt(0, 1), asteroidAt(1, 2)],
    },
    // y = x³ passes through (0, 0) and (1, 1).
    {
      difficulty: 3,
      formId: 'cubicStandard',
      asteroids: [asteroidAt(0, 0), asteroidAt(1, 1)],
    },
  ];
}

// What the player types, one string per coefficient.
const HITS = [
  ['2', '1'],
  ['1', '0', '1'],
  ['1', '0', '0', '0'],
];
const ONE_MISS = [HITS[0], ['0', '0', '-5'], HITS[2]];

/** A fake input row that the test types into; tracks remove() calls. */
interface FakeInputs extends CoefficientInputsHandle {
  type(values: string[]): void;
  remove: ReturnType<typeof vi.fn<() => void>>;
}

/**
 * A root view over the known questions. Each game screen gets a fake input
 * row; the latest one is `inputs()`.
 */
function setup() {
  const onAction = vi.fn();
  const rows: FakeInputs[] = [];
  const view = new AsteroidMiniGameView(onAction, {
    model: new AsteroidMiniGameModel(knownQuestions()),
    createInputs: (options: CoefficientInputsOptions) => {
      let typed = options.letters.map(() => '');
      const row: FakeInputs = {
        values: () => typed,
        focus: () => {},
        disable: () => {},
        remove: vi.fn<() => void>(),
        type: values => {
          typed = values;
          options.onInput(values);
        },
      };
      rows.push(row);
      return row;
    },
  });
  const inputs = () => {
    const row = rows.at(-1);
    if (!row) {
      throw new Error('No game screen has been shown');
    }
    return row;
  };
  return {view, screen: view.getGroup(), onAction, rows, inputs};
}

/** The node showing the given text, anywhere on the screen. */
function findText(screen: Konva.Group, text: string): Konva.Node | undefined {
  return screen.findOne((node: Konva.Node) => node.getAttr('text') === text);
}

/** Clicks the button showing the given text. */
function click(screen: Konva.Group, text: string): void {
  const label = findText(screen, text);
  if (!label) {
    throw new Error(`No button showing "${text}"`);
  }
  label.getParent()?.fire('click');
}

/** Plays the current question: types the answer, fires, then goes on. */
function play(
  screen: Konva.Group,
  inputs: () => FakeInputs,
  answer: string[],
  next: string,
): void {
  inputs().type(answer);
  click(screen, 'Fire');
  click(screen, next);
}

describe('AsteroidMiniGameView', () => {
  it('opens on the intro screen', () => {
    const {screen} = setup();
    expect(findText(screen, 'Asteroids')).toBeDefined();
    expect(findText(screen, 'Launch')).toBeDefined();
  });

  it('shows one screen at a time: Launch replaces the intro with Q1', () => {
    const {screen} = setup();
    click(screen, 'Launch');

    expect(screen.getChildren()).toHaveLength(1);
    expect(findText(screen, 'Launch')).toBeUndefined();
    expect(
      findText(screen, 'Question 1/3 · Slope-intercept form'),
    ).toBeDefined();
  });

  it('ends on the result screen after all 3 questions', () => {
    const {screen, inputs} = setup();
    click(screen, 'Launch');
    play(screen, inputs, HITS[0], 'Next');
    play(screen, inputs, HITS[1], 'Next');
    play(screen, inputs, HITS[2], 'Results');

    expect(screen.getChildren()).toHaveLength(1);
    expect(findText(screen, 'Score: 3/3\nHint earned!')).toBeDefined();
  });

  it.each([
    ['earns a hint for 3/3', HITS, true],
    ['earns no hint with one miss', ONE_MISS, false],
  ])('sends endMiniGame on Continue and %s', (label, answers, addHint) => {
    const {screen, inputs, onAction} = setup();
    click(screen, 'Launch');
    play(screen, inputs, answers[0], 'Next');
    play(screen, inputs, answers[1], 'Next');
    play(screen, inputs, answers[2], 'Results');
    expect(onAction).not.toHaveBeenCalled();

    click(screen, 'Continue');
    expect(onAction).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith({type: 'endMiniGame', addHint});
  });

  it("removes a question's boxes when moving to the next one", () => {
    const {screen, inputs, rows} = setup();
    click(screen, 'Launch');
    play(screen, inputs, HITS[0], 'Next');

    expect(rows).toHaveLength(2);
    expect(rows[0].remove).toHaveBeenCalledOnce();
    expect(rows[1].remove).not.toHaveBeenCalled();
  });

  it('removes the boxes if the whole minigame is destroyed mid-question', () => {
    const {screen, inputs} = setup();
    click(screen, 'Launch');

    screen.destroy();
    expect(inputs().remove).toHaveBeenCalledOnce();
  });
});
