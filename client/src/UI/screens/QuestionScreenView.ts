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

    // One button per option, however many the question has (2 to 4), filling
    // a two-column grid from the top left.
    const options = model.question.options.map(
      (text, index) =>
        new ButtonComponent(
          index % 2 === 0
            ? MULTIPLE_CHOICE_OPTION_LEFT_X
            : MULTIPLE_CHOICE_OPTION_RIGHT_X,
          index < 2
            ? MULTIPLE_CHOICE_OPTION_TOP_Y
            : MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
          MULTIPLE_CHOICE_OPTION_WIDTH,
          MULTIPLE_CHOICE_OPTION_HEIGHT,
          text,
          () => selectOption(index),
        ),
    );

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
      '/assets/alien-cat.png',
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
    options.forEach(option => this.group.add(option.getGroup()));
  }

  /**
   * Getter
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
