/// <reference lib="dom" />

import {ButtonComponent, TextBoxComponent} from '../components';
import {
  ASTEROID_BUTTON_X,
  MINI_GAME_BUTTON_HEIGHT,
  MINI_GAME_BUTTON_WIDTH,
  MINI_GAME_BUTTON_Y,
  MINI_GAME_SELECT_TITLE_HEIGHT,
  MINI_GAME_SELECT_TITLE_WIDTH,
  MINI_GAME_SELECT_TITLE_X,
  MINI_GAME_SELECT_TITLE_Y,
  RADIO_WAVE_BUTTON_X,
  SKIP_MINI_GAME_BUTTON_HEIGHT,
  SKIP_MINI_GAME_BUTTON_WIDTH,
  SKIP_MINI_GAME_BUTTON_X,
  SKIP_MINI_GAME_BUTTON_Y,
} from '../constants';
import {UiAction, View} from '../types';
import Konva from 'konva';

/** Displays the mini game select screen. */
export class MiniGameSelectView implements View {
  private group: Konva.Group;

  /**
   * Builds the mini game select screen.
   * @param onAction Called when the player picks a mini game or skips to the lesson.
   */
  constructor(onAction: (action: UiAction) => void) {
    this.group = new Konva.Group();

    const titleText = new TextBoxComponent(
      MINI_GAME_SELECT_TITLE_X,
      MINI_GAME_SELECT_TITLE_Y,
      MINI_GAME_SELECT_TITLE_WIDTH,
      MINI_GAME_SELECT_TITLE_HEIGHT,
      'Do you want to play minigame?',
    );

    const playAsteroidButton = new ButtonComponent(
      ASTEROID_BUTTON_X,
      MINI_GAME_BUTTON_Y,
      MINI_GAME_BUTTON_WIDTH,
      MINI_GAME_BUTTON_HEIGHT,
      'Asteroid Defense',
      () => onAction({type: 'startMiniGame', name: 'Asteroid'}),
    );

    const playRadioWaveButton = new ButtonComponent(
      RADIO_WAVE_BUTTON_X,
      MINI_GAME_BUTTON_Y,
      MINI_GAME_BUTTON_WIDTH,
      MINI_GAME_BUTTON_HEIGHT,
      'Radio Wave',
      () => onAction({type: 'startMiniGame', name: 'Radio'}),
    );

    const skipButton = new ButtonComponent(
      SKIP_MINI_GAME_BUTTON_X,
      SKIP_MINI_GAME_BUTTON_Y,
      SKIP_MINI_GAME_BUTTON_WIDTH,
      SKIP_MINI_GAME_BUTTON_HEIGHT,
      'Go to lesson',
      () => onAction({type: 'enterPlanet'}),
    );

    this.group.add(titleText.getGroup());
    this.group.add(playAsteroidButton.getGroup());
    this.group.add(playRadioWaveButton.getGroup());
    this.group.add(skipButton.getGroup());
  }

  /**
   * Gets the mini game select screen group.
   * @returns The Konva group containing the mini game select screen.
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
