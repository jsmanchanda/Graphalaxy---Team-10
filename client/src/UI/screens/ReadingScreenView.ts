import {Group} from 'konva/lib/Group';
import {ReadingScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {ButtonComponent, TextBoxComponent} from '../components';

/**
 * Reading task View
 */
export class ReadingScreenView implements View {
  private group: Konva.Group;

  /**
   * Constructs Screen View
   * @param onAction user action function
   */
  constructor(onAction: (action: UiAction) => void, model: ReadingScreenModel) {
    this.group = new Konva.Group();

    const readingText = new TextBoxComponent(0, 0, 500, 400, model.readingText);

    const nextButton = new ButtonComponent(300, 320, 200, 60, 'Next', () =>
      onAction({type: 'next'}),
    );

    const backButton = new ButtonComponent(300, 320, 200, 60, 'Back', () =>
      onAction({type: 'back'}),
    );

    this.group.add(readingText.getGroup());
    this.group.add(nextButton.getGroup());
    this.group.add(backButton.getGroup());
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Group {
    return this.group;
  }
}
