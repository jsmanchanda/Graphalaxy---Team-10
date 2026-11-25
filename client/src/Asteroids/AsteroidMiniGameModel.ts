import {curveHitsAsteroid, generateQuestion} from './math/asteroids';
import {expressionToFunction} from './math/evaluate';
import {pickForm, toExpression} from './math/forms';
import type {
  AsteroidQuestion,
  Difficulty,
  FireResult,
  FunctionType,
} from './types';

// Linear only for now; put 'quadratic' / 'cubic' back here when those forms return.
const QUESTION_TYPES: FunctionType[] = ['linear', 'linear', 'linear'];
const DIFFICULTIES: Difficulty[] = [1, 2, 3];

/**
 * Builds one run's questions: question i gets DIFFICULTIES[i] and a random
 * form of type QUESTION_TYPES[i]. Each question picks its form on its own, so
 * a form can come up more than once in a run.
 * @param rng random function, returns a number in [0, 1)
 * @returns the questions, in the order they are asked
 */
export function generateQuestions(rng: () => number): AsteroidQuestion[] {
  return QUESTION_TYPES.map((type, i) =>
    generateQuestion(DIFFICULTIES[i], pickForm(type, rng), rng),
  );
}

/**
 * model of asteroid minigame - just the state of the game, view reads the state to display, controller parses user input
 */
export class AsteroidMiniGameModel {
  private readonly questions: AsteroidQuestion[];
  private index = 0;
  // One entry per fired question: true if every asteroid was hit.
  private readonly results: boolean[] = [];

  /**
   * Starts an asteroids run (3 questions)
   * @param questions the questions to ask; tests pass hand-made ones
   * @throws {Error} if there are no questions
   */
  constructor(questions: AsteroidQuestion[] = generateQuestions(Math.random)) {
    if (questions.length === 0) {
      throw new Error('A run needs at least one question');
    }
    this.questions = questions;
  }

  /** The question being asked now. */
  get currentQuestion(): AsteroidQuestion {
    return this.questions[this.index];
  }

  /** Which question is being asked, starting at 1, e.g. for "Question 2/3". */
  get questionNumber(): number {
    return this.index + 1;
  }

  /** How many questions the run has. */
  get questionCount(): number {
    return this.questions.length;
  }

  /** Whether the current question has used its one shot. */
  get hasFired(): boolean {
    return this.results.length > this.index;
  }

  /** Whether the current question is the last one. */
  get isLastQuestion(): boolean {
    return this.index === this.questions.length - 1;
  }

  /** Whether the last question has been fired, so the run is over. */
  get isFinished(): boolean {
    return this.results.length === this.questions.length;
  }

  /** How many questions were answered correctly so far. */
  get score(): number {
    return this.results.filter(Boolean).length;
  }

  /** Whether every question was answered correctly. */
  get earnedHint(): boolean {
    return this.score === this.questions.length;
  }

  /**
   * The curve for the targeting preview. Changes no state, so it can be
   * called on every input before firing.
   * @param coeffs parsed coefficients for the current question's form
   * @returns the expression to draw on the preview screen
   * @throws {Error} if the coefficients are invalid for the form
   */
  preview(coeffs: number[]): string {
    return toExpression(this.currentQuestion.formId, coeffs);
  }

  /**
   * Fires the current question's one shot: checks each asteroid, marks the
   * hit ones destroyed and records whether all of them were hit.
   * @param coeffs parsed coefficients for the current question's form
   * @returns what the shot hit, and the curve to draw on the window
   * @throws {Error} if this question was already fired, or the coefficients
   *   are invalid (nothing is recorded then, so the player can fire again)
   */
  fire(coeffs: number[]): FireResult {
    if (this.hasFired) {
      throw new Error(`Question ${this.questionNumber} was already fired`);
    }

    // Build the expression first, so bad input throws before any state changes.
    const expression = toExpression(this.currentQuestion.formId, coeffs);
    const fn = expressionToFunction(expression);

    const asteroids = this.currentQuestion.asteroids;
    const hits = asteroids.map(asteroid => curveHitsAsteroid(fn, asteroid));
    asteroids.forEach((asteroid, i) => {
      if (hits[i]) {
        asteroid.destroyed = true;
      }
    });

    const hit = hits.every(Boolean);
    this.results.push(hit);
    return {hit, hits, expression};
  }

  /**
   * Moves to the next question. When isFinished is true, the controller
   * shows the result screen instead of calling this.
   * @throws {Error} if the current question hasn't been fired, or it is the
   *   last question
   */
  next(): void {
    if (!this.hasFired) {
      throw new Error(`Question ${this.questionNumber} hasn't been fired yet`);
    }
    if (this.isLastQuestion) {
      throw new Error('There is no question after the last one');
    }
    this.index++;
  }
}
