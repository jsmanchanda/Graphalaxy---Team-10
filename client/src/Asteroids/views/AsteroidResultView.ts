import Konva from 'konva';
import {ButtonComponent, TextBoxComponent} from '../../UI/components';
import {
  OK_BUTTON_HEIGHT,
  OK_BUTTON_WIDTH,
  OK_BUTTON_X,
  OK_BUTTON_Y,
  RESULT_TEXT_HEIGHT,
  RESULT_TEXT_WIDTH,
  RESULT_TEXT_X,
  RESULT_TEXT_Y,
} from '../../UI/constants';
import type {View} from '../../UI/types';
import type {AsteroidMiniGameController} from '../AsteroidMiniGameController';

// Wording for the result screen, kept here so it's easy to change.
const HINT_EARNED_TEXT = 'Hint earned!';
const NO_HINT_TEXT = 'No hint this time.';

/**
 * The asteroid minigame's last screen: the score, whether a hint was earned,
 * and a Continue button that hands control back to the game. No retry.
 */
export class AsteroidResultView implements View {
  private readonly group: Konva.Group;

  /**
   * Builds the result screen for a finished run.
   * @param controller the run's controller; the view reads its model and
   *   calls exit on Continue
   */
  constructor(controller: AsteroidMiniGameController) {
    this.group = new Konva.Group();
    const {model} = controller;

    const resultText = new TextBoxComponent(
      RESULT_TEXT_X,
      RESULT_TEXT_Y,
      RESULT_TEXT_WIDTH,
      RESULT_TEXT_HEIGHT,
      `Score: ${model.score}/${model.questionCount}\n` +
        (model.earnedHint ? HINT_EARNED_TEXT : NO_HINT_TEXT),
    );

    const continueButton = new ButtonComponent(
      OK_BUTTON_X,
      OK_BUTTON_Y,
      OK_BUTTON_WIDTH,
      OK_BUTTON_HEIGHT,
      'Continue',
      () => controller.exit(),
    );

    this.group.add(resultText.getGroup(), continueButton.getGroup());
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
