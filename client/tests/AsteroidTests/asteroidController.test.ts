import {describe, expect, it, vi} from 'vitest';
import {AsteroidMiniGameController} from '../../src/Asteroids/AsteroidMiniGameController';
import {AsteroidMiniGameModel} from '../../src/Asteroids/AsteroidMiniGameModel';
import {ASTEROID_RADIUS} from '../../src/Asteroids/math/asteroids';
import type {
  Asteroid,
  AsteroidQuestion,
  Screen,
} from '../../src/Asteroids/types';

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
const MISSES = [
  ['0', '-5'],
  ['0', '0', '-5'],
  ['0', '0', '0', '-5'],
];

/**
 * A controller over knownQuestions, recording every screen it shows.
 */
function setup() {
  const shows: Screen[] = [];
  const finish = vi.fn();
  const controller = new AsteroidMiniGameController(
    screen => shows.push(screen),
    finish,
    new AsteroidMiniGameModel(knownQuestions()),
  );
  return {controller, shows, finish};
}

/**
 * Plays every question with the given answers, ending on the result screen.
 */
function playRun(controller: AsteroidMiniGameController, answers: string[][]) {
  controller.start();
  controller.launch();
  for (const texts of answers) {
    controller.fire(texts);
    controller.next();
  }
}

describe('AsteroidMiniGameController', () => {
  it('shows nothing until start, then the intro', () => {
    const {controller, shows} = setup();
    expect(shows).toEqual([]);

    controller.start();
    expect(shows).toEqual([{type: 'AsteroidIntro'}]);
  });

  it('shows intro, 3 questions, then the result, in order', () => {
    const {controller, shows} = setup();
    playRun(controller, HITS);

    expect(shows).toEqual([
      {type: 'AsteroidIntro'},
      {type: 'AsteroidGame', level: 1},
      {type: 'AsteroidGame', level: 2},
      {type: 'AsteroidGame', level: 3},
      {type: 'AsteroidResult', score: 3},
    ]);
  });

  it('puts the score on the result screen', () => {
    const {controller, shows} = setup();
    playRun(controller, [HITS[0], MISSES[1], HITS[2]]);
    expect(shows.at(-1)).toEqual({type: 'AsteroidResult', score: 2});
  });

  it.each([
    ['a blank field', ['', '1']],
    ['text that is not a number', ['abc', '1']],
    ['division by zero', ['1/0', '1']],
    ['too few fields', ['2']],
    ['too many fields', ['2', '1', '0']],
  ])('previews nothing for %s', (label, texts) => {
    const {controller} = setup();
    controller.start();
    controller.launch();
    expect(controller.preview(texts)).toBeNull();
  });

  it('previews the same curve as the model, accepting fractions and spaces', () => {
    const {controller} = setup();
    controller.start();
    controller.launch();
    expect(controller.preview([' 1 / 2 ', '-3'])).toBe(
      controller.model.preview([0.5, -3]),
    );
  });

  it('refuses to fire with an invalid field and records nothing', () => {
    const {controller} = setup();
    controller.start();
    controller.launch();

    expect(controller.fire(['', '1'])).toBeNull();
    expect(controller.model.hasFired).toBe(false);

    // The player can fix the input and still take their shot.
    expect(controller.fire(HITS[0])?.hit).toBe(true);
  });

  it('returns what the shot hit', () => {
    const {controller} = setup();
    controller.start();
    controller.launch();
    expect(controller.fire(MISSES[0])).toMatchObject({
      hit: false,
      hits: [false],
    });
    expect(controller.model.score).toBe(0);
  });

  it('allows only one shot per question', () => {
    const {controller} = setup();
    controller.start();
    controller.launch();
    controller.fire(MISSES[0]);
    expect(() => controller.fire(HITS[0])).toThrow();
  });

  it('does not move on before the question is fired', () => {
    const {controller, shows} = setup();
    controller.start();
    controller.launch();
    expect(() => controller.next()).toThrow();
    expect(shows).toHaveLength(2);
  });

  it('reports a perfect run once, on exit', () => {
    const {controller, finish} = setup();
    playRun(controller, HITS);
    expect(finish).not.toHaveBeenCalled();

    controller.exit();
    expect(finish).toHaveBeenCalledOnce();
    expect(finish).toHaveBeenCalledWith({
      game: 'asteroid',
      correct: 3,
      attempted: 3,
      completed: true,
    });
  });

  it('reports a run with one miss', () => {
    const {controller, finish} = setup();
    playRun(controller, [HITS[0], MISSES[1], HITS[2]]);
    controller.exit();
    expect(finish).toHaveBeenCalledWith({
      game: 'asteroid',
      correct: 2,
      attempted: 3,
      completed: true,
    });
  });

  it('does not report twice', () => {
    const {controller, finish} = setup();
    playRun(controller, HITS);
    controller.exit();
    expect(() => controller.exit()).toThrow();
    expect(finish).toHaveBeenCalledOnce();
  });

  it('builds its own model when none is passed in', () => {
    const controller = new AsteroidMiniGameController(
      () => {},
      () => {},
    );
    expect(controller.model.questionCount).toBe(3);
  });
});
