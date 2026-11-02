/// <reference lib="dom" />

import {ButtonComponent, TextBoxComponent} from '../components';
import {
  FONT_PLANET_KOSMOS,
  START_BUTTON_HEIGHT,
  START_BUTTON_WIDTH,
  START_BUTTON_X,
  START_BUTTON_Y,
  TITLE_TEXT_HEIGHT,
  TITLE_TEXT_WIDTH,
  TITLE_TEXT_X,
  TITLE_TEXT_Y,
} from '../constants';
import {TitleScreenModel, UiAction, View} from '../types';
import Konva from 'konva';

/** Displays the game's title screen. */
export class TitleScreenView implements View {
  private group: Konva.Group;

  /**
   * Builds the title screen.
   * @param onAction Called when the player selects Start.
   */
  constructor(onAction: (action: UiAction) => void, model: TitleScreenModel) {
    this.group = new Konva.Group();

    const titleText = new TextBoxComponent(
      TITLE_TEXT_X,
      TITLE_TEXT_Y,
      TITLE_TEXT_WIDTH,
      TITLE_TEXT_HEIGHT,
      model.title,
    );
    titleText.setFontSize(45);
    titleText.setFontFamily(FONT_PLANET_KOSMOS);

    const startButton = new ButtonComponent(
      START_BUTTON_X,
      START_BUTTON_Y,
      START_BUTTON_WIDTH,
      START_BUTTON_HEIGHT,
      'Start',
      () => onAction({type: 'start'}),
    );

    this.group.add(titleText.getGroup());
    this.group.add(startButton.getGroup());
  }

  /**
   * Gets the title screen group.
   * @returns The Konva group containing the title screen.
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
