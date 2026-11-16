import type {
  Asteroid,
  AsteroidQuestion,
  Difficulty,
  FormId,
  Point,
} from '../types';

// hardcoded graph window for now. TODO: revisit for differing window sizes
export const WINDOW_MIN = -10;
export const WINDOW_MAX = 10;

export const ASTEROID_RADIUS = 0.5;

// asteroid positions rounded to the nearest half for simplicity
export const COORDINATE_STEP = 0.5;

// x step for scanning the curve when looking for its closest point to an asteroid.
const SAMPLE_STEP = 0.001;

// Golden-section steps per local minimum; shrinks the bracket far below float noise.
const REFINE_ITERATIONS = 40;
const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;

// all possible spawn coordinates, limits center to be .5 units away from each edge so asteroids dont get clipped
const SPAWN_VALUES: number[] = (() => {
  const min = WINDOW_MIN + ASTEROID_RADIUS;
  const max = WINDOW_MAX - ASTEROID_RADIUS;
  const count = Math.round((max - min) / COORDINATE_STEP) + 1;
  return Array.from({length: count}, (unused, i) => min + i * COORDINATE_STEP);
})();

/**
 * helper function to randomly select a possible spawn value on .5 sized steps
 * @param values the values to choose from, must not be empty
 * @param rng random function, returns a number in [0, 1)
 * @returns one of the values
 */
function pickFrom(values: number[], rng: () => number): number {
  // min() guards against an rng that returns exactly 1.
  const index = Math.min(Math.floor(rng() * values.length), values.length - 1);
  return values[index];
}

/**
 * A random point on the .5 step spawn grid.
 * @param rng random function, returns a number in [0, 1)
 * @returns the point
 */
function randomPoint(rng: () => number): Point {
  return {x: pickFrom(SPAWN_VALUES, rng), y: pickFrom(SPAWN_VALUES, rng)};
}

/**
 * A random point on the x-axis OR the y-axis
 * @param rng random function, returns a number in [0, 1)
 * @returns a point with x = 0 or y = 0
 */
function randomAxisPoint(rng: () => number): Point {
  const onVerticalAxis = rng() < 0.5;
  const value = pickFrom(SPAWN_VALUES, rng);
  return onVerticalAxis ? {x: 0, y: value} : {x: value, y: 0};
}

/**
 * A random point for the second asteroid:
 * - x is anything but the first point's x, since a function can't pass
 *   through two points with the same x
 * - the centers are at least firstRadius + secondRadius apart, so the
 *   asteroids don't overlap
 * @param first the question's other asteroid position
 * @param firstRadius the other asteroid's radius
 * @param secondRadius the new asteroid's radius
 * @param rng random function, returns a number in [0, 1)
 * @returns the second point
 */
function secondPoint(
  first: Point,
  firstRadius: number,
  secondRadius: number,
  rng: () => number,
): Point {
  const minDistance = firstRadius + secondRadius;
  const fits = (x: number, y: number) =>
    Math.hypot(x - first.x, y - first.y) >= minDistance;

  // x1 can never = x2, otherwise thats not a function
  const allowedX = SPAWN_VALUES.filter(
    x => x !== first.x && SPAWN_VALUES.some(y => fits(x, y)),
  );
  const x = pickFrom(allowedX, rng);
  const y = pickFrom(
    SPAWN_VALUES.filter(y => fits(x, y)),
    rng,
  );
  return {x, y};
}

/**
 * turns a position into an asteroid object
 * @param position the asteroid's center
 * @returns the asteroid
 */
function makeAsteroid(position: Point): Asteroid {
  return {position, radius: ASTEROID_RADIUS, destroyed: false};
}

/**
 * Generates one question's asteroids for the given difficulty:
 * - 1: one random asteroid
 * - 2: two asteroids, one of them on an axis
 * - 3: two random asteroids
 * @param difficulty the question's difficulty
 * @param formId the form the player must use, picked by the model
 * @param rng random function, returns a number in [0, 1)
 * @returns the question
 */
export function generateQuestion(
  difficulty: Difficulty,
  formId: FormId,
  rng: () => number,
): AsteroidQuestion {
  const positions: Point[] = [];
  if (difficulty === 1) {
    positions.push(randomPoint(rng));
  } else {
    // if difficult is 2, random axis point, if 3, random point (may or may not be on axis)
    const first = difficulty === 2 ? randomAxisPoint(rng) : randomPoint(rng);
    // second asteroid center
    positions.push(
      first,
      secondPoint(first, ASTEROID_RADIUS, ASTEROID_RADIUS, rng),
    );
  }

  return {difficulty, formId, asteroids: positions.map(makeAsteroid)};
}

/**
 * Squared distance from a point to the curve's point at x, squared so no
 * sqrt is needed when comparing.
 * @param fn the curve's function
 * @param p the point, e.g. an asteroid's center
 * @param x where on the curve to measure
 * @returns the squared distance, or Infinity where fn(x) is not finite
 *   (e.g. division by zero), since the curve has no point there
 */
function distanceSquared(
  fn: (x: number) => number,
  p: Point,
  x: number,
): number {
  const y = fn(x);
  return Number.isFinite(y) ? (x - p.x) ** 2 + (y - p.y) ** 2 : Infinity;
}

/**
 * Golden-section search for the smallest value of f between lo and hi.
 * Assumes f has a single dip there, which holds near a local minimum.
 * @param f the function to minimize
 * @param lo left end of the search
 * @param hi right end of the search
 * @returns the smallest value of f found
 */
function refineMinimum(
  f: (x: number) => number,
  lo: number,
  hi: number,
): number {
  let a = lo;
  let b = hi;
  let c = b - GOLDEN_RATIO * (b - a);
  let d = a + GOLDEN_RATIO * (b - a);
  let fc = f(c);
  let fd = f(d);
  let best = Math.min(fc, fd);

  for (let i = 0; i < REFINE_ITERATIONS; i++) {
    // Keep the side with the smaller value; reuse one point each step.
    if (fc <= fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - GOLDEN_RATIO * (b - a);
      fc = f(c);
      best = Math.min(best, fc);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + GOLDEN_RATIO * (b - a);
      fd = f(d);
      best = Math.min(best, fd);
    }
  }
  return best;
}

/**
 * Checks whether the curve y = fn(x) hits the asteroid: a hit is when the
 * minimum distance from the asteroid's center to the curve is less than its
 * radius. Only x values within one radius of the center can come that close,
 * so only that part of the curve is checked:
 * 1. scan the distance every SAMPLE_STEP
 * 2. at each sample that is a local minimum, search between its neighbors
 *    for the true closest point, which can fall between samples
 * @param fn the player's function, from expressionToFunction
 * @param asteroid the asteroid to test
 * @returns true if the curve hits the asteroid
 */
export function curveHitsAsteroid(
  fn: (x: number) => number,
  asteroid: Asteroid,
): boolean {
  const center = asteroid.position;
  const radiusSquared = asteroid.radius ** 2;
  const distanceAt = (x: number) => distanceSquared(fn, center, x);

  const start = Math.max(WINDOW_MIN, center.x - asteroid.radius);
  const end = Math.min(WINDOW_MAX, center.x + asteroid.radius);
  const steps = Math.ceil((end - start) / SAMPLE_STEP);
  const xs = Array.from({length: steps + 1}, (unused, i) =>
    Math.min(start + i * SAMPLE_STEP, end),
  );
  const distances = xs.map(distanceAt);

  if (distances.some(d => d < radiusSquared)) {
    return true;
  }

  for (let i = 0; i < xs.length; i++) {
    const d = distances[i];
    const left = distances[i - 1] ?? Infinity;
    const right = distances[i + 1] ?? Infinity;
    if (!Number.isFinite(d) || d > left || d > right) {
      continue;
    }
    const lo = xs[Math.max(i - 1, 0)];
    const hi = xs[Math.min(i + 1, xs.length - 1)];
    if (refineMinimum(distanceAt, lo, hi) < radiusSquared) {
      return true;
    }
  }
  return false;
}
