import {Interval} from '../Graphing/functions';
import {DESIGN_WIDTH} from '../UI/constants';
import {WINDOW_MAX, WINDOW_MIN} from './math/asteroids';

// Layout for the asteroid minigame on the 800×500 design canvas. Kept apart
// from UI/constants.ts so the team's shared file doesn't change.
// The intro's Launch button and the result screen reuse UI/constants.ts
// (START_BUTTON_*, RESULT_TEXT_*, OK_BUTTON_*).

// ============== Intro screen ==============
export const INTRO_TITLE_WIDTH = 400;
export const INTRO_TITLE_HEIGHT = 70;
export const INTRO_TITLE_X = (DESIGN_WIDTH - INTRO_TITLE_WIDTH) * 0.5;
export const INTRO_TITLE_Y = 40;

export const INTRO_RULES_WIDTH = 600;
export const INTRO_RULES_HEIGHT = 160;
export const INTRO_RULES_X = (DESIGN_WIDTH - INTRO_RULES_WIDTH) * 0.5;
export const INTRO_RULES_Y = INTRO_TITLE_Y + INTRO_TITLE_HEIGHT + 20;

// ============== Cockpit frame (general-nav.png) ==============
// The same full-screen frame the lesson screens use. The slots below were
// measured from the image at 800×500; the window and the top-left square are
// transparent, so the space background shows through them.
export const PANEL_FRAME_IMAGE = '/assets/general-nav.png';

// The big window, top to bottom.
const FRAME_WINDOW_TOP = 32;
const FRAME_WINDOW_BOTTOM = 364;

// The small square at the top left (the alien's spot on lesson screens).
const FRAME_SQUARE_X = 50;
const FRAME_SQUARE_Y = 41;
const FRAME_SQUARE_WIDTH = 98;
const FRAME_SQUARE_HEIGHT = 78;

// The light strip along the bottom, inside its border.
const STRIP_X = 63;
const STRIP_Y = 381;
const STRIP_WIDTH = 674;
const STRIP_HEIGHT = 96;
// Space between the strip's edge and what sits on it.
const STRIP_PADDING = 6;
const STRIP_INNER_TOP = STRIP_Y + STRIP_PADDING;
const STRIP_INNER_HEIGHT = STRIP_HEIGHT - 2 * STRIP_PADDING;

// ============== Window (the view out of the ship) ==============
// Must stay square: GraphComponent scales x and y separately, so a
// non-square window would stretch the asteroids and the curve differently.
// Centered in the frame's big window.
export const FIELD_SIZE = 320;
export const FIELD_X = (DESIGN_WIDTH - FIELD_SIZE) * 0.5;
export const FIELD_Y =
  FRAME_WINDOW_TOP +
  (FRAME_WINDOW_BOTTOM - FRAME_WINDOW_TOP - FIELD_SIZE) * 0.5;

// The graph range shown in the window, on both axes, with a grid line every
// unit. The single source for everything that maps the game's coordinates to
// pixels: the window is drawn with it (passed to GraphComponent instead of
// relying on GraphComponent's default) and the targeting preview samples it.
// It comes from WINDOW_MIN/MAX, which the hit test and the spawn range use,
// so the drawing and the game rules can't disagree.
export const ASTEROID_WINDOW = new Interval(WINDOW_MIN, WINDOW_MAX, 1);

// ============== Targeting preview (the frame's top-left square) ==============
// Square, like the window, and centered in the frame's square with a small
// margin so the frame's edge doesn't cover the curve.
const PREVIEW_MARGIN = 2;
export const PREVIEW_SIZE =
  Math.min(FRAME_SQUARE_WIDTH, FRAME_SQUARE_HEIGHT) - 2 * PREVIEW_MARGIN;
export const PREVIEW_X =
  FRAME_SQUARE_X + (FRAME_SQUARE_WIDTH - PREVIEW_SIZE) * 0.5;
export const PREVIEW_Y =
  FRAME_SQUARE_Y + (FRAME_SQUARE_HEIGHT - PREVIEW_SIZE) * 0.5;
export const PREVIEW_SCREEN_COLOR = '#022c22';
export const PREVIEW_BORDER_COLOR = '#94a3b8';
export const PREVIEW_CURVE_COLOR = '#4ade80';

// ============== Equation side (left of the strip) ==============
export const EQUATION_X = STRIP_X + STRIP_PADDING;
export const EQUATION_WIDTH = 300;
export const EQUATION_ROW_HEIGHT = 26;
// Rows on the equation side: header, template, inputs. Spread evenly over
// the strip's height. (Set to 4 if the "Your equation:" row comes back.)
const EQUATION_ROWS = 3;
const EQUATION_ROW_GAP =
  (STRIP_INNER_HEIGHT - EQUATION_ROWS * EQUATION_ROW_HEIGHT) /
  (EQUATION_ROWS - 1);

// "Question 2/3 · Vertex form"
export const HEADER_Y = STRIP_INNER_TOP;
// "y = a(x - h)² + k"
export const TEMPLATE_Y = HEADER_Y + EQUATION_ROW_HEIGHT + EQUATION_ROW_GAP;
// One HTML input per coefficient, in design-canvas units. A 4-box row is
// wider than EQUATION_WIDTH and runs into the empty middle of the strip.
export const INPUTS_Y = TEMPLATE_Y + EQUATION_ROW_HEIGHT + EQUATION_ROW_GAP;
export const INPUT_WIDTH = 56;
export const INPUT_GAP = 12;

// ============== Fire side (right of the strip) ==============
export const FIRE_SIDE_WIDTH = 200;
export const FIRE_SIDE_X =
  STRIP_X + STRIP_WIDTH - STRIP_PADDING - FIRE_SIDE_WIDTH;

// Fire, then Next or Results in the same spot after the shot.
export const FIRE_BUTTON_WIDTH = FIRE_SIDE_WIDTH;
export const FIRE_BUTTON_HEIGHT = 48;
export const FIRE_BUTTON_X = FIRE_SIDE_X;
export const FIRE_BUTTON_Y = STRIP_INNER_TOP;

// "HIT!" or "MISS", under the button.
const SHOT_STATUS_GAP = 4;
export const SHOT_STATUS_X = FIRE_SIDE_X;
export const SHOT_STATUS_Y =
  FIRE_BUTTON_Y + FIRE_BUTTON_HEIGHT + SHOT_STATUS_GAP;
export const SHOT_STATUS_WIDTH = FIRE_SIDE_WIDTH;
export const SHOT_STATUS_HEIGHT =
  STRIP_INNER_TOP + STRIP_INNER_HEIGHT - SHOT_STATUS_Y;

// ============== Asteroids ==============
// Sprites in client/public/assets/. The destroyed one replaces the intact one
// when the shot hits.
export const ASTEROID_SPRITE_URL = '/assets/asteroid.png';
export const DESTROYED_ASTEROID_SPRITE_URL = '/assets/asteroid-destroyed.png';
export const SHOT_COLOR = '#22c55e';
