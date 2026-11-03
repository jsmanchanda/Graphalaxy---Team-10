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
  DESIGN_WIDTH,
  ALIEN_FRIEND_Y,
  CONFIRM_BUTTON_HEIGHT,
  CONFIRM_BUTTON_WIDTH,
  CONFIRM_BUTTON_X,
  CONFIRM_BUTTON_Y,
  QUESTION_BACK_BUTTON_HEIGHT,
  QUESTION_BACK_BUTTON_WIDTH,
  QUESTION_BACK_BUTTON_X,
  QUESTION_BACK_BUTTON_Y,
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

    // Track the selected option, null by default (no option selected)
    let selectedOption: number | null = null;

    const prompt = new TextBoxComponent(
      MULTIPLE_CHOICE_PROMPT_X,
      MULTIPLE_CHOICE_PROMPT_Y,
      MULTIPLE_CHOICE_PROMPT_WIDTH,
      MULTIPLE_CHOICE_PROMPT_HEIGHT,
      model.question.prompt,
    );

    const option0 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_LEFT_X,
      MULTIPLE_CHOICE_OPTION_TOP_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      model.question.options[0],
      () => selectOption(0),
    );
    const option1 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_RIGHT_X,
      MULTIPLE_CHOICE_OPTION_TOP_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      model.question.options[1],
      () => selectOption(1),
    );
    const option2 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_LEFT_X,
      MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      model.question.options[2],
      () => selectOption(2),
    );
    const option3 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_RIGHT_X,
      MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      model.question.options[3],
      () => selectOption(3),
    );
    const options = [option0, option1, option2, option3];

    function selectOption(option: number): void {
      selectedOption = option;

      options.forEach((button, index) => {
        const buttonBackground = button.getGroup().getChildren()[0];

        // Highlight the selected option by changing its background color
        if (buttonBackground instanceof Konva.Rect) {
          buttonBackground.fill(index === option ? '#3b82f6' : '#0c22cbc3');
        }
      });
    }

    const confirmButton = new ButtonComponent(
      CONFIRM_BUTTON_X,
      CONFIRM_BUTTON_Y,
      CONFIRM_BUTTON_WIDTH,
      CONFIRM_BUTTON_HEIGHT,
      'Confirm',
      () => {
        if (selectedOption !== null) {
          onAction({type: 'answer', option: selectedOption});
        }
      },
    );

    const alienCat = new ImageComponent(
      DESIGN_WIDTH - ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_Y,
      ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_WIDTH,
      'public/assets/alien-cat.png',
    );

    const backButton = new ButtonComponent(
      QUESTION_BACK_BUTTON_X,
      QUESTION_BACK_BUTTON_Y,
      QUESTION_BACK_BUTTON_WIDTH,
      QUESTION_BACK_BUTTON_HEIGHT,
      'Back To Lesson',
      () => onAction({type: 'back'}),
    );

    this.group.add(backButton.getGroup());
    this.group.add(alienCat.getGroup());
    this.group.add(prompt.getGroup());
    this.group.add(confirmButton.getGroup());
    this.group.add(option0.getGroup());
    this.group.add(option1.getGroup());
    this.group.add(option2.getGroup());
    this.group.add(option3.getGroup());
  }

  /**
   * Getter
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
