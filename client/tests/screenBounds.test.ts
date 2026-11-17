import {describe, expect, it} from 'vitest';
// eslint-disable-next-line @typescript-eslint/naming-convention
import * as UI from '../src/UI/constants';
// Helper function to check bounds of UI components within the screen
// Ensures that the component fits within the design dimensions
function checkBounds(x: number, y: number, width: number, height: number) {
  expect(x).toBeGreaterThanOrEqual(0);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(x + width).toBeLessThanOrEqual(UI.DESIGN_WIDTH);
  expect(y + height).toBeLessThanOrEqual(UI.DESIGN_HEIGHT);
}

describe('UI screen bounds', () => {
  it('keeps the title screen components inside the screen', () => {
    checkBounds(
      UI.TITLE_TEXT_X,
      UI.TITLE_TEXT_Y,
      UI.TITLE_TEXT_WIDTH,
      UI.TITLE_TEXT_HEIGHT,
    );
    checkBounds(
      UI.START_BUTTON_X,
      UI.START_BUTTON_Y,
      UI.START_BUTTON_WIDTH,
      UI.START_BUTTON_HEIGHT,
    );
  });

  it('keeps the lesson intro components inside the screen', () => {
    checkBounds(
      UI.LESSON_INTRO_TITLE_X,
      UI.LESSON_INTRO_TITLE_Y,
      UI.LESSON_INTRO_TITLE_WIDTH,
      UI.LESSON_INTRO_TITLE_HEIGHT,
    );
    checkBounds(
      UI.LESSON_INTRO_DESCRIPTION_X,
      UI.LESSON_INTRO_DESCRIPTION_Y,
      UI.LESSON_INTRO_DESCRIPTION_WIDTH,
      UI.LESSON_INTRO_DESCRIPTION_HEIGHT,
    );
    checkBounds(
      UI.NEXT_BUTTON_X,
      UI.NEXT_BUTTON_Y,
      UI.NEXT_BUTTON_WIDTH,
      UI.NEXT_BUTTON_HEIGHT,
    );
    checkBounds(
      UI.BACK_BUTTON_X,
      UI.BACK_BUTTON_Y,
      UI.BACK_BUTTON_WIDTH,
      UI.BACK_BUTTON_HEIGHT,
    );
  });

  it('keeps the reading screen components inside the screen', () => {
    checkBounds(
      UI.READING_TEXT_X,
      UI.READING_TEXT_Y,
      UI.READING_TEXT_WIDTH,
      UI.READING_TEXT_HEIGHT,
    );
    checkBounds(
      UI.NEXT_BUTTON_X,
      UI.NEXT_BUTTON_Y,
      UI.NEXT_BUTTON_WIDTH,
      UI.NEXT_BUTTON_HEIGHT,
    );
    checkBounds(
      UI.BACK_BUTTON_X,
      UI.BACK_BUTTON_Y,
      UI.BACK_BUTTON_WIDTH,
      UI.BACK_BUTTON_HEIGHT,
    );
  });

  it('keeps the reading screen with a graph components inside the screen', () => {
    checkBounds(
      UI.VISUAL_READING_TEXT_X,
      UI.VISUAL_READING_TEXT_Y,
      UI.VISUAL_READING_TEXT_WIDTH,
      UI.VISUAL_READING_TEXT_HEIGHT,
    );
    checkBounds(
      UI.VISUAL_READING_GRAPH_X,
      UI.VISUAL_READING_GRAPH_Y,
      UI.VISUAL_READING_GRAPH_WIDTH,
      UI.VISUAL_READING_GRAPH_HEIGHT,
    );
  });

  it('keeps the question screen components inside the screen', () => {
    checkBounds(
      UI.MULTIPLE_CHOICE_PROMPT_X,
      UI.MULTIPLE_CHOICE_PROMPT_Y,
      UI.MULTIPLE_CHOICE_PROMPT_WIDTH,
      UI.MULTIPLE_CHOICE_PROMPT_HEIGHT,
    );
    checkBounds(
      UI.MULTIPLE_CHOICE_OPTION_LEFT_X,
      UI.MULTIPLE_CHOICE_OPTION_TOP_Y,
      UI.MULTIPLE_CHOICE_OPTION_WIDTH,
      UI.MULTIPLE_CHOICE_OPTION_HEIGHT,
    );
    checkBounds(
      UI.MULTIPLE_CHOICE_OPTION_RIGHT_X,
      UI.MULTIPLE_CHOICE_OPTION_TOP_Y,
      UI.MULTIPLE_CHOICE_OPTION_WIDTH,
      UI.MULTIPLE_CHOICE_OPTION_HEIGHT,
    );
    checkBounds(
      UI.MULTIPLE_CHOICE_OPTION_LEFT_X,
      UI.MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
      UI.MULTIPLE_CHOICE_OPTION_WIDTH,
      UI.MULTIPLE_CHOICE_OPTION_HEIGHT,
    );
    checkBounds(
      UI.MULTIPLE_CHOICE_OPTION_RIGHT_X,
      UI.MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
      UI.MULTIPLE_CHOICE_OPTION_WIDTH,
      UI.MULTIPLE_CHOICE_OPTION_HEIGHT,
    );
    checkBounds(
      UI.CONFIRM_BUTTON_X,
      UI.CONFIRM_BUTTON_Y,
      UI.CONFIRM_BUTTON_WIDTH,
      UI.CONFIRM_BUTTON_HEIGHT,
    );
    checkBounds(
      UI.QUESTION_BACK_BUTTON_X,
      UI.QUESTION_BACK_BUTTON_Y,
      UI.QUESTION_BACK_BUTTON_WIDTH,
      UI.QUESTION_BACK_BUTTON_HEIGHT,
    );
    checkBounds(
      UI.DESIGN_WIDTH - UI.ALIEN_FRIEND_WIDTH,
      UI.ALIEN_FRIEND_Y,
      UI.ALIEN_FRIEND_WIDTH,
      UI.ALIEN_FRIEND_WIDTH,
    );
  });

  it('keeps the question screen with a graph components inside the screen', () => {
    checkBounds(
      UI.VISUAL_QUESTION_PROMPT_X,
      UI.VISUAL_QUESTION_PROMPT_Y,
      UI.VISUAL_QUESTION_PROMPT_WIDTH,
      UI.VISUAL_QUESTION_PROMPT_HEIGHT,
    );
    checkBounds(
      UI.QUESTION_GRAPH_X,
      UI.QUESTION_GRAPH_Y,
      UI.QUESTION_GRAPH_WIDTH,
      UI.QUESTION_GRAPH_HEIGHT,
    );
  });

  it('keeps result screen components inside the screen', () => {
    checkBounds(
      UI.RESULT_TEXT_X,
      UI.RESULT_TEXT_Y,
      UI.RESULT_TEXT_WIDTH,
      UI.RESULT_TEXT_HEIGHT,
    );
    checkBounds(
      UI.OK_BUTTON_X,
      UI.OK_BUTTON_Y,
      UI.OK_BUTTON_WIDTH,
      UI.OK_BUTTON_HEIGHT,
    );
  });
});
