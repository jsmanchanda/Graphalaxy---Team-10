import Konva from 'konva';
import {QuestionResultScreenModel, UiAction, View} from '../types';
import {Group} from 'konva/lib/Group';
import {TextBoxComponent} from '../components';

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

    const resultText = new TextBoxComponent(0, 0, 100, 100, model.result);

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
