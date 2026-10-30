// ============== Global ==============

// Screen Dimensions
export const DESIGN_WIDTH = 800;
export const DESIGN_HEIGHT = 500;

// Alien picture
export const ALIEN_FRIEND_WIDTH = 150;

// Font
export const FONT_PLANET_KOSMOS = 'PlanetKosmos';
export const FONT_CONTHRAX = 'Conthrax';

// Text Box
export const TEXT_BOX_FILL_COLOR = '#0c22cbc3';
export const TEXT_BOX_BORDER_COLOR = 'white';
export const TEXT_COLOR = '#000000';
export const TEXT_FONT_FAMILY = FONT_CONTHRAX;
export const TEXT_FONT_SIZE = 20;

// ============== Multiple Choice Screen ==============

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
  0.5;
