import {describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from '../helpers/konvaStubs';
import {AsteroidMiniGameController} from '../../src/Asteroids/AsteroidMiniGameController';
import {AsteroidMiniGameModel} from '../../src/Asteroids/AsteroidMiniGameModel';
import {ASTEROID_RADIUS} from '../../src/Asteroids/math/asteroids';
import type {Asteroid, AsteroidQuestion} from '../../src/Asteroids/types';
import {AsteroidResultView} from '../../src/Asteroids/views/AsteroidResultView';
import {
  CONTINUE_BUTTON_X,
  CONTINUE_BUTTON_Y,
} from '../../src/Asteroids/constants';
import {RESULT_TEXT_X, RESULT_TEXT_Y} from '../../src/UI/constants';

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
    // y - 1 = 1(x - 0) passes through (0, 1) and (1, 2).
    {
      difficulty: 2,
      formId: 'linearPointSlope',
      asteroids: [asteroidAt(0, 1), asteroidAt(1, 2)],
    },
    // y = 1x + 0 passes through (0, 0) and (1, 1).
    {
      difficulty: 3,
      formId: 'linearSlopeIntercept',
      asteroids: [asteroidAt(0, 0), asteroidAt(1, 1)],
    },
  ];
}

// What the player types, one string per coefficient.
const HITS = [
  ['2', '1'],
  ['1', '0', '1'],
  ['1', '0'],
];
const ONE_MISS = [HITS[0], ['0', '0', '-5'], HITS[2]];

/** A result view after playing every question with the given answers. */
function setup(answers: string[][]) {
  const finish = vi.fn();
  const controller = new AsteroidMiniGameController(
    () => {},
    finish,
    new AsteroidMiniGameModel(knownQuestions()),
  );
  controller.start();
  controller.launch();
  for (const texts of answers) {
    controller.fire(texts);
    controller.next();
  }
  const screen = new AsteroidResultView(controller).getGroup();
  return {screen, finish};
}

/** The top-level component on a screen whose text box shows the given text. */
function findComponent(screen: Konva.Group, text: string): Konva.Group {
  const component = screen
    .getChildren()
    .find(
      (child): child is Konva.Group =>
        child instanceof Konva.Group &&
        child.findOne((node: Konva.Node) => node.getAttr('text') === text) !==
          undefined,
    );
  if (!component) {
    throw new Error(`No component showing "${text}"`);
  }
  return component;
}

describe('AsteroidResultView', () => {
  it('shows the score and a hint for a perfect run', () => {
    const {screen} = setup(HITS);
    expect(() =>
      findComponent(screen, 'Score: 3/3\nHint earned!'),
    ).not.toThrow();
  });

  it('shows the score and no hint after a miss', () => {
    const {screen} = setup(ONE_MISS);
    expect(() =>
      findComponent(screen, 'Score: 2/3\nNo hint this time.'),
    ).not.toThrow();
  });

  it('places the text and the Continue button', () => {
    const {screen} = setup(HITS);
    const text = findComponent(screen, 'Score: 3/3\nHint earned!');
    const button = findComponent(screen, 'Continue');

    expect([text.x(), text.y()]).toEqual([RESULT_TEXT_X, RESULT_TEXT_Y]);
    expect([button.x(), button.y()]).toEqual([
      CONTINUE_BUTTON_X,
      CONTINUE_BUTTON_Y,
    ]);
  });

  it('reports the result once when Continue is clicked', () => {
    const {screen, finish} = setup(ONE_MISS);
    expect(finish).not.toHaveBeenCalled();

    findComponent(screen, 'Continue').fire('click');
    expect(finish).toHaveBeenCalledOnce();
    expect(finish).toHaveBeenCalledWith({
      game: 'asteroid',
      correct: 2,
      attempted: 3,
      completed: true,
    });
  });
});
