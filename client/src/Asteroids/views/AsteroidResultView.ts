import Konva from 'konva';
import {
  AlienDialogue,
  ButtonComponent,
  ImageComponent,
  TextBoxComponent,
} from '../../UI/components';
import {
  ALIEN_FRIEND_WIDTH,
  ALIEN_FRIEND_X,
  ALIEN_FRIEND_Y,
  BUBBLE_HEIGHT,
  BUBBLE_WIDTH,
  BUBBLE_X,
  BUBBLE_Y,
  DEFAULT_ALIEN_IMAGE,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  RESULT_TEXT_HEIGHT,
  RESULT_TEXT_WIDTH,
  RESULT_TEXT_X,
  RESULT_TEXT_Y,
} from '../../UI/constants';
import type {View} from '../../UI/types';
import type {AsteroidMiniGameController} from '../AsteroidMiniGameController';
import {
  CONTINUE_BUTTON_HEIGHT,
  CONTINUE_BUTTON_WIDTH,
  CONTINUE_BUTTON_X,
  CONTINUE_BUTTON_Y,
  PANEL_FRAME_IMAGE,
} from '../constants';

// Wording for the result screen, kept here so it's easy to change.
const RESULT_DIALOGUE_TEXT = 'You reached the end of Asteroid Defense!';
const HINT_EARNED_TEXT = 'Hint earned!';
const NO_HINT_TEXT = 'No hint this time.';

/**
 * The asteroid minigame's last screen, laid out like the lesson result: the
 * score, whether a hint was earned, and a Continue button that hands control
 * back to the game. No retry.
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

    const alien = new ImageComponent(
      ALIEN_FRIEND_X,
      ALIEN_FRIEND_Y,
      ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_WIDTH,
      DEFAULT_ALIEN_IMAGE,
    );

    const border = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      PANEL_FRAME_IMAGE,
    );

    const alienDialogue = new AlienDialogue(
      BUBBLE_X,
      BUBBLE_Y,
      BUBBLE_WIDTH,
      BUBBLE_HEIGHT,
      RESULT_DIALOGUE_TEXT,
    );

    const resultText = new TextBoxComponent(
      RESULT_TEXT_X,
      RESULT_TEXT_Y,
      RESULT_TEXT_WIDTH,
      RESULT_TEXT_HEIGHT,
      `Score: ${model.score}/${model.questionCount}\n` +
        (model.earnedHint ? HINT_EARNED_TEXT : NO_HINT_TEXT),
    );

    const continueButton = new ButtonComponent(
      CONTINUE_BUTTON_X,
      CONTINUE_BUTTON_Y,
      CONTINUE_BUTTON_WIDTH,
      CONTINUE_BUTTON_HEIGHT,
      'Continue',
      () => controller.exit(),
    );

    // Back to front, like the lesson screens; AsteroidMiniGameView adds the
    // settings icon above all of this.
    this.group.add(
      alien.getGroup(),
      border.getGroup(),
      alienDialogue.getGroup(),
      resultText.getGroup(),
      continueButton.getGroup(),
    );
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
