import {Group} from 'konva/lib/Group';
import {ReadingScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {ButtonComponent, TextBoxComponent} from '../components';
import {
  BACK_BUTTON_HEIGHT,
  BACK_BUTTON_WIDTH,
  BACK_BUTTON_X,
  BACK_BUTTON_Y,
  NEXT_BUTTON_HEIGHT,
  NEXT_BUTTON_WIDTH,
  NEXT_BUTTON_X,
  NEXT_BUTTON_Y,
  READING_TEXT_HEIGHT,
  READING_TEXT_WIDTH,
  READING_TEXT_X,
  READING_TEXT_Y,
  VISUAL_READING_GRAPH_HEIGHT,
  VISUAL_READING_GRAPH_WIDTH,
  VISUAL_READING_GRAPH_X,
  VISUAL_READING_GRAPH_Y,
  VISUAL_READING_TEXT_HEIGHT,
  VISUAL_READING_TEXT_WIDTH,
  VISUAL_READING_TEXT_X,
  VISUAL_READING_TEXT_Y,
} from '../constants';
import {GraphComponent} from '../../Graphing/GraphComponent';

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

    const nextButton = new ButtonComponent(
      NEXT_BUTTON_X,
      NEXT_BUTTON_Y,
      NEXT_BUTTON_WIDTH,
      NEXT_BUTTON_HEIGHT,
      'Next',
      () => onAction({type: 'next'}),
    );

    const backButton = new ButtonComponent(
      BACK_BUTTON_X,
      BACK_BUTTON_Y,
      BACK_BUTTON_WIDTH,
      BACK_BUTTON_HEIGHT,
      'back',
      () => onAction({type: 'back'}),
    );

    // change view based on if it shows a graph or not
    let readingText: TextBoxComponent;
    if (model.equation) {
      const graphComponent = new GraphComponent(
        VISUAL_READING_GRAPH_X,
        VISUAL_READING_GRAPH_Y,
        VISUAL_READING_GRAPH_WIDTH,
        VISUAL_READING_GRAPH_HEIGHT,
      );

      readingText = new TextBoxComponent(
        VISUAL_READING_TEXT_X,
        VISUAL_READING_TEXT_Y,
        VISUAL_READING_TEXT_WIDTH,
        VISUAL_READING_TEXT_HEIGHT,
        model.readingText,
      );
      this.group.add(graphComponent.getGroup());
    } else {
      readingText = new TextBoxComponent(
        READING_TEXT_X,
        READING_TEXT_Y,
        READING_TEXT_WIDTH,
        READING_TEXT_HEIGHT,
        model.readingText,
      );
    }

    this.group.add(nextButton.getGroup());
    this.group.add(backButton.getGroup());

    this.group.add(readingText.getGroup());
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Group {
    return this.group;
  }
}
