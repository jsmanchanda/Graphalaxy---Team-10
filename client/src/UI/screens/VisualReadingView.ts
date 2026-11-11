import {Group} from 'konva/lib/Group';
import {VisualReadingScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {ButtonComponent, TextBoxComponent} from '../components';
import {GraphComponent} from '../../Graphing/GraphComponent';
import {
  BACK_BUTTON_HEIGHT,
  BACK_BUTTON_WIDTH,
  BACK_BUTTON_X,
  BACK_BUTTON_Y,
  NEXT_BUTTON_HEIGHT,
  NEXT_BUTTON_WIDTH,
  NEXT_BUTTON_X,
  NEXT_BUTTON_Y,
} from '../constants';

const VISUAL_READING_TEXT_X = 15;
const VISUAL_READING_TEXT_Y = 25;
const VISUAL_READING_TEXT_WIDTH = 375;
const VISUAL_READING_TEXT_HEIGHT = 375;
const VISUAL_READING_GRAPH_X = 410;
const VISUAL_READING_GRAPH_Y = 25;
const VISUAL_READING_GRAPH_WIDTH = 375;
const VISUAL_READING_GRAPH_HEIGHT = 375;

/**
 * Reading task View
 */
export class VisualReadingScreenView implements View {
  private group: Konva.Group;

  /**
   * Constructs Screen View
   * @param onAction user action function
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: VisualReadingScreenModel,
  ) {
    this.group = new Konva.Group();

    const readingText = new TextBoxComponent(
      VISUAL_READING_TEXT_X,
      VISUAL_READING_TEXT_Y,
      VISUAL_READING_TEXT_WIDTH,
      VISUAL_READING_TEXT_HEIGHT,
      model.readingText,
    );

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

    const graphComponent = new GraphComponent(
      VISUAL_READING_GRAPH_X,
      VISUAL_READING_GRAPH_Y,
      VISUAL_READING_GRAPH_WIDTH,
      VISUAL_READING_GRAPH_HEIGHT,
    );

    this.group.add(nextButton.getGroup());
    this.group.add(backButton.getGroup());

    this.group.add(readingText.getGroup());
    this.group.add(graphComponent.getGroup());
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Group {
    return this.group;
  }
}
