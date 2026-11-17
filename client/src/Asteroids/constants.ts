import {DESIGN_HEIGHT, DESIGN_WIDTH} from '../UI/constants';

// Layout for the asteroid minigame on the 800×500 design canvas. Kept apart
// from UI/constants.ts so the team's shared file doesn't change.
// The intro and result screens reuse UI/constants.ts (TITLE_TEXT_*,
// START_BUTTON_*, RESULT_TEXT_*, OK_BUTTON_*), so only the cockpit is here.

// ============== Window (the view out of the ship) ==============
// Must stay square: GraphComponent scales x and y separately, so a
// non-square window would stretch the asteroids and the curve differently.
export const FIELD_SIZE = 320;
export const FIELD_X = (DESIGN_WIDTH - FIELD_SIZE) * 0.5;
export const FIELD_Y = 10;

// ============== Control panel (decoration) ==============
export const PANEL_X = 0;
export const PANEL_Y = FIELD_Y + FIELD_SIZE + 10;
export const PANEL_WIDTH = DESIGN_WIDTH;
export const PANEL_HEIGHT = DESIGN_HEIGHT - PANEL_Y;
export const PANEL_FILL_COLOR = '#1e293b';
export const PANEL_BORDER_COLOR = '#94a3b8';

// Space between the panel's edge and what sits on it.
const PANEL_PADDING = 10;

// ============== Targeting preview (center bottom of the panel) ==============
export const PREVIEW_SIZE = PANEL_HEIGHT - 2 * PANEL_PADDING;
export const PREVIEW_X = (DESIGN_WIDTH - PREVIEW_SIZE) * 0.5;
export const PREVIEW_Y = PANEL_Y + PANEL_PADDING;
export const PREVIEW_SCREEN_COLOR = '#022c22';
export const PREVIEW_CURVE_COLOR = '#4ade80';

// ============== Equation side (left of the preview) ==============
export const EQUATION_X = PANEL_X + PANEL_PADDING;
export const EQUATION_WIDTH = PREVIEW_X - EQUATION_X - PANEL_PADDING;
export const EQUATION_ROW_HEIGHT = 30;
// Gap between the four rows: header, template, inputs, "Your equation:".
const EQUATION_ROW_GAP = (PREVIEW_SIZE - 4 * EQUATION_ROW_HEIGHT) / 3;

// "Question 2/3 · Vertex form"
export const HEADER_Y = PREVIEW_Y;
// "y = a(x - h)² + k"
export const TEMPLATE_Y = HEADER_Y + EQUATION_ROW_HEIGHT + EQUATION_ROW_GAP;
// One HTML input per coefficient, in design-canvas units.
export const INPUTS_Y = TEMPLATE_Y + EQUATION_ROW_HEIGHT + EQUATION_ROW_GAP;
export const INPUT_WIDTH = 56;
export const INPUT_GAP = 12;
// "Your equation: y = 2(x + 3)² - 1"
export const YOUR_EQUATION_Y =
  INPUTS_Y + EQUATION_ROW_HEIGHT + EQUATION_ROW_GAP;

// ============== Fire side (right of the preview) ==============
export const FIRE_SIDE_X = PREVIEW_X + PREVIEW_SIZE + PANEL_PADDING;
export const FIRE_SIDE_WIDTH = DESIGN_WIDTH - PANEL_PADDING - FIRE_SIDE_X;

// Fire, then Next or Results in the same spot after the shot.
export const FIRE_BUTTON_WIDTH = 200;
export const FIRE_BUTTON_HEIGHT = 60;
export const FIRE_BUTTON_X =
  FIRE_SIDE_X + (FIRE_SIDE_WIDTH - FIRE_BUTTON_WIDTH) * 0.5;
export const FIRE_BUTTON_Y = PREVIEW_Y;

// "HIT!" or "MISS", under the button.
export const SHOT_STATUS_X = FIRE_SIDE_X;
export const SHOT_STATUS_Y = FIRE_BUTTON_Y + FIRE_BUTTON_HEIGHT + PANEL_PADDING;
export const SHOT_STATUS_WIDTH = FIRE_SIDE_WIDTH;
export const SHOT_STATUS_HEIGHT = PREVIEW_Y + PREVIEW_SIZE - SHOT_STATUS_Y;

// ============== Asteroids ==============
export const ASTEROID_FILL_COLOR = 'rgba(255, 165, 0, 0.35)';
export const ASTEROID_STROKE_COLOR = 'orange';
export const DESTROYED_FILL_COLOR = 'rgba(239, 68, 68, 0.6)';
export const DESTROYED_STROKE_COLOR = 'red';
export const SHOT_COLOR = '#22c55e';
