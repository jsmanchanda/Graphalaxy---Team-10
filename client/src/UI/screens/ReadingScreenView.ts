import {Group} from 'konva/lib/Group';
import {ReadingScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
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
  BACK_BUTTON_HEIGHT,
  BACK_BUTTON_WIDTH,
  BACK_BUTTON_X,
  BACK_BUTTON_Y,
  BUBBLE_HEIGHT,
  BUBBLE_WIDTH,
  BUBBLE_WIDTH_WITH_GRAPH,
  BUBBLE_X,
  BUBBLE_Y,
  DEFAULT_PLANET_ID,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
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
  VISUAL_READING_TEXT_WIDTH,
  SETTINGS_ICON_IMAGE,
  SETTINGS_ICON_SIZE,
  SETTINGS_ICON_X,
  SETTINGS_ICON_Y,
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
    const border = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      '/assets/general-nav.png',
    );
    const planetId = model.planetId ?? DEFAULT_PLANET_ID;

    const background = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      `/assets/planet-background-${planetId}.jpg`,
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

    const alien = new ImageComponent(
      ALIEN_FRIEND_X,
      ALIEN_FRIEND_Y,
      ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_WIDTH,
      `/assets/alien-planet-${planetId}.png`,
    );

    const alienDialogue = new AlienDialogue(
      BUBBLE_X,
      BUBBLE_Y,
      BUBBLE_WIDTH,
      BUBBLE_HEIGHT,
      'Complete This reading!',
    );

    // change view based on if it shows a graph or not
    const readingText = new TextBoxComponent(
      READING_TEXT_X,
      READING_TEXT_Y,
      READING_TEXT_WIDTH,
      READING_TEXT_HEIGHT,
      model.readingText,
    );

    this.group.add(background.getGroup());
    this.group.add(alien.getGroup());
    const settingsIcon = new ImageComponent(
      SETTINGS_ICON_X,
      SETTINGS_ICON_Y,
      SETTINGS_ICON_SIZE,
      SETTINGS_ICON_SIZE,
      SETTINGS_ICON_IMAGE,
    );
    this.group.add(border.getGroup());
    this.group.add(settingsIcon.getGroup());
    if (model.equation) {
      const graphComponent = new GraphComponent(
        VISUAL_READING_GRAPH_X,
        VISUAL_READING_GRAPH_Y,
        VISUAL_READING_GRAPH_WIDTH,
        VISUAL_READING_GRAPH_HEIGHT,
      );
      graphComponent.addFunction(model.equation);
      this.group.add(graphComponent.getGroup());

      readingText.setWidth(VISUAL_READING_TEXT_WIDTH);
      alienDialogue.setWidth(BUBBLE_WIDTH_WITH_GRAPH);
    }

    this.group.add(alienDialogue.getGroup());

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
