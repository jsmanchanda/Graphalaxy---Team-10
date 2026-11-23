import Konva from 'konva';
import {LessonResultScreenModel, UiAction, View} from '../types';
import {Group} from 'konva/lib/Group';
import {
  AlienDialogue,
  ButtonComponent,
  ImageComponent,
  TextBoxComponent,
} from '../components';
import {
  ALIEN_FRIEND_WIDTH,
  ALIEN_FRIEND_X,
  ALIEN_FRIEND_Y,
  BUBBLE_HEIGHT,
  BUBBLE_WIDTH,
  BUBBLE_X,
  BUBBLE_Y,
  DEFAULT_PLANET_ID,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  OK_BUTTON_HEIGHT,
  OK_BUTTON_WIDTH,
  OK_BUTTON_X,
  OK_BUTTON_Y,
  REDO_BUTTON_HEIGHT,
  REDO_BUTTON_WIDTH,
  REDO_BUTTON_X,
  REDO_BUTTON_Y,
  RESULT_TEXT_HEIGHT,
  RESULT_TEXT_WIDTH,
  RESULT_TEXT_X,
  RESULT_TEXT_Y,
} from '../constants';

/**
 * Result of a certain question
 */
export class LessonResultScreenView implements View {
  private group: Konva.Group;

  /**
   * Constructor
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: LessonResultScreenModel,
  ) {
    this.group = new Konva.Group();

    const planetId = model.planetId ?? DEFAULT_PLANET_ID;

    const alien = new ImageComponent(
      ALIEN_FRIEND_X,
      ALIEN_FRIEND_Y,
      ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_WIDTH,
      `/assets/alien-planet-${planetId}.png`,
    );

    const background = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      `/assets/planet-background-${planetId}.jpg`,
    );

    const border = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      '/assets/general-nav.png',
    );

    const alienDialogue = new AlienDialogue(
      BUBBLE_X,
      BUBBLE_Y,
      BUBBLE_WIDTH,
      BUBBLE_HEIGHT,
      'You reached the end of the Lesson!',
    );

    const resultText = new TextBoxComponent(
      RESULT_TEXT_X,
      RESULT_TEXT_Y,
      RESULT_TEXT_WIDTH,
      RESULT_TEXT_HEIGHT,
      model.result,
    );

    const okButton = new ButtonComponent(
      OK_BUTTON_X,
      OK_BUTTON_Y,
      OK_BUTTON_WIDTH,
      OK_BUTTON_HEIGHT,
      'Ok',
      () => onAction({type: 'next'}),
    );

    // Asks to redo the planet; Game Manager shows a warning before it resets
    const redoButton = new ButtonComponent(
      REDO_BUTTON_X,
      REDO_BUTTON_Y,
      REDO_BUTTON_WIDTH,
      REDO_BUTTON_HEIGHT,
      'Redo Planet',
      () => onAction({type: 'retryLesson'}),
    );

    this.group.add(background.getGroup());
    this.group.add(alien.getGroup());
    this.group.add(border.getGroup());
    this.group.add(alienDialogue.getGroup());

    this.group.add(okButton.getGroup());
    this.group.add(redoButton.getGroup());
    this.group.add(resultText.getGroup());
  }

  /**
   * Getter for Konva Group
   * @returns Konva Group element
   */
  getGroup(): Group {
    return this.group;
  }
}
