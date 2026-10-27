// ============== Screen ==============
export const DESIGN_WIDTH = 800;
export const DESIGN_HEIGHT = 500;

// ============== Text Box ==============
export const TEXT_BOX_FILL_COLOR = '#065c0d';
export const TEXT_BOX_BORDER_COLOR = 'black';
export const TEXT_COLOR = '#000000';
export const TEXT_FONT_FAMILY = 'Arial';
export const TEXT_FONT_SIZE = 24;

// ============== Multiple Choice Screen ==============

// Multiple choice option dimensions
export const MULTIPLE_CHOICE_OPTION_WIDTH = 400;
export const MULTIPLE_CHOICE_OPTION_HEIGHT = 75;

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
