/**
 * Screen types for Asteroid minigame navigation
 *
 * - 'AsteroidIntro': what is seen after mini game is triggered (before minigame start)
 * - 'AsteroidGame': the actual gameplay screen
 * - level: has levels 1, 2, 3 for increasing difficulty over the 3 questions
 * - 'AsteroidResult': summary after minigame over
 * - score: number of correctly answered questions, if 3/3 hint is granted
 */
export type Screen =
  | {type: 'AsteroidIntro'}
  | {type: 'AsteroidGame'; level: Difficulty}
  | {type: 'AsteroidResult'; score: number};

/**
 * Difficulty levels of each question
 */
export type Difficulty = 1 | 2 | 3;

/**
 * Point for where the asteroids are randomly generated
 * - x: x coordinate
 * - y: y coordinate
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * interface for a randomly positioned asteroid
 * - position: x, y coordinate point
 * - radius: the radius of the asteroid
 * - destroyed: to keep track of if the user-inputted graph hits the asteroid
 */
export interface Asteroid {
  position: Point;
  radius: number;
  destroyed: boolean;
}

/**
 * type of possible functions to be used to shoot asteroids
 */
export type FunctionType = 'linear' | 'quadratic' | 'cubic';

/**
 * The equation forms a question can use. Each id names its function type,
 * so linearStandard and quadraticStandard can't be mixed up.
 */
export type FormId =
  | 'linearSlopeIntercept'
  | 'linearPointSlope'
  | 'linearStandard' // should we include this? bring up w team lator
  | 'quadraticStandard'
  | 'quadraticVertex'
  | 'quadraticIntercept'
  | 'cubicStandard'
  | 'cubicIntercept';

/**
 * interface for AsteroidQuestion to be generated
 * - difficulty: Difficulty rating 1, 2, or 3
 * - formId: the FormId of the function form with fill in the blanks
 * - asteroids: the randomly generated asteroid(s)
 */
export interface AsteroidQuestion {
  difficulty: Difficulty;
  formId: FormId;
  asteroids: Asteroid[];
}
