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
 * (linear only for now; 'quadratic' and 'cubic' are off with their forms)
 */
export type FunctionType = 'linear'; // | 'quadratic' | 'cubic'

/**
 * The equation forms a question can use. Each id names its function type,
 * so linearStandard and quadraticStandard can't be mixed up.
 */
export type FormId =
  | 'linearSlopeIntercept'
  | 'linearPointSlope'
  // Off for now, the minigame is linear only:
  // | 'quadraticStandard'
  // | 'quadraticVertex'
  // | 'quadraticIntercept'
  // | 'cubicStandard'
  // | 'cubicIntercept'
  | 'linearStandard';

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

/**
 * the shape of the forms table entry
 */
export interface FormDefinition {
  type: FunctionType;
  name: string; // "Vertex form"
  template: string; // "y = a(x - h)² + k"
  coefficients: string[]; // ['a', 'h', 'k']
  toExpression: (c: number[]) => string;
  // false for coefficients the form can't use (standard form's B = 0)
  accepts?: (c: number[]) => boolean;
}

/**
 * what one shot did, for the view
 * - hit: true if every asteroid in the question was hit
 * - hits: one entry per asteroid, in the same order as question.asteroids
 * - expression: the curve to draw with GraphComponent.addFunction
 */
export interface FireResult {
  hit: boolean;
  hits: boolean[];
  expression: string;
}

/**
 * which minigame a result came from
 * TODO: move to shared/src/api.ts once the hint contract is agreed
 */
export type MiniGameId = 'asteroid' | 'radioWave';

/**
 * what happened in one minigame run, sent once when the player leaves it
 * - game: which minigame was played
 * - correct: questions answered correctly
 * - attempted: questions answered
 * - completed: false if the player left before the end
 * TODO: move to shared/src/api.ts once the hint contract is agreed
 */
export interface MiniGameResult {
  game: MiniGameId;
  correct: number;
  attempted: number;
  completed: boolean;
}
