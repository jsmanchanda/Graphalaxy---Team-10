import {AsteroidMiniGameModel} from './AsteroidMiniGameModel';
import {FORMS, parseCoefficient} from './math/forms';
import type {FireResult, MiniGameResult, Screen} from './types';

/**
 * controller of asteroid minigame - moves between the intro, game and result
 * screens, turns the player's text into numbers for the model, and reports
 * the result when the player leaves. It never builds views: it tells the root
 * view which Screen to show, and the views call its methods.
 */
export class AsteroidMiniGameController {
  /** The run's state; views read it, only the controller changes it. */
  readonly model: AsteroidMiniGameModel;
  private readonly show: (screen: Screen) => void;
  private readonly finish: (result: MiniGameResult) => void;
  private exited = false;

  /**
   * Sets up a run. Nothing is shown until start() is called.
   * @param show called with the new screen on every screen change
   * @param finish called once with the result when the player leaves
   * @param model the run's model; tests pass one with hand-made questions
   */
  constructor(
    show: (screen: Screen) => void,
    finish: (result: MiniGameResult) => void,
    model: AsteroidMiniGameModel = new AsteroidMiniGameModel(),
  ) {
    this.show = show;
    this.finish = finish;
    this.model = model;
  }

  /**
   * Shows the intro screen. Kept out of the constructor so the root view has
   * finished storing the controller before the first show call reaches it.
   */
  start(): void {
    this.show({type: 'AsteroidIntro'});
  }

  /** Intro "Launch" button: shows the first question. */
  launch(): void {
    this.showQuestion();
  }

  /**
   * Every input event: the curve for the targeting preview. The game view
   * enables Fire exactly when this is not null.
   * @param texts what the player typed, one per coefficient, in form order
   * @returns the expression to draw, or null while any field is blank or
   *   invalid
   */
  preview(texts: string[]): string | null {
    const coeffs = this.parse(texts);
    return coeffs === null ? null : this.model.preview(coeffs);
  }

  /**
   * Fire button: takes the current question's one shot.
   * @param texts what the player typed, one per coefficient, in form order
   * @returns what the shot hit, or null (and nothing recorded) if any field
   *   is invalid
   * @throws {Error} if this question was already fired
   */
  fire(texts: string[]): FireResult | null {
    const coeffs = this.parse(texts);
    return coeffs === null ? null : this.model.fire(coeffs);
  }

  /**
   * Next button: shows the next question, or the result screen after the
   * last one.
   * @throws {Error} if the question hasn't been fired yet
   */
  next(): void {
    if (this.model.isFinished) {
      this.show({type: 'AsteroidResult', score: this.model.score});
      return;
    }
    // Throws if the current question hasn't been fired.
    this.model.next();
    this.showQuestion();
  }

  /**
   * Result "Continue" button: reports the result and hands control back.
   * @throws {Error} if already called, so a double click can't report twice
   */
  exit(): void {
    if (this.exited) {
      throw new Error('The result was already reported');
    }
    this.exited = true;
    this.finish({
      game: 'asteroid',
      correct: this.model.score,
      attempted: this.model.questionCount,
      completed: true,
    });
  }

  /** Shows the game screen for the model's current question. */
  private showQuestion(): void {
    this.show({
      type: 'AsteroidGame',
      level: this.model.currentQuestion.difficulty,
    });
  }

  /**
   * Turns the player's text into coefficients for the current question.
   * @param texts what the player typed, one per coefficient, in form order
   * @returns the numbers, or null if the count is wrong, any field fails
   *   parseCoefficient, or the form can't use them (standard form's B = 0)
   */
  private parse(texts: string[]): number[] | null {
    const form = FORMS[this.model.currentQuestion.formId];
    if (texts.length !== form.coefficients.length) {
      return null;
    }
    const coeffs = texts.map(parseCoefficient);
    if (!coeffs.every((c): c is number => c !== null)) {
      return null;
    }
    // Treated like any other invalid field, so Fire stays dimmed instead of
    // toExpression throwing on every keystroke.
    return form.accepts?.(coeffs) === false ? null : coeffs;
  }
}
