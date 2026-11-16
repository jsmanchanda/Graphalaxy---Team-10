import {describe, expect, it} from 'vitest';
import {
  AsteroidMiniGameModel,
  generateQuestions,
} from '../../src/Asteroids/AsteroidMiniGameModel';
import {ASTEROID_RADIUS} from '../../src/Asteroids/math/asteroids';
import {expressionToFunction} from '../../src/Asteroids/math/evaluate';
import {FORMS} from '../../src/Asteroids/math/forms';
import type {Asteroid, AsteroidQuestion} from '../../src/Asteroids/types';

/**
 * A small seeded random number generator (mulberry32), so each test run
 * generates the same questions.
 */
function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An asteroid at (x, y) with the default radius. */
function asteroidAt(x: number, y: number): Asteroid {
  return {position: {x, y}, radius: ASTEROID_RADIUS, destroyed: false};
}

/**
 * Hand-made questions with known answers. Built fresh for every test, since
 * firing marks asteroids destroyed.
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

const HITS = [
  [2, 1],
  [1, 0, 1],
  [1, 0, 0, 0],
];
const MISSES = [
  [0, -5],
  [0, 0, -5],
  [0, 0, 0, -5],
];

describe('generateQuestions', () => {
  const seeds = Array.from({length: 50}, (unused, i) => i + 1);

  it('makes 3 questions with difficulties 1, 2, 3', () => {
    for (const seed of seeds) {
      const questions = generateQuestions(seededRng(seed));
      expect(questions.map(q => q.difficulty)).toEqual([1, 2, 3]);
    }
  });

  it('uses a linear, then a quadratic, then a cubic form', () => {
    for (const seed of seeds) {
      const questions = generateQuestions(seededRng(seed));
      expect(questions.map(q => FORMS[q.formId].type)).toEqual([
        'linear',
        'quadratic',
        'cubic',
      ]);
    }
  });

  it('has 1, 2 and 2 asteroids', () => {
    for (const seed of seeds) {
      const questions = generateQuestions(seededRng(seed));
      expect(questions.map(q => q.asteroids.length)).toEqual([1, 2, 2]);
    }
  });
});

describe('AsteroidMiniGameModel', () => {
  it('starts on question 1 with nothing fired', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    expect(model.questionNumber).toBe(1);
    expect(model.questionCount).toBe(3);
    expect(model.currentQuestion.formId).toBe('linearSlopeIntercept');
    expect(model.hasFired).toBe(false);
    expect(model.isLastQuestion).toBe(false);
    expect(model.isFinished).toBe(false);
    expect(model.score).toBe(0);
    expect(model.earnedHint).toBe(false);
  });

  it('generates its own questions when none are passed in', () => {
    const model = new AsteroidMiniGameModel();
    expect(model.questionCount).toBe(3);
  });

  it('throws when given no questions', () => {
    expect(() => new AsteroidMiniGameModel([])).toThrow();
  });

  it('records a hit and marks the asteroid destroyed', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    const result = model.fire(HITS[0]);

    expect(result.hit).toBe(true);
    expect(result.hits).toEqual([true]);
    expect(expressionToFunction(result.expression)(1)).toBeCloseTo(3);
    expect(model.currentQuestion.asteroids[0].destroyed).toBe(true);
    expect(model.hasFired).toBe(true);
    expect(model.score).toBe(1);
  });

  it('records a miss and leaves the asteroid intact', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    const result = model.fire(MISSES[0]);

    expect(result.hit).toBe(false);
    expect(result.hits).toEqual([false]);
    expect(model.currentQuestion.asteroids[0].destroyed).toBe(false);
    expect(model.hasFired).toBe(true);
    expect(model.score).toBe(0);
  });

  it('counts a partial hit as wrong but destroys the asteroid it hit', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    model.fire(HITS[0]);
    model.next();

    // y = 1 passes through (0, 1) but not (1, 2).
    const result = model.fire([0, 0, 1]);
    expect(result.hit).toBe(false);
    expect(result.hits).toEqual([true, false]);
    expect(model.currentQuestion.asteroids.map(a => a.destroyed)).toEqual([
      true,
      false,
    ]);
    expect(model.score).toBe(1);
  });

  it('allows only one shot per question', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    model.fire(MISSES[0]);
    expect(() => model.fire(HITS[0])).toThrow();
    expect(model.score).toBe(0);
  });

  it('records nothing when the coefficients are invalid', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    expect(() => model.fire([2])).toThrow();
    expect(() => model.fire([NaN, 1])).toThrow();
    expect(model.hasFired).toBe(false);

    // The player can fix the input and still take their shot.
    expect(model.fire(HITS[0]).hit).toBe(true);
  });

  it('previews the same curve that fire uses, without changing state', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    const previews = [
      model.preview([1, 1]),
      model.preview([0, 4]),
      model.preview(HITS[0]),
    ];

    expect(model.hasFired).toBe(false);
    expect(model.score).toBe(0);
    expect(model.currentQuestion.asteroids[0].destroyed).toBe(false);
    expect(model.fire(HITS[0]).expression).toBe(previews[2]);
  });

  it('rejects invalid coefficients in the preview too', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    expect(() => model.preview([1, 2, 3])).toThrow();
  });

  it('does not move on before the current question is fired', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    expect(() => model.next()).toThrow();
    expect(model.questionNumber).toBe(1);
  });

  it('does not move past the last question', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    for (const coeffs of HITS.slice(0, -1)) {
      model.fire(coeffs);
      model.next();
    }
    model.fire(HITS[2]);
    expect(model.isLastQuestion).toBe(true);
    expect(() => model.next()).toThrow();
  });

  it('earns a hint when all 3 questions are hit', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    HITS.forEach((coeffs, i) => {
      expect(model.questionNumber).toBe(i + 1);
      expect(model.isFinished).toBe(false);
      expect(model.fire(coeffs).hit).toBe(true);
      if (!model.isLastQuestion) {
        model.next();
      }
    });

    expect(model.isFinished).toBe(true);
    expect(model.score).toBe(3);
    expect(model.earnedHint).toBe(true);
  });

  it('does not earn a hint with one miss', () => {
    const model = new AsteroidMiniGameModel(knownQuestions());
    [HITS[0], MISSES[1], HITS[2]].forEach(coeffs => {
      model.fire(coeffs);
      if (!model.isLastQuestion) {
        model.next();
      }
    });

    expect(model.isFinished).toBe(true);
    expect(model.score).toBe(2);
    expect(model.earnedHint).toBe(false);
  });
});
