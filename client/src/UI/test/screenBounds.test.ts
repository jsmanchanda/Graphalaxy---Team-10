import {describe, expect, it} from 'vitest';
import {
  ALIEN_FRIEND_WIDTH,
  BACK_BUTTON_HEIGHT,
  BACK_BUTTON_WIDTH,
  BACK_BUTTON_X,
  BACK_BUTTON_Y,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  LESSON_INTRO_DESCRIPTION_HEIGHT,
  LESSON_INTRO_DESCRIPTION_WIDTH,
  LESSON_INTRO_DESCRIPTION_X,
  LESSON_INTRO_DESCRIPTION_Y,
  LESSON_INTRO_TITLE_HEIGHT,
  LESSON_INTRO_TITLE_WIDTH,
  LESSON_INTRO_TITLE_X,
  LESSON_INTRO_TITLE_Y,
  MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
  MULTIPLE_CHOICE_OPTION_HEIGHT,
  MULTIPLE_CHOICE_OPTION_LEFT_X,
  MULTIPLE_CHOICE_OPTION_RIGHT_X,
  MULTIPLE_CHOICE_OPTION_TOP_Y,
  MULTIPLE_CHOICE_OPTION_WIDTH,
  MULTIPLE_CHOICE_PROMPT_HEIGHT,
  MULTIPLE_CHOICE_PROMPT_WIDTH,
  MULTIPLE_CHOICE_PROMPT_X,
  MULTIPLE_CHOICE_PROMPT_Y,
  NEXT_BUTTON_HEIGHT,
  NEXT_BUTTON_WIDTH,
  NEXT_BUTTON_X,
  NEXT_BUTTON_Y,
  OK_BUTTON_HEIGHT,
  OK_BUTTON_WIDTH,
  OK_BUTTON_X,
  OK_BUTTON_Y,
  READING_TEXT_HEIGHT,
  READING_TEXT_WIDTH,
  READING_TEXT_X,
  READING_TEXT_Y,
  RESULT_TEXT_HEIGHT,
  RESULT_TEXT_WIDTH,
  RESULT_TEXT_X,
  RESULT_TEXT_Y,
} from '../constants';

// Helper function to check bounds of UI components within the screen
// Ensures that the component fits within the design dimensions
function checkBounds(x: number, y: number, width: number, height: number) {
  expect(x).toBeGreaterThanOrEqual(0);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(x + width).toBeLessThanOrEqual(DESIGN_WIDTH);
  expect(y + height).toBeLessThanOrEqual(DESIGN_HEIGHT);
}

describe('UI screen bounds', () => {
  it('keeps the title screen components inside the screen', () => {
    checkBounds(200, 80, 400, 180);
    checkBounds(300, 320, 200, 60);
  });

  it('keeps the lesson intro components inside the screen', () => {
    checkBounds(
      LESSON_INTRO_TITLE_X,
      LESSON_INTRO_TITLE_Y,
      LESSON_INTRO_TITLE_WIDTH,
      LESSON_INTRO_TITLE_HEIGHT,
    );
    checkBounds(
      LESSON_INTRO_DESCRIPTION_X,
      LESSON_INTRO_DESCRIPTION_Y,
      LESSON_INTRO_DESCRIPTION_WIDTH,
      LESSON_INTRO_DESCRIPTION_HEIGHT,
    );
    checkBounds(
      NEXT_BUTTON_X,
      NEXT_BUTTON_Y,
      NEXT_BUTTON_WIDTH,
      NEXT_BUTTON_HEIGHT,
    );
    checkBounds(
      BACK_BUTTON_X,
      BACK_BUTTON_Y,
      BACK_BUTTON_WIDTH,
      BACK_BUTTON_HEIGHT,
    );
  });

  it('keeps the reading screen components inside the screen', () => {
    checkBounds(
      READING_TEXT_X,
      READING_TEXT_Y,
      READING_TEXT_WIDTH,
      READING_TEXT_HEIGHT,
    );
    checkBounds(
      NEXT_BUTTON_X,
      NEXT_BUTTON_Y,
      NEXT_BUTTON_WIDTH,
      NEXT_BUTTON_HEIGHT,
    );
    checkBounds(
      BACK_BUTTON_X,
      BACK_BUTTON_Y,
      BACK_BUTTON_WIDTH,
      BACK_BUTTON_HEIGHT,
    );
  });

  it('keeps the question screen components inside the screen', () => {
    checkBounds(
      MULTIPLE_CHOICE_PROMPT_X,
      MULTIPLE_CHOICE_PROMPT_Y,
      MULTIPLE_CHOICE_PROMPT_WIDTH,
      MULTIPLE_CHOICE_PROMPT_HEIGHT,
    );
    checkBounds(
      MULTIPLE_CHOICE_OPTION_LEFT_X,
      MULTIPLE_CHOICE_OPTION_TOP_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
    );
    checkBounds(
      MULTIPLE_CHOICE_OPTION_RIGHT_X,
      MULTIPLE_CHOICE_OPTION_TOP_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
    );
    checkBounds(
      MULTIPLE_CHOICE_OPTION_LEFT_X,
      MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
    );
    checkBounds(
      MULTIPLE_CHOICE_OPTION_RIGHT_X,
      MULTIPLE_CHOICE_OPTION_BOTTOM_Y,
      MULTIPLE_CHOICE_OPTION_WIDTH,
      MULTIPLE_CHOICE_OPTION_HEIGHT,
    );
    checkBounds(
      (DESIGN_WIDTH - 200) / 2,
      DESIGN_HEIGHT - MULTIPLE_CHOICE_OPTION_HEIGHT * 2 - 40,
      200,
      40,
    );
    checkBounds(0, 0, 130, 80);
    checkBounds(
      DESIGN_WIDTH - ALIEN_FRIEND_WIDTH,
      0,
      ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_WIDTH,
    );
  });

  it('keeps result screen components inside the screen', () => {
    checkBounds(
      RESULT_TEXT_X,
      RESULT_TEXT_Y,
      RESULT_TEXT_WIDTH,
      RESULT_TEXT_HEIGHT,
    );
    checkBounds(OK_BUTTON_X, OK_BUTTON_Y, OK_BUTTON_WIDTH, OK_BUTTON_HEIGHT);
  });
});
