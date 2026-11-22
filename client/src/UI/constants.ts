// ============== Global ==============

// Screen Dimensions
export const DESIGN_WIDTH = 800;
export const DESIGN_HEIGHT = 500;

// Alien picture
export const ALIEN_FRIEND_WIDTH = 100;
export const ALIEN_FRIEND_X = 50;
export const ALIEN_FRIEND_Y = 30;
export const DEFAULT_ALIEN_IMAGE = '/assets/alien-planet-2.png';

// Question screen uses this planet's alien and background when none is given
export const DEFAULT_PLANET_ID = 2;

// Alien Dialogue
export const BUBBLE_X = 160;
export const BUBBLE_Y = 40;
export const BUBBLE_WIDTH = 590;
export const BUBBLE_WIDTH_WITH_GRAPH = 235;
export const BUBBLE_HEIGHT = 95;
export const BUBBLE_TAIL_WIDTH = 30;
export const BUBBLE_TAIL_HEIGHT = 30;
export const BUBBLE_FONT_SIZE = 15;

// Font
export const FONT_PLANET_KOSMOS = 'PlanetKosmos';
export const FONT_CONTHRAX = 'Conthrax';

// Text Box
export const TEXT_BOX_FILL_COLOR = '#0c22cbc3';
// export const TEXT_BOX_FILL_COLOR = '#4e34cec3';
export const TEXT_BOX_BORDER_COLOR = 'white';
// export const TEXT_COLOR = '#000000';
export const TEXT_COLOR = '#ffffff';
export const TEXT_FONT_FAMILY = FONT_CONTHRAX;
export const TEXT_FONT_SIZE = 16;

// Next and Back Button
export const NEXT_BUTTON_WIDTH = 120;
export const NEXT_BUTTON_HEIGHT = 50;
export const NEXT_BUTTON_X = 613;
export const NEXT_BUTTON_Y = 403;

export const BACK_BUTTON_WIDTH = 120;
export const BACK_BUTTON_HEIGHT = 50;
export const BACK_BUTTON_X = 65;
export const BACK_BUTTON_Y = 403;

// export const QUESTION_BACK_BUTTON_WIDTH = 120;
// export const QUESTION_BACK_BUTTON_HEIGHT = 50;
// export const QUESTION_BACK_BUTTON_X = 65;
// export const QUESTION_BACK_BUTTON_Y = 403;

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
export const READING_TEXT_WIDTH = 700;
export const READING_TEXT_HEIGHT = 215;
export const READING_TEXT_X = 50;
export const READING_TEXT_Y = 145;

// With Graph
export const VISUAL_READING_TEXT_WIDTH = 345;

export const VISUAL_READING_GRAPH_X = 400;
export const VISUAL_READING_GRAPH_Y = 40;
export const VISUAL_READING_GRAPH_WIDTH = 355;
export const VISUAL_READING_GRAPH_HEIGHT = 320;

// ============== Multiple Choice Screen ==============

// Multiple choice option dimensions
export const MULTIPLE_CHOICE_OPTION_WIDTH = 200;
export const MULTIPLE_CHOICE_OPTION_HEIGHT = 30;

// Background of the option the player has picked; the rest use TEXT_BOX_FILL_COLOR
export const MULTIPLE_CHOICE_OPTION_SELECTED_COLOR = '#3b82f6';

// Multiple choice option locations
export const MULTIPLE_CHOICE_OPTION_LEFT_X = 193;

export const MULTIPLE_CHOICE_OPTION_RIGHT_X = 405;

export const MULTIPLE_CHOICE_OPTION_TOP_Y = 392;

export const MULTIPLE_CHOICE_OPTION_BOTTOM_Y = 435;

// Multiple choice prompt dimensions
export const MULTIPLE_CHOICE_PROMPT_WIDTH = 700;
export const MULTIPLE_CHOICE_PROMPT_HEIGHT = 215;
export const MULTIPLE_CHOICE_PROMPT_WIDTH_WITH_GRAPH = 345;

// Multiple choice option locations
export const MULTIPLE_CHOICE_PROMPT_X = 50;
export const MULTIPLE_CHOICE_PROMPT_Y = 145;

export const CONFIRM_BUTTON_WIDTH = 120;
export const CONFIRM_BUTTON_HEIGHT = 30;
export const CONFIRM_BUTTON_X = 613;
export const CONFIRM_BUTTON_Y = 396;

// Rough nav bar positions
// X: [61,738]
// Y: [377,479]
// Width 677
// Height 31

export const QUESTION_BACK_BUTTON_WIDTH = 120;
export const QUESTION_BACK_BUTTON_HEIGHT = 50;
export const QUESTION_BACK_BUTTON_X = 65;
export const QUESTION_BACK_BUTTON_Y = 403;

export const QUESTION_HINT_BUTTON_WIDTH = 120;
export const QUESTION_HINT_BUTTON_HEIGHT = 30;
export const QUESTION_HINT_BUTTON_X = 613;
export const QUESTION_HINT_BUTTON_Y = 431;

// graph
export const QUESTION_GRAPH_X = 400;
export const QUESTION_GRAPH_Y = 40;
export const QUESTION_GRAPH_WIDTH = 355;
export const QUESTION_GRAPH_HEIGHT = 320;

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
// ============== Mini Game Select Screen ==============
export const MINI_GAME_SELECT_TITLE_WIDTH = 500;
export const MINI_GAME_SELECT_TITLE_HEIGHT = 100;
export const MINI_GAME_SELECT_TITLE_X =
  (DESIGN_WIDTH - MINI_GAME_SELECT_TITLE_WIDTH) * 0.5;
export const MINI_GAME_SELECT_TITLE_Y = 60;

// Mini game buttons sit side by side, centered horizontally
export const MINI_GAME_BUTTON_WIDTH = 200;
export const MINI_GAME_BUTTON_HEIGHT = 100;
export const MINI_GAME_BUTTON_GAP = 50;
export const MINI_GAME_BUTTON_Y =
  MINI_GAME_SELECT_TITLE_Y + MINI_GAME_SELECT_TITLE_HEIGHT + 40;

export const ASTEROID_BUTTON_X =
  (DESIGN_WIDTH - 2 * MINI_GAME_BUTTON_WIDTH - MINI_GAME_BUTTON_GAP) * 0.5;
export const RADIO_WAVE_BUTTON_X =
  ASTEROID_BUTTON_X + MINI_GAME_BUTTON_WIDTH + MINI_GAME_BUTTON_GAP;

export const SKIP_MINI_GAME_BUTTON_WIDTH = 200;
export const SKIP_MINI_GAME_BUTTON_HEIGHT = 60;
export const SKIP_MINI_GAME_BUTTON_X =
  (DESIGN_WIDTH - SKIP_MINI_GAME_BUTTON_WIDTH) * 0.5;
export const SKIP_MINI_GAME_BUTTON_Y =
  MINI_GAME_BUTTON_Y + MINI_GAME_BUTTON_HEIGHT + 50;

// ============== Navigation Screen ==============
export const NAV_FRAME_IMAGE = '/assets/nav-frame.png';

export const NAV_ALIEN_X = 630;
export const NAV_ALIEN_Y = 380;
export const NAV_ALIEN_WIDTH = 100;

// "Intergalactic Peace" total progress box
export const NAV_PROGRESS_X = 202;
export const NAV_PROGRESS_Y = 377;
export const NAV_PROGRESS_WIDTH = 393;
export const NAV_PROGRESS_HEIGHT = 40;

export const PLANET_DIAMETER = 75;

// Top left corner of each planet, indexed by planet id (0 is the home planet)
export const PLANET_POSITIONS = [
  {x: 75, y: 270}, // home planet
  {x: 240, y: 210}, // planet 1
  {x: 395, y: 85}, // planet 2 ...
  {x: 435, y: 215},
  {x: 595, y: 108},
  {x: 515, y: 145},
  {x: 515, y: 145},
];

// Name and progress shown above a planet on hover
export const PLANET_HOVER_TEXT_WIDTH = 150;
export const PLANET_HOVER_TEXT_HEIGHT = 35;
export const PLANET_HOVER_TEXT_FONT_SIZE = 12;
export const PLANET_HOVER_TEXT_COLOR = 'white';

// Paths between planets, colored by the planet's completion
export const PLANET_PATH_STROKE_WIDTH = 2;
export const PLANET_PATH_COLOR_COMPLETE = '#00FF19';
export const PLANET_PATH_COLOR_IN_PROGRESS = '#EEF20D';
export const PLANET_PATH_COLOR_REACHABLE = '#F20D0D';
export const PLANET_PATH_COLOR_UNREACHABLE = '#434242';
