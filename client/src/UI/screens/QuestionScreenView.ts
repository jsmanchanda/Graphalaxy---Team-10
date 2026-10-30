import {ButtonComponent, ImageComponent, TextBoxComponent} from '../components';
import {
  MULTIPLE_CHOICE_OPTION_RIGHT_X,
  MULTIPLE_CHOICE_OPTION_LEFT_X,
  MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
  MULTIPLE_CHOICE_OPTION_TOP_Y,
  MULTIPLE_CHOICE_OPTION_WIDTH,
  MULTIPLE_CHOICE_OPTION_HEIGHT,
  MULTIPLE_CHOICE_PROMPT_X,
  MULTIPLE_CHOICE_PROMPT_Y,
  MULTIPLE_CHOICE_PROMPT_WIDTH,
  MULTIPLE_CHOICE_PROMPT_HEIGHT,
  ALIEN_FRIEND_WIDTH,
} from '../constants';
import {QuestionScreenModel, UiAction, View} from '../types';
import Konva from 'konva';

/**
 * Question screen view
 */
export class QuestionScreenView implements View {
  private group: Konva.Group;

  /**
   * builds questions screen
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: QuestionScreenModel,
  ) {
    this.group = new Konva.Group();

    const prompt = new TextBoxComponent(
      MULTIPLE_CHOICE_PROMPT_X,
      MULTIPLE_CHOICE_PROMPT_Y,
      MULTIPLE_CHOICE_PROMPT_WIDTH,
      MULTIPLE_CHOICE_PROMPT_HEIGHT,
      model.question.prompt,
    );

    const option1 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_LEFT_X,
      MULTIPLE_CHOICE_OPTION_TOP_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      model.question.option1,
      () => onAction({type: 'answer', option: 1}),
    );
    const option2 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_RIGHT_X,
      MULTIPLE_CHOICE_OPTION_TOP_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      model.question.option2,
      () => onAction({type: 'answer', option: 2}),
    );
    const option3 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_LEFT_X,
      MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      model.question.option3,
      () => onAction({type: 'answer', option: 3}),
    );
    const option4 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_RIGHT_X,
      MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      model.question.option4,
      () => onAction({type: 'answer', option: 4}),
    );

    const alienCat = new ImageComponent(
      0,
      0,
      ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_WIDTH,
      'public/assets/alien-cat.png',
    );

    this.group.add(alienCat.getGroup());
    this.group.add(prompt.getGroup());
    this.group.add(option1.getGroup());
    this.group.add(option2.getGroup());
    this.group.add(option3.getGroup());
    this.group.add(option4.getGroup());
  }

  /**
   * Getter
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
