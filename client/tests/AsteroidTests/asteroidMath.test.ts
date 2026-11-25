import {describe, expect, it} from 'vitest';
import {
  ASTEROID_RADIUS,
  COORDINATE_STEP,
  WINDOW_MAX,
  WINDOW_MIN,
  curveHitsAsteroid,
  generateQuestion,
} from '../../src/Asteroids/math/asteroids';
import {expressionToFunction} from '../../src/Asteroids/math/evaluate';
import {toExpression} from '../../src/Asteroids/math/forms';
import type {Asteroid, Difficulty} from '../../src/Asteroids/types';

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

const SEEDS = Array.from({length: 200}, (unused, i) => i + 1);

describe('expressionToFunction', () => {
  it('evaluates a toExpression result', () => {
    // y + 1 = 2(x + 3), so y = 2(x + 3) - 1
    const fn = expressionToFunction(
      toExpression('linearPointSlope', [2, -3, -1]),
    );
    expect(fn(-3)).toBe(-1);
    expect(fn(0)).toBe(5);
  });
});

describe('generateQuestion', () => {
  const difficulties: Array<[Difficulty, number]> = [
    [1, 1],
    [2, 2],
    [3, 2],
  ];

  it.each(difficulties)('difficulty %d has %d asteroid(s)', (d, count) => {
    for (const seed of SEEDS) {
      const question = generateQuestion(
        d,
        'linearSlopeIntercept',
        seededRng(seed),
      );
      expect(question.asteroids).toHaveLength(count);
    }
  });

  it.each([1, 2, 3] as Difficulty[])(
    'difficulty %d places asteroids on the half-step grid inside the window',
    d => {
      const min = WINDOW_MIN + ASTEROID_RADIUS;
      const max = WINDOW_MAX - ASTEROID_RADIUS;
      for (const seed of SEEDS) {
        const {asteroids} = generateQuestion(
          d,
          'linearSlopeIntercept',
          seededRng(seed),
        );
        for (const {position} of asteroids) {
          for (const value of [position.x, position.y]) {
            expect(value).toBeGreaterThanOrEqual(min);
            expect(value).toBeLessThanOrEqual(max);
            expect(Number.isInteger(value / COORDINATE_STEP)).toBe(true);
          }
        }
      }
    },
  );

  it('difficulty 2 always has an asteroid on an axis', () => {
    for (const seed of SEEDS) {
      const {asteroids} = generateQuestion(
        2,
        'linearPointSlope',
        seededRng(seed),
      );
      const onAxis = asteroids.some(
        ({position}) => position.x === 0 || position.y === 0,
      );
      expect(onAxis).toBe(true);
    }
  });

  it('can put the difficulty 2 asteroid on either axis', () => {
    const axes = new Set<string>();
    for (const seed of SEEDS) {
      const [first] = generateQuestion(
        2,
        'linearPointSlope',
        seededRng(seed),
      ).asteroids;
      axes.add(first.position.x === 0 ? 'y-axis' : 'x-axis');
    }
    expect(axes).toEqual(new Set(['x-axis', 'y-axis']));
  });

  it.each([2, 3] as Difficulty[])(
    'difficulty %d never shares an x, and centers are at least r1 + r2 apart',
    d => {
      for (const seed of SEEDS) {
        const [a, b] = generateQuestion(
          d,
          'linearSlopeIntercept',
          seededRng(seed),
        ).asteroids;
        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        expect(dx).not.toBe(0);
        expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(a.radius + b.radius);
      }
    },
  );

  it('can put the second asteroid in the column next to the first', () => {
    const gaps = SEEDS.map(seed => {
      const [a, b] = generateQuestion(
        3,
        'linearSlopeIntercept',
        seededRng(seed),
      ).asteroids;
      return Math.abs(a.position.x - b.position.x);
    });
    expect(gaps).toContain(COORDINATE_STEP);
  });

  it('passes through difficulty and formId and starts asteroids intact', () => {
    const question = generateQuestion(3, 'linearPointSlope', seededRng(1));
    expect(question.difficulty).toBe(3);
    expect(question.formId).toBe('linearPointSlope');
    for (const asteroid of question.asteroids) {
      expect(asteroid.radius).toBe(ASTEROID_RADIUS);
      expect(asteroid.destroyed).toBe(false);
    }
  });

  it.each([0, 1])(
    'stays in range and finishes when rng always returns %d',
    n => {
      for (const d of [1, 2, 3] as Difficulty[]) {
        const {asteroids} = generateQuestion(
          d,
          'linearSlopeIntercept',
          () => n,
        );
        for (const {position} of asteroids) {
          expect(Math.abs(position.x)).toBeLessThanOrEqual(
            WINDOW_MAX - ASTEROID_RADIUS,
          );
          expect(Math.abs(position.y)).toBeLessThanOrEqual(
            WINDOW_MAX - ASTEROID_RADIUS,
          );
        }
      }
    },
  );
});

describe('curveHitsAsteroid', () => {
  it('hits when the curve passes through the center', () => {
    // y = x² - 4 passes through (3, 5).
    expect(curveHitsAsteroid(x => x ** 2 - 4, asteroidAt(3, 5))).toBe(true);
  });

  it('hits when the curve passes inside the radius', () => {
    expect(curveHitsAsteroid(x => x + 0.4, asteroidAt(0, 0))).toBe(true);
  });

  it('misses when the curve is far away', () => {
    expect(curveHitsAsteroid(() => 3, asteroidAt(0, 0))).toBe(false);
  });

  it('misses when the curve is just outside the radius', () => {
    expect(curveHitsAsteroid(() => 0.51, asteroidAt(0, 0))).toBe(false);
  });

  it('uses perpendicular distance, not vertical distance', () => {
    // At x = 0 the gap is 1, but the line comes within 1/√5 ≈ 0.447.
    expect(curveHitsAsteroid(x => 2 * x + 1, asteroidAt(0, 0))).toBe(true);
  });

  it('detects a steep curve through the center', () => {
    expect(curveHitsAsteroid(x => 1000 * x, asteroidAt(0, 0))).toBe(true);
    expect(
      curveHitsAsteroid(x => 1000 * (x - 2) ** 3 + 4, asteroidAt(2, 4)),
    ).toBe(true);
  });

  it('misses a steep curve that only passes nearby outside the radius', () => {
    // A vertical-ish line at x ≈ 0.6 never gets within 0.5 of (0, 0).
    expect(curveHitsAsteroid(x => 1000 * (x - 0.6), asteroidAt(0, 0))).toBe(
      false,
    );
  });

  it('works for an asteroid at the edge of the window', () => {
    const edge = WINDOW_MAX - ASTEROID_RADIUS;
    expect(curveHitsAsteroid(() => edge, asteroidAt(edge, edge))).toBe(true);
    expect(curveHitsAsteroid(() => 0, asteroidAt(edge, edge))).toBe(false);
  });

  it('skips points where the function is not finite', () => {
    // 1/x is Infinity at x = 0, and NaN everywhere should simply miss.
    expect(() => curveHitsAsteroid(x => 1 / x, asteroidAt(0, 0))).not.toThrow();
    expect(curveHitsAsteroid(() => NaN, asteroidAt(0, 0))).toBe(false);
  });

  it('finds a closest point that falls between scan samples', () => {
    // Crosses the center at x = 0.0005, halfway between two 0.001 samples,
    // where both samples are about 500 away.
    expect(curveHitsAsteroid(x => 1e6 * (x - 0.0005), asteroidAt(0, 0))).toBe(
      true,
    );
  });

  it('misses a curve exactly one radius away, since a hit must be closer', () => {
    expect(curveHitsAsteroid(() => 0.5, asteroidAt(0, 0))).toBe(false);
  });

  it('hits a curve just inside the radius', () => {
    expect(curveHitsAsteroid(() => 0.499, asteroidAt(0, 0))).toBe(true);
  });

  it('finds a closest point that is not straight above or below the center', () => {
    // y = x² comes within √0.75 ≈ 0.866 of (0, 1), at x = ±√0.5, but the
    // gap straight below the center is 1.
    const center = {x: 0, y: 1};
    const withRadius = (radius: number): Asteroid => ({
      position: center,
      radius,
      destroyed: false,
    });
    expect(curveHitsAsteroid(x => x ** 2, withRadius(0.9))).toBe(true);
    expect(curveHitsAsteroid(x => x ** 2, withRadius(0.85))).toBe(false);
  });

  it('works with expressionToFunction and toExpression together', () => {
    // 2x + y = 2 crosses the x-axis at x = 1.
    const fn = expressionToFunction(toExpression('linearStandard', [2, 1, 2]));
    expect(curveHitsAsteroid(fn, asteroidAt(1, 0))).toBe(true);
    expect(curveHitsAsteroid(fn, asteroidAt(1, 5))).toBe(false);
  });
});
