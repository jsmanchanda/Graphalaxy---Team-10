import Konva from 'konva';
import {InstructionsScreenModel, UiAction, View} from '../types';
import {
  AlienDialogue,
  ButtonComponent,
  ImageComponent,
  SettingsIconComponent,
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
  BUBBLE_X,
  BUBBLE_Y,
  DEFAULT_ALIEN_IMAGE,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  INSTRUCTIONS_FONT_SIZE,
  INSTRUCTIONS_TEXT_HEIGHT,
  INSTRUCTIONS_TEXT_PADDING,
  INSTRUCTIONS_TEXT_WIDTH,
  INSTRUCTIONS_TEXT_X,
  INSTRUCTIONS_TEXT_Y,
  NEXT_BUTTON_HEIGHT,
  NEXT_BUTTON_WIDTH,
  NEXT_BUTTON_X,
  NEXT_BUTTON_Y,
} from '../constants';
import {
  INSTRUCTIONS_GREETING,
  INSTRUCTIONS_REMINDER,
  INSTRUCTIONS_TEXT,
} from '../instructions';

/**
 * How to play, shown before the navigation map. The alien co-pilot (the same
 * one that sits on the map) greets the player above the list of steps.
 * Continue opens the map; Back returns to the title.
 */
export class InstructionsScreenView implements View {
  private group: Konva.Group;

  /**
   * Builds the instructions screen.
   * @param onAction Called when the player selects Continue, Back, or the
   *   settings icon.
   * @param model The screen's data; it has nothing to show beyond its type.
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: InstructionsScreenModel,
  ) {
    void model;
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

    const greeting = new AlienDialogue(
      BUBBLE_X,
      BUBBLE_Y,
      BUBBLE_WIDTH,
      BUBBLE_HEIGHT,
      `${INSTRUCTIONS_GREETING}\n${INSTRUCTIONS_REMINDER}`,
    );

    const steps = new TextBoxComponent(
      INSTRUCTIONS_TEXT_X,
      INSTRUCTIONS_TEXT_Y,
      INSTRUCTIONS_TEXT_WIDTH,
      INSTRUCTIONS_TEXT_HEIGHT,
      INSTRUCTIONS_TEXT,
    )
      .setFontSize(INSTRUCTIONS_FONT_SIZE)
      .setTextLayout({align: 'left', padding: INSTRUCTIONS_TEXT_PADDING});
    steps.getGroup().name('instructionsText');

    const backButton = new ButtonComponent(
      BACK_BUTTON_X,
      BACK_BUTTON_Y,
      BACK_BUTTON_WIDTH,
      BACK_BUTTON_HEIGHT,
      'Back',
      () => onAction({type: 'back'}),
    );

    const continueButton = new ButtonComponent(
      NEXT_BUTTON_X,
      NEXT_BUTTON_Y,
      NEXT_BUTTON_WIDTH,
      NEXT_BUTTON_HEIGHT,
      "Let's go!",
      () => onAction({type: 'next'}),
    );

    const settingsIcon = new SettingsIconComponent(() =>
      onAction({type: 'openSettings'}),
    );

    this.group.add(alien.getGroup());
    this.group.add(border.getGroup());
    this.group.add(settingsIcon.getGroup());
    this.group.add(greeting.getGroup());
    this.group.add(steps.getGroup());
    this.group.add(backButton.getGroup());
    this.group.add(continueButton.getGroup());
  }

  /**
   * Gets the instructions screen group.
   * @returns The Konva group containing the instructions screen.
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
