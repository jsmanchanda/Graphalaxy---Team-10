import {Group} from 'konva/lib/Group';
import {LessonIntroScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {
  AlienDialogue,
  ButtonComponent,
  ImageComponent,
  TextBoxComponent,
} from '../components';
import {
  NEXT_BUTTON_HEIGHT,
  NEXT_BUTTON_WIDTH,
  NEXT_BUTTON_X,
  NEXT_BUTTON_Y,
  BACK_BUTTON_HEIGHT,
  BACK_BUTTON_WIDTH,
  BACK_BUTTON_X,
  BACK_BUTTON_Y,
  LESSON_INTRO_DESCRIPTION_X,
  LESSON_INTRO_DESCRIPTION_Y,
  LESSON_INTRO_DESCRIPTION_WIDTH,
  LESSON_INTRO_DESCRIPTION_HEIGHT,
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  BUBBLE_X,
  BUBBLE_Y,
  BUBBLE_WIDTH,
  BUBBLE_HEIGHT,
  ALIEN_FRIEND_Y,
  ALIEN_FRIEND_X,
  ALIEN_FRIEND_WIDTH,
  DEFAULT_PLANET_ID,
} from '../constants';

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

    const planetId = model.planetId ?? DEFAULT_PLANET_ID;

    const background = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      `/assets/planet-intro-background-${planetId}.jpg`,
    );

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
      `/assets/alien-planet-${planetId}.png`,
    );

    const alienDialogue = new AlienDialogue(
      BUBBLE_X,
      BUBBLE_Y,
      BUBBLE_WIDTH,
      BUBBLE_HEIGHT,
      `Welcome to ${model.title}!`,
    );

    const descriptionText = new TextBoxComponent(
      LESSON_INTRO_DESCRIPTION_X,
      LESSON_INTRO_DESCRIPTION_Y,
      LESSON_INTRO_DESCRIPTION_WIDTH,
      LESSON_INTRO_DESCRIPTION_HEIGHT,
      model.description,
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

    this.group.add(background.getGroup());
    this.group.add(alien.getGroup());
    this.group.add(border.getGroup());
    this.group.add(alienDialogue.getGroup());
    this.group.add(descriptionText.getGroup());
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
