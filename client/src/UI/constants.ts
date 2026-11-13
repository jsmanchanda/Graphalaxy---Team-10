// ============== Global ==============

// Screen Dimensions
export const DESIGN_WIDTH = 800;
export const DESIGN_HEIGHT = 500;

// Alien picture
export const ALIEN_FRIEND_WIDTH = 150;
export const ALIEN_FRIEND_Y = 0;

// Font
export const FONT_PLANET_KOSMOS = 'PlanetKosmos';
export const FONT_CONTHRAX = 'Conthrax';

// Text Box
export const TEXT_BOX_FILL_COLOR = '#0c22cbc3';
export const TEXT_BOX_BORDER_COLOR = 'white';
export const TEXT_COLOR = '#000000';
export const TEXT_FONT_FAMILY = FONT_CONTHRAX;
export const TEXT_FONT_SIZE = 20;

// Next and Back Button
export const NEXT_BUTTON_WIDTH = 100;
export const NEXT_BUTTON_HEIGHT = 50;
export const NEXT_BUTTON_X = DESIGN_WIDTH - NEXT_BUTTON_WIDTH;
export const NEXT_BUTTON_Y = 450;

export const BACK_BUTTON_WIDTH = 100;
export const BACK_BUTTON_HEIGHT = 50;
export const BACK_BUTTON_X = 0;
export const BACK_BUTTON_Y = 450;

// ============== Title Screen ==============
export const TITLE_TEXT_WIDTH = 400;
export const TITLE_TEXT_HEIGHT = 180;
export const TITLE_TEXT_X = 200;
export const TITLE_TEXT_Y = 80;

export const START_BUTTON_WIDTH = 200;
export const START_BUTTON_HEIGHT = 60;
export const START_BUTTON_X = (DESIGN_WIDTH - START_BUTTON_WIDTH) * 0.5;
export const START_BUTTON_Y = 320;

// ============== Lesson Intro Screen ===========
export const LESSON_INTRO_TITLE_WIDTH = 150;
export const LESSON_INTRO_TITLE_HEIGHT = 75;
export const LESSON_INTRO_TITLE_X =
  (DESIGN_WIDTH - LESSON_INTRO_TITLE_WIDTH) * 0.5;
export const LESSON_INTRO_TITLE_Y = 25;

export const LESSON_INTRO_DESCRIPTION_WIDTH = 600;
export const LESSON_INTRO_DESCRIPTION_HEIGHT = 300;
export const LESSON_INTRO_DESCRIPTION_X =
  (DESIGN_WIDTH - LESSON_INTRO_DESCRIPTION_WIDTH) * 0.5;
export const LESSON_INTRO_DESCRIPTION_Y = 100;

// ============== Reading Screen ==============
export const READING_TEXT_WIDTH = 600;
export const READING_TEXT_HEIGHT = 300;
export const READING_TEXT_X = (DESIGN_WIDTH - READING_TEXT_WIDTH) * 0.5;
export const READING_TEXT_Y = 100;

// With Graph
export const VISUAL_READING_TEXT_X = 15;
export const VISUAL_READING_TEXT_Y = 25;
export const VISUAL_READING_TEXT_WIDTH = 375;
export const VISUAL_READING_TEXT_HEIGHT = 375;

export const VISUAL_READING_GRAPH_X = 410;
export const VISUAL_READING_GRAPH_Y = 25;
export const VISUAL_READING_GRAPH_WIDTH = 375;
export const VISUAL_READING_GRAPH_HEIGHT = 375;

// ============== Multiple Choice Screen ==============

// Multiple choice option dimensions
export const MULTIPLE_CHOICE_OPTION_WIDTH = DESIGN_WIDTH / 2;
export const MULTIPLE_CHOICE_OPTION_HEIGHT = 30;

// Multiple choice option locations
export const MULTIPLE_CHOICE_OPTION_LEFT_X =
  DESIGN_WIDTH - 2 * MULTIPLE_CHOICE_OPTION_WIDTH;

export const MULTIPLE_CHOICE_OPTION_RIGHT_X =
  DESIGN_WIDTH - MULTIPLE_CHOICE_OPTION_WIDTH;

export const MULTIPLE_CHOICE_OPTION_BOTTOM_Y =
  DESIGN_HEIGHT - MULTIPLE_CHOICE_OPTION_HEIGHT;

export const MULTIPLE_CHOICE_OPTION_TOP_Y =
  DESIGN_HEIGHT - 2 * MULTIPLE_CHOICE_OPTION_HEIGHT;

// Multiple choice prompt dimensions
export const MULTIPLE_CHOICE_PROMPT_WIDTH = 500;
export const MULTIPLE_CHOICE_PROMPT_HEIGHT = 300;

// Multiple choice option locations
export const MULTIPLE_CHOICE_PROMPT_X =
  (DESIGN_WIDTH - MULTIPLE_CHOICE_PROMPT_WIDTH) * 0.5;
export const MULTIPLE_CHOICE_PROMPT_Y =
  (DESIGN_HEIGHT -
    2 * MULTIPLE_CHOICE_OPTION_HEIGHT -
    MULTIPLE_CHOICE_PROMPT_HEIGHT) *
    0.5 -
  20;

export const CONFIRM_BUTTON_WIDTH = 250;
export const CONFIRM_BUTTON_HEIGHT = 40;
export const CONFIRM_BUTTON_X = DESIGN_WIDTH - CONFIRM_BUTTON_WIDTH;
export const CONFIRM_BUTTON_Y =
  MULTIPLE_CHOICE_OPTION_TOP_Y - CONFIRM_BUTTON_HEIGHT;

export const QUESTION_BACK_BUTTON_WIDTH = 250;
export const QUESTION_BACK_BUTTON_HEIGHT = 40;
export const QUESTION_BACK_BUTTON_X = 0;
export const QUESTION_BACK_BUTTON_Y =
  MULTIPLE_CHOICE_OPTION_TOP_Y - CONFIRM_BUTTON_HEIGHT;

// Question with graph

// prompt
export const VISUAL_QUESTION_PROMPT_X = 15;
export const VISUAL_QUESTION_PROMPT_Y = 25;
export const VISUAL_QUESTION_PROMPT_WIDTH = 375;
export const VISUAL_QUESTION_PROMPT_HEIGHT = 375;

// graph
export const QUESTION_GRAPH_X = 410;
export const QUESTION_GRAPH_Y = 25;
export const QUESTION_GRAPH_WIDTH = 375;
export const QUESTION_GRAPH_HEIGHT = 375;

// ============== Question Result Screen + Lesson Result Screen ==============
export const RESULT_TEXT_WIDTH = 600;
export const RESULT_TEXT_HEIGHT = 300;
export const RESULT_TEXT_X = (DESIGN_WIDTH - READING_TEXT_WIDTH) * 0.5;
export const RESULT_TEXT_Y = 50;

export const OK_BUTTON_WIDTH = 100;
export const OK_BUTTON_HEIGHT = 100;
export const OK_BUTTON_X = (DESIGN_WIDTH - OK_BUTTON_WIDTH) * 0.5;
export const OK_BUTTON_Y = RESULT_TEXT_Y + RESULT_TEXT_HEIGHT + 25;
