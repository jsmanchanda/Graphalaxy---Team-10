import Konva from 'konva';
import {ButtonComponent, TextBoxComponent} from '../../UI/components';
import type {View} from '../../UI/types';
import type {AsteroidMiniGameController} from '../AsteroidMiniGameController';
import {AsteroidFieldComponent} from '../components/AsteroidFieldComponent';
import {
  CoefficientInputs,
  type CoefficientInputsHandle,
  type CoefficientInputsOptions,
} from '../components/CoefficientInputs';
import {
  EQUATION_ROW_HEIGHT,
  EQUATION_WIDTH,
  EQUATION_X,
  FIELD_SIZE,
  FIELD_X,
  FIELD_Y,
  FIRE_BUTTON_HEIGHT,
  FIRE_BUTTON_WIDTH,
  FIRE_BUTTON_X,
  FIRE_BUTTON_Y,
  HEADER_Y,
  INPUTS_Y,
  PANEL_BORDER_COLOR,
  PANEL_FILL_COLOR,
  PANEL_HEIGHT,
  PANEL_WIDTH,
  PANEL_X,
  PANEL_Y,
  SHOT_STATUS_HEIGHT,
  SHOT_STATUS_WIDTH,
  SHOT_STATUS_X,
  SHOT_STATUS_Y,
  TEMPLATE_Y,
} from '../constants';
import {FORMS} from '../math/forms';
import type {FireResult} from '../types';

// How dim the Fire button is while it can't be pressed.
const DISABLED_OPACITY = 0.5;
// Smaller than the default 20 so "Question 2/3 · Intercept form" fits.
const HEADER_FONT_SIZE = 14;

/** Builds the input row; the default makes real HTML inputs. */
export type CreateInputs = (
  options: CoefficientInputsOptions,
) => CoefficientInputsHandle;

/**
 * What the status box says after a shot.
 * @param shot what controller.fire returned
 * @returns "HIT!", "MISS", or e.g. "1 of 2 hit" for a partial hit
 */
function shotMessage(shot: FireResult): string {
  if (shot.hit) {
    return 'HIT!';
  }
  const hitCount = shot.hits.filter(Boolean).length;
  return hitCount === 0 ? 'MISS' : `${hitCount} of ${shot.hits.length} hit`;
}

/**
 * The cockpit screen for one question: the window with the asteroids, and a
 * control panel with the form, the coefficient boxes and Fire. After the
 * shot, Fire turns into Next (or Results on the last question).
 */
export class AsteroidGameView implements View {
  private readonly group = new Konva.Group();
  private readonly controller: AsteroidMiniGameController;
  private readonly field: AsteroidFieldComponent;
  private readonly status: TextBoxComponent;
  private readonly fireButton: ButtonComponent;
  private readonly nextButton: ButtonComponent;
  private readonly inputs: CoefficientInputsHandle;
  private canFire = false;
  private fired = false;

  /**
   * Builds the screen for the controller's current question.
   * @param controller the run's controller; the view reads its model and
   *   calls preview, fire and next
   * @param createInputs builds the coefficient boxes; tests pass a fake
   */
  constructor(
    controller: AsteroidMiniGameController,
    createInputs: CreateInputs = options => new CoefficientInputs(options),
  ) {
    this.controller = controller;
    const {model} = controller;
    const question = model.currentQuestion;
    const form = FORMS[question.formId];

    // Decoration only; drawn first so everything sits on top of it.
    const panel = new Konva.Rect({
      x: PANEL_X,
      y: PANEL_Y,
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      fill: PANEL_FILL_COLOR,
      stroke: PANEL_BORDER_COLOR,
    });

    this.field = new AsteroidFieldComponent(
      FIELD_X,
      FIELD_Y,
      FIELD_SIZE,
      question.asteroids,
    );

    const header = new TextBoxComponent(
      EQUATION_X,
      HEADER_Y,
      EQUATION_WIDTH,
      EQUATION_ROW_HEIGHT,
      `Question ${model.questionNumber}/${model.questionCount} · ${form.name}`,
    ).setFontSize(HEADER_FONT_SIZE);

    const template = new TextBoxComponent(
      EQUATION_X,
      TEMPLATE_Y,
      EQUATION_WIDTH,
      EQUATION_ROW_HEIGHT,
      form.template,
    );

    this.status = new TextBoxComponent(
      SHOT_STATUS_X,
      SHOT_STATUS_Y,
      SHOT_STATUS_WIDTH,
      SHOT_STATUS_HEIGHT,
      '',
    );

    this.fireButton = new ButtonComponent(
      FIRE_BUTTON_X,
      FIRE_BUTTON_Y,
      FIRE_BUTTON_WIDTH,
      FIRE_BUTTON_HEIGHT,
      'Fire',
      () => this.fire(),
    );
    this.fireButton.getGroup().opacity(DISABLED_OPACITY);

    // Same spot as Fire; shown once the shot is taken.
    this.nextButton = new ButtonComponent(
      FIRE_BUTTON_X,
      FIRE_BUTTON_Y,
      FIRE_BUTTON_WIDTH,
      FIRE_BUTTON_HEIGHT,
      model.isLastQuestion ? 'Results' : 'Next',
      () => controller.next(),
    );
    this.nextButton.getGroup().visible(false);

    this.group.add(
      panel,
      this.field.getGroup(),
      header.getGroup(),
      template.getGroup(),
      this.status.getGroup(),
      this.fireButton.getGroup(),
      this.nextButton.getGroup(),
    );

    this.inputs = createInputs({
      letters: form.coefficients,
      x: EQUATION_X,
      y: INPUTS_Y,
      onInput: values => this.updateFire(values),
      onEnter: () => this.fire(),
    });
    this.inputs.focus();

    // UiManager or the root view destroys the group when the screen changes;
    // the HTML boxes aren't part of it, so remove them too.
    this.group.on('destroy', () => this.inputs.remove());
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Konva.Group {
    return this.group;
  }

  /**
   * Enables Fire exactly when every box holds a valid number.
   * @param values what is typed in each box
   */
  private updateFire(values: string[]): void {
    if (this.fired) {
      return;
    }
    this.canFire = this.controller.preview(values) !== null;
    this.fireButton.getGroup().opacity(this.canFire ? 1 : DISABLED_OPACITY);
    this.group.getLayer()?.batchDraw();
  }

  /** Takes the shot, if Fire is enabled, and shows what it hit. */
  private fire(): void {
    if (this.fired || !this.canFire) {
      return;
    }
    const shot = this.controller.fire(this.inputs.values());
    if (shot === null) {
      return;
    }
    this.fired = true;

    this.field.showShot(shot);
    this.inputs.disable();
    this.status.setText(shotMessage(shot));
    this.fireButton.getGroup().visible(false);
    this.nextButton.getGroup().visible(true);
    this.group.getLayer()?.batchDraw();
  }
}
