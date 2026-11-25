import Konva from 'konva';
import {QuestionResultScreenModel, UiAction, View} from '../types';
import {Group} from 'konva/lib/Group';
import {AlienDialogue, ButtonComponent, ImageComponent} from '../components';
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  DEFAULT_PLANET_ID,
  ALIEN_FRIEND_X,
  ALIEN_FRIEND_Y,
  ALIEN_FRIEND_WIDTH,
  BUBBLE_X,
  BUBBLE_Y,
  BUBBLE_HEIGHT,
  BUBBLE_WIDTH,
  QUESTION_RESULT_OK_X,
  QUESTION_RESULT_OK_HEIGHT,
  QUESTION_RESULT_OK_WIDTH,
  QUESTION_RESULT_OK_Y,
  SETTINGS_ICON_IMAGE,
  SETTINGS_ICON_SIZE,
  SETTINGS_ICON_X,
  SETTINGS_ICON_Y,
} from '../constants';

/**
 * Result of a certain question
 */
export class QuestionResultScreenView implements View {
  private group: Konva.Group;

  /**
   * Constructor
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: QuestionResultScreenModel,
  ) {
    this.group = new Konva.Group();

    const planetId = model.planetId ?? DEFAULT_PLANET_ID;

    const border = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      '/assets/general-nav.png',
    );
    const background = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      `/assets/planet-background-${planetId}.jpg`,
    );

    const alien = new ImageComponent(
      ALIEN_FRIEND_X,
      ALIEN_FRIEND_Y,
      ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_WIDTH,
      `/assets/alien-planet-${planetId}.png`,
    );

    const resultText = model.result ? 'Correct!' : 'Incorrect, nice try';

    const alienDialogue = new AlienDialogue(
      BUBBLE_X,
      BUBBLE_Y,
      BUBBLE_WIDTH,
      BUBBLE_HEIGHT,
      resultText,
    );

    const okButton = new ButtonComponent(
      QUESTION_RESULT_OK_X,
      QUESTION_RESULT_OK_Y,
      QUESTION_RESULT_OK_WIDTH,
      QUESTION_RESULT_OK_HEIGHT,
      'Ok',
      () => onAction({type: 'next'}),
    );

    const settingsIcon = new ImageComponent(
      SETTINGS_ICON_X,
      SETTINGS_ICON_Y,
      SETTINGS_ICON_SIZE,
      SETTINGS_ICON_SIZE,
      SETTINGS_ICON_IMAGE,
    );

    this.group.add(background.getGroup());
    this.group.add(alien.getGroup());
    this.group.add(border.getGroup());
    this.group.add(settingsIcon.getGroup());
    this.group.add(alienDialogue.getGroup());
    this.group.add(okButton.getGroup());
  }

  /**
   * Getter for Konva group
   * @returns Konva Group element
   */
  getGroup(): Group {
    return this.group;
  }
}
