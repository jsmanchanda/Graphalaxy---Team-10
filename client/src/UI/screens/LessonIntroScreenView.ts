import {Group} from 'konva/lib/Group';
import {LessonIntroScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {ButtonComponent, TextBoxComponent} from '../components';

/**
 * Reading task View
 */
export class LessonIntroScreenView implements View {
  private group: Konva.Group;

  /**
   * Constructs Screen View
   * @param onAction user action function
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: LessonIntroScreenModel,
  ) {
    this.group = new Konva.Group();

    const introText = new TextBoxComponent(200, 80, 40, 180, model.title);
    const descriptionText = new TextBoxComponent(
      0,
      0,
      200,
      200,
      model.description,
    );
    const nextButton = new ButtonComponent(300, 320, 200, 60, 'Next', () =>
      onAction({type: 'next'}),
    );

    this.group.add(introText.getGroup());
    this.group.add(descriptionText.getGroup());
    this.group.add(nextButton.getGroup());
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Group {
    return this.group;
  }
}
