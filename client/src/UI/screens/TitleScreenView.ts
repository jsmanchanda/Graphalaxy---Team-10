/// <reference lib="dom" />

import {ButtonComponent, TextBoxComponent} from '../components';
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

    // const logo = new ImageComponent(200, 80, 400, 180, '/assets/logo.png');

    const titleText = new TextBoxComponent(200, 80, 40, 180, model.title);

    const startButton = new ButtonComponent(300, 320, 200, 60, 'Start', () =>
      onAction({type: 'start'}),
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
