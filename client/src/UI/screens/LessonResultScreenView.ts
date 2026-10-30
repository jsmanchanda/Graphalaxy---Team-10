import Konva from 'konva';
import {LessonResultScreenModel, UiAction, View} from '../types';
import {Group} from 'konva/lib/Group';
import {ButtonComponent, TextBoxComponent} from '../components';
import {
  OK_BUTTON_HEIGHT,
  OK_BUTTON_WIDTH,
  OK_BUTTON_X,
  OK_BUTTON_Y,
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

    this.group.add(okButton.getGroup());
    this.group.add(resultText.getGroup());
  }

  /**
   * asd
   * @returns Konva Group element
   */
  getGroup(): Group {
    return this.group;
  }
}
