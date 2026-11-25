import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  FONT_CONTHRAX,
  TEXT_BOX_FILL_COLOR,
} from '../../UI/constants';
import {EQUATION_ROW_HEIGHT, INPUT_GAP, INPUT_WIDTH} from '../constants';

// Sizes in design-canvas units; multiplied by the current scale.
const FONT_SIZE = 14;
const PADDING = 4;
const LABEL_GAP = 4;
const BORDER_RADIUS = 4;

/** What CoefficientInputs needs. */
export interface CoefficientInputsOptions {
  /** One box per letter, in order, e.g. FORMS[formId].coefficients. */
  letters: string[];
  /** Left edge of the row, in design-canvas units. */
  x: number;
  /** Top edge of the row, in design-canvas units. */
  y: number;
  /** Called on every keystroke with every box's text. */
  onInput: (values: string[]) => void;
  /** Called when Enter is pressed in any box. */
  onEnter: () => void;
}

/**
 * What a view uses from the input row. The game view takes a factory that
 * returns one, so its tests can pass a fake (Vitest has no DOM).
 */
export interface CoefficientInputsHandle {
  /** What is typed in each box, one string per letter, in order. */
  values(): string[];
  /** Puts the cursor in the first box. */
  focus(): void;
  /** Locks every box after Fire; they stay visible. */
  disable(): void;
  /**
   * Hides or shows the row, keeping what is typed, e.g. while the settings
   * screen is open over the minigame.
   */
  setVisible(visible: boolean): void;
  /** Removes the boxes from the page. Safe to call twice. */
  remove(): void;
}

/**
 * The row of boxes the player types coefficients into: `a = [ ] h = [ ]`.
 * Konva has no text input, so these are HTML inputs placed over the canvas,
 * the same way the radio wave minigame does it.
 *
 * The values are raw text: the controller parses them with
 * parseCoefficient, so typed text never reaches `new Function`.
 */
export class CoefficientInputs implements CoefficientInputsHandle {
  private readonly row: HTMLDivElement;
  private readonly inputs: HTMLInputElement[];
  private readonly x: number;
  private readonly y: number;
  private readonly reposition = () => this.position();

  /**
   * Builds the boxes (blank) and adds them to the page.
   * @param options the letters, position and callbacks
   */
  constructor(options: CoefficientInputsOptions) {
    this.x = options.x;
    this.y = options.y;

    this.row = document.createElement('div');
    Object.assign(this.row.style, {
      position: 'fixed',
      display: 'flex',
      alignItems: 'center',
      zIndex: '1',
      color: 'white',
      fontFamily: FONT_CONTHRAX,
      whiteSpace: 'nowrap',
    });

    this.inputs = options.letters.map(letter => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';

      const input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', letter);
      Object.assign(input.style, {
        boxSizing: 'border-box',
        border: '1px solid white',
        backgroundColor: TEXT_BOX_FILL_COLOR,
        color: 'white',
        fontFamily: FONT_CONTHRAX,
      });
      input.addEventListener('input', () => options.onInput(this.values()));
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          options.onEnter();
        }
      });

      // textContent, never innerHTML.
      const text = document.createElement('span');
      text.textContent = `${letter} =`;
      label.append(text, input);
      this.row.append(label);
      return input;
    });

    document.body.append(this.row);
    this.position();
    window.addEventListener('resize', this.reposition);
  }

  /**
   * What is typed in each box.
   * @returns one string per letter, in order
   */
  values(): string[] {
    return this.inputs.map(input => input.value);
  }

  /** Puts the cursor in the first box. */
  focus(): void {
    this.inputs[0]?.focus();
  }

  /** Locks every box after Fire; they stay visible. */
  disable(): void {
    for (const input of this.inputs) {
      input.disabled = true;
    }
  }

  /**
   * Hides or shows the row, keeping what is typed.
   * @param visible false to hide the row, true to show it again
   */
  setVisible(visible: boolean): void {
    this.row.style.display = visible ? 'flex' : 'none';
  }

  /** Removes the boxes and the resize listener. Safe to call twice. */
  remove(): void {
    this.row.remove();
    window.removeEventListener('resize', this.reposition);
  }

  /**
   * Places and sizes the row to match the canvas. This is the same maths
   * as UiManager.resizeStage (which is private), and it assumes the stage
   * fills the window from the top-left, as UiManager's does.
   */
  private position(): void {
    const scale = Math.min(
      window.innerWidth / DESIGN_WIDTH,
      window.innerHeight / DESIGN_HEIGHT,
    );
    const offsetX = (window.innerWidth - DESIGN_WIDTH * scale) / 2;
    const offsetY = (window.innerHeight - DESIGN_HEIGHT * scale) / 2;
    const px = (units: number) => `${units * scale}px`;

    this.row.style.left = `${offsetX + this.x * scale}px`;
    this.row.style.top = `${offsetY + this.y * scale}px`;
    this.row.style.height = px(EQUATION_ROW_HEIGHT);
    this.row.style.gap = px(INPUT_GAP);
    this.row.style.fontSize = px(FONT_SIZE);

    for (const input of this.inputs) {
      Object.assign(input.style, {
        width: px(INPUT_WIDTH),
        height: px(EQUATION_ROW_HEIGHT),
        padding: px(PADDING),
        borderRadius: px(BORDER_RADIUS),
        fontSize: px(FONT_SIZE),
        marginLeft: px(LABEL_GAP),
      });
    }
  }
}
