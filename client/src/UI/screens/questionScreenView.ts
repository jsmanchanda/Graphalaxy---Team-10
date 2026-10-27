import {ButtonComponent, TextBoxComponent} from '../components';
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
} from '../constants';
import {Question, View} from '../types';
import Konva from 'konva';

/**
 * Question screen view
 */
export class QuestionScreenView implements View {
  private group: Konva.Group;

  /**
   * builds questions screen
   */
  constructor(question: Question) {
    this.group = new Konva.Group();

    Konva.Image.fromURL('/assets/background.jpeg', image => {
      image.width(800);
      image.height(500);
      this.group.add(image);
      image.moveToBottom();
      this.group.getLayer()?.batchDraw();
    });

    const prompt = new TextBoxComponent(
      MULTIPLE_CHOICE_PROMPT_X,
      MULTIPLE_CHOICE_PROMPT_Y,
      MULTIPLE_CHOICE_PROMPT_WIDTH,
      MULTIPLE_CHOICE_PROMPT_HEIGHT,
      question.prompt,
    );

    const option1 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_LEFT_X,
      MULTIPLE_CHOICE_OPTION_TOP_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      question.option1,
      () => {},
    );
    const option2 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_RIGHT_X,
      MULTIPLE_CHOICE_OPTION_TOP_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      question.option2,
      () => {},
    );
    const option3 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_LEFT_X,
      MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      question.option3,
      () => {},
    );
    const option4 = new ButtonComponent(
      MULTIPLE_CHOICE_OPTION_RIGHT_X,
      MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
      question.option4,
      () => {},
    );

    this.group.add(prompt.getGroup());
    this.group.add(option1.getGroup());
    this.group.add(option2.getGroup());
    this.group.add(option3.getGroup());
    this.group.add(option4.getGroup());
  }
  /**
   * Show the screen
   */
  show(): void {
    this.group.visible(true);
    this.group.getLayer()?.draw();
  }

  /**
   * Hide the screen
   */
  hide(): void {
    this.group.visible(false);
    this.group.getLayer()?.draw();
  }

  /**
   * Getter
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
