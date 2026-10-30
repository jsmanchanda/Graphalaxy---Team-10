import Konva from 'konva';
import {LessonResultScreenModel, UiAction, View} from '../types';
import {Group} from 'konva/lib/Group';
import {TextBoxComponent} from '../components';

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

    const resultText = new TextBoxComponent(300, 200, 300, 200, model.result);

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
