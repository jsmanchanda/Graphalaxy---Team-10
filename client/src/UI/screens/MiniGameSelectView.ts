/// <reference lib="dom" />

import {AlienDialogue, ButtonComponent, ImageComponent} from '../components';
import {
  ALIEN_FRIEND_WIDTH,
  ALIEN_FRIEND_X,
  ALIEN_FRIEND_Y,
  BUBBLE_HEIGHT,
  BUBBLE_WIDTH,
  BUBBLE_X,
  BUBBLE_Y,
  DEFAULT_ALIEN_IMAGE,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  MINI_GAME_BUTTON_HEIGHT,
  MINI_GAME_BUTTON_WIDTH,
  MINI_GAME_BUTTON_Y,
  MINIGAME_SKIP_X,
  MINIGAME_START_X,
} from '../constants';
import {MiniGameSelectModel, UiAction, View} from '../types';
import Konva from 'konva';

interface MiniGameText {
  intro: string;
  select: string;
  skip: string;
}

const ASTEROID_TEXT: MiniGameText = {
  intro:
    'You are now approaching an asteroid belt!\nTo speed up your trip you can shoot the asteroids' +
    '\nIf you are fast enough, you will get a hint for your questions!',
  select: 'Go through',
  skip: 'Go around',
};

const RADIO_TEXT: MiniGameText = {
  intro:
    "Your ship has lost signal!\nTo speed up your trip, you can reconfigure your radio's waves" +
    '\nIf you are fast enough, you will get a hint for your questions!',
  select: 'Configure Radio',
  skip: 'Skip',
};

/** Displays the mini game select screen. */
export class MiniGameSelectView implements View {
  private group: Konva.Group;

  /**
   * Builds the mini game select screen.
   * @param onAction Called when the player picks a mini game or skips to the lesson.
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: MiniGameSelectModel,
  ) {
    this.group = new Konva.Group();

    const border = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      '/assets/general-nav.png',
    );

    const alien = new ImageComponent(
      ALIEN_FRIEND_X,
      ALIEN_FRIEND_Y,
      ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_WIDTH,
      DEFAULT_ALIEN_IMAGE,
    );

    const displayText: MiniGameText =
      model.minigame === 'Asteroid' ? ASTEROID_TEXT : RADIO_TEXT;

    const alienDialogue = new AlienDialogue(
      BUBBLE_X,
      BUBBLE_Y,
      BUBBLE_WIDTH,
      BUBBLE_HEIGHT,
      displayText.intro,
    );

    const playMinigameButton = new ButtonComponent(
      MINIGAME_START_X,
      MINI_GAME_BUTTON_Y,
      MINI_GAME_BUTTON_WIDTH,
      MINI_GAME_BUTTON_HEIGHT,
      displayText.select,
      () => onAction({type: 'startMiniGame', name: model.minigame}),
    );

    const skipButton = new ButtonComponent(
      MINIGAME_SKIP_X,
      MINI_GAME_BUTTON_Y,
      MINI_GAME_BUTTON_WIDTH,
      MINI_GAME_BUTTON_HEIGHT,
      displayText.skip,
      () => onAction({type: 'enterPlanet'}),
    );

    this.group.add(alien.getGroup());
    this.group.add(border.getGroup());
    this.group.add(alienDialogue.getGroup());

    this.group.add(playMinigameButton.getGroup());
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
