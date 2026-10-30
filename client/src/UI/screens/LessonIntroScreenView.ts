import {Group} from 'konva/lib/Group';
import {LessonIntroScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {ButtonComponent, TextBoxComponent} from '../components';
import {
  LESSON_INTRO_TITLE_WIDTH,
  LESSON_INTRO_TITLE_X,
  LESSON_INTRO_TITLE_Y,
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

    const introText = new TextBoxComponent(
      LESSON_INTRO_TITLE_X,
      LESSON_INTRO_TITLE_Y,
      LESSON_INTRO_TITLE_WIDTH,
      LESSON_INTRO_TITLE_Y,
      model.title,
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

    this.group.add(introText.getGroup());
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
