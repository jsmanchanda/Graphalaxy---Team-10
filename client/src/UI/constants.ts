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

// ============== Multiple Choice Screen ==============

// Multiple choice option dimensions
export const MULTIPLE_CHOICE_OPTION_WIDTH = DESIGN_WIDTH / 2;
export const MULTIPLE_CHOICE_OPTION_HEIGHT = 50;

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

export const CONFIRM_BUTTON_WIDTH = 200;
export const CONFIRM_BUTTON_HEIGHT = 40;
export const CONFIRM_BUTTON_X = (DESIGN_WIDTH - CONFIRM_BUTTON_WIDTH) * 0.5;
export const CONFIRM_BUTTON_Y =
  MULTIPLE_CHOICE_OPTION_TOP_Y - CONFIRM_BUTTON_HEIGHT;

export const QUESTION_BACK_BUTTON_WIDTH = 130;
export const QUESTION_BACK_BUTTON_HEIGHT = 80;
export const QUESTION_BACK_BUTTON_X = 0;
export const QUESTION_BACK_BUTTON_Y = 0;

// ============== Question Result Screen + Lesson Result Screen ==============
export const RESULT_TEXT_WIDTH = 600;
export const RESULT_TEXT_HEIGHT = 300;
export const RESULT_TEXT_X = (DESIGN_WIDTH - READING_TEXT_WIDTH) * 0.5;
export const RESULT_TEXT_Y = 50;

export const OK_BUTTON_WIDTH = 100;
export const OK_BUTTON_HEIGHT = 100;
export const OK_BUTTON_X = (DESIGN_WIDTH - OK_BUTTON_WIDTH) * 0.5;
export const OK_BUTTON_Y = RESULT_TEXT_Y + RESULT_TEXT_HEIGHT + 25;

// Redo button on the Lesson Result Screen
export const REDO_BUTTON_WIDTH = 200;
export const REDO_BUTTON_HEIGHT = 60;
export const REDO_BUTTON_X =
  RESULT_TEXT_X + RESULT_TEXT_WIDTH - REDO_BUTTON_WIDTH;
export const REDO_BUTTON_Y =
  OK_BUTTON_Y + (OK_BUTTON_HEIGHT - REDO_BUTTON_HEIGHT) * 0.5;

// ============== Retry Warning Screen ==============
export const RETRY_WARNING_TEXT_WIDTH = 600;
export const RETRY_WARNING_TEXT_HEIGHT = 300;
export const RETRY_WARNING_TEXT_X =
  (DESIGN_WIDTH - RETRY_WARNING_TEXT_WIDTH) * 0.5;
export const RETRY_WARNING_TEXT_Y = 50;

export const RETRY_WARNING_BUTTON_WIDTH = 200;
export const RETRY_WARNING_BUTTON_HEIGHT = 60;
export const RETRY_WARNING_BUTTON_Y =
  RETRY_WARNING_TEXT_Y + RETRY_WARNING_TEXT_HEIGHT + 25;
export const RETRY_WARNING_CANCEL_X = RETRY_WARNING_TEXT_X;
export const RETRY_WARNING_CONFIRM_X =
  RETRY_WARNING_TEXT_X + RETRY_WARNING_TEXT_WIDTH - RETRY_WARNING_BUTTON_WIDTH;

// ============== Settings (button on the Title Screen, and its screen) ==============
export const SETTINGS_BUTTON_WIDTH = 200;
export const SETTINGS_BUTTON_HEIGHT = 50;
export const SETTINGS_BUTTON_X = (DESIGN_WIDTH - SETTINGS_BUTTON_WIDTH) * 0.5;
export const SETTINGS_BUTTON_Y = START_BUTTON_Y + START_BUTTON_HEIGHT + 20;

export const SETTINGS_TITLE_WIDTH = 300;
export const SETTINGS_TITLE_HEIGHT = 60;
export const SETTINGS_TITLE_X = (DESIGN_WIDTH - SETTINGS_TITLE_WIDTH) * 0.5;
export const SETTINGS_TITLE_Y = 25;

// One row per volume: a name, a minus button, the value, and a plus button
export const SETTINGS_ROW_HEIGHT = 60;
export const SETTINGS_MUSIC_ROW_Y = 120;
export const SETTINGS_SFX_ROW_Y = 210;

export const SETTINGS_LABEL_WIDTH = 280;
export const SETTINGS_LABEL_X = 100;

export const SETTINGS_STEP_BUTTON_WIDTH = 60;
export const SETTINGS_MINUS_X = SETTINGS_LABEL_X + SETTINGS_LABEL_WIDTH + 20;

export const SETTINGS_VALUE_WIDTH = 120;
export const SETTINGS_VALUE_X =
  SETTINGS_MINUS_X + SETTINGS_STEP_BUTTON_WIDTH + 10;

export const SETTINGS_PLUS_X = SETTINGS_VALUE_X + SETTINGS_VALUE_WIDTH + 10;

export const SETTINGS_MESSAGE_WIDTH = 600;
export const SETTINGS_MESSAGE_HEIGHT = 60;
export const SETTINGS_MESSAGE_X = (DESIGN_WIDTH - SETTINGS_MESSAGE_WIDTH) * 0.5;
export const SETTINGS_MESSAGE_Y = 310;

// How much one press of a plus or minus button changes a volume (0 to 1)
export const SETTINGS_VOLUME_STEP = 0.1;

// ============== Login Screen ==============
export const LOGIN_TITLE_WIDTH = 400;
export const LOGIN_TITLE_HEIGHT = 130;
export const LOGIN_TITLE_X = (DESIGN_WIDTH - LOGIN_TITLE_WIDTH) * 0.5;
export const LOGIN_TITLE_Y = 30;

// The prompt, the username being typed, and the message share one column
export const LOGIN_ROW_WIDTH = 500;
export const LOGIN_ROW_X = (DESIGN_WIDTH - LOGIN_ROW_WIDTH) * 0.5;

export const LOGIN_PROMPT_HEIGHT = 50;
export const LOGIN_PROMPT_Y = 180;

export const LOGIN_INPUT_HEIGHT = 60;
export const LOGIN_INPUT_Y = 240;

export const LOGIN_MESSAGE_HEIGHT = 50;
export const LOGIN_MESSAGE_Y = 310;

export const LOGIN_BUTTON_WIDTH = 200;
export const LOGIN_BUTTON_HEIGHT = 60;
export const LOGIN_BUTTON_X = (DESIGN_WIDTH - LOGIN_BUTTON_WIDTH) * 0.5;
export const LOGIN_BUTTON_Y = 380;

// The most characters a username can be typed to, so it fits its box on one
// line. The server accepts up to 32.
export const LOGIN_USERNAME_MAX_LENGTH = 20;
