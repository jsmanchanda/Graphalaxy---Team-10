import Konva from 'konva';
import {GraphComponent} from '../../Graphing/GraphComponent';
import {
  AlienDialogue,
  ButtonComponent,
  ImageComponent,
  TextBoxComponent,
} from '../components';
import {
  ALIEN_FRIEND_WIDTH,
  ALIEN_FRIEND_X,
  ALIEN_FRIEND_Y,
  BUBBLE_HEIGHT,
  BUBBLE_WIDTH,
  BUBBLE_WIDTH_WITH_GRAPH,
  BUBBLE_X,
  BUBBLE_Y,
  CONFIRM_BUTTON_HEIGHT,
  CONFIRM_BUTTON_WIDTH,
  CONFIRM_BUTTON_X,
  CONFIRM_BUTTON_Y,
  DEFAULT_PLANET_ID,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
  MULTIPLE_CHOICE_OPTION_HEIGHT,
  MULTIPLE_CHOICE_OPTION_LEFT_X,
  MULTIPLE_CHOICE_OPTION_RIGHT_X,
  MULTIPLE_CHOICE_OPTION_SELECTED_COLOR,
  MULTIPLE_CHOICE_OPTION_TOP_Y,
  MULTIPLE_CHOICE_OPTION_WIDTH,
  MULTIPLE_CHOICE_PROMPT_HEIGHT,
  MULTIPLE_CHOICE_PROMPT_WIDTH,
  MULTIPLE_CHOICE_PROMPT_WIDTH_WITH_GRAPH,
  MULTIPLE_CHOICE_PROMPT_X,
  MULTIPLE_CHOICE_PROMPT_Y,
  QUESTION_BACK_BUTTON_HEIGHT,
  QUESTION_BACK_BUTTON_WIDTH,
  QUESTION_BACK_BUTTON_X,
  QUESTION_BACK_BUTTON_Y,
  QUESTION_GRAPH_HEIGHT,
  QUESTION_GRAPH_WIDTH,
  QUESTION_GRAPH_X,
  QUESTION_GRAPH_Y,
  QUESTION_HINT_BUTTON_HEIGHT,
  QUESTION_HINT_BUTTON_WIDTH,
  QUESTION_HINT_BUTTON_X,
  QUESTION_HINT_BUTTON_Y,
  TEXT_BOX_FILL_COLOR,
} from '../constants';
import {QuestionScreenModel, UiAction, View} from '../types';

/**
 * Question screen view
 */
export class QuestionScreenView implements View {
  private group: Konva.Group;
  private alienDialogue: AlienDialogue;

  /**
   * builds questions screen
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: QuestionScreenModel,
  ) {
    this.group = new Konva.Group();

    // Each planet's art is named by its ID
    const planetId = model.planetId ?? DEFAULT_PLANET_ID;

    const border = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      '/assets/general-nav.png',
    );
    const background = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      `/assets/planet-background-${planetId}.png`,
    );

    // Track the selected option, null by default (no option selected)
    let selectedOption: number | null = null;

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
          buttonBackground.fill(
            index === option
              ? MULTIPLE_CHOICE_OPTION_SELECTED_COLOR
              : TEXT_BOX_FILL_COLOR,
          );
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

    const hintButton = new ButtonComponent(
      QUESTION_HINT_BUTTON_X,
      QUESTION_HINT_BUTTON_Y,
      QUESTION_HINT_BUTTON_WIDTH,
      QUESTION_HINT_BUTTON_HEIGHT,
      'Hint',
      () => {}, // Make Alien dialogue say hint
      // look at components.ts ~L113
    );

    const alien = new ImageComponent(
      ALIEN_FRIEND_X,
      ALIEN_FRIEND_Y,
      ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_WIDTH,
      `/assets/alien-planet-${planetId}.png`,
    );

    const backButton = new ButtonComponent(
      QUESTION_BACK_BUTTON_X,
      QUESTION_BACK_BUTTON_Y,
      QUESTION_BACK_BUTTON_WIDTH,
      QUESTION_BACK_BUTTON_HEIGHT,
      'Back To Lesson',
      () => onAction({type: 'back'}),
    );

    this.alienDialogue = new AlienDialogue(
      BUBBLE_X,
      BUBBLE_Y,
      BUBBLE_WIDTH,
      BUBBLE_HEIGHT,
      'Answer this question!',
    );

    const prompt = new TextBoxComponent(
      MULTIPLE_CHOICE_PROMPT_X,
      MULTIPLE_CHOICE_PROMPT_Y,
      MULTIPLE_CHOICE_PROMPT_WIDTH,
      MULTIPLE_CHOICE_PROMPT_HEIGHT,
      model.question.prompt,
    );

    this.group.add(background.getGroup());

    // if question has a graph, display it
    if (model.equation) {
      const graphComponent = new GraphComponent(
        QUESTION_GRAPH_X,
        QUESTION_GRAPH_Y,
        QUESTION_GRAPH_WIDTH,
        QUESTION_GRAPH_HEIGHT,
      );
      graphComponent.addFunction(model.equation);
      this.group.add(graphComponent.getGroup());

      prompt.setWidth(MULTIPLE_CHOICE_PROMPT_WIDTH_WITH_GRAPH);
      this.alienDialogue.setWidth(BUBBLE_WIDTH_WITH_GRAPH);
    }

    this.group.add(alien.getGroup());
    this.group.add(border.getGroup());
    this.group.add(backButton.getGroup());
    this.group.add(this.alienDialogue.getGroup());

    this.group.add(hintButton.getGroup());
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
