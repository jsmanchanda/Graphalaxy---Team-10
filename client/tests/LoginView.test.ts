import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import type {UiAction} from '../src/UI/types';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  LOGIN_BUTTON_HEIGHT,
  LOGIN_BUTTON_WIDTH,
  LOGIN_BUTTON_X,
  LOGIN_BUTTON_Y,
  LOGIN_INPUT_HEIGHT,
  LOGIN_INPUT_Y,
  LOGIN_MESSAGE_HEIGHT,
  LOGIN_MESSAGE_Y,
  LOGIN_PROMPT_HEIGHT,
  LOGIN_PROMPT_Y,
  LOGIN_ROW_WIDTH,
  LOGIN_ROW_X,
  LOGIN_TITLE_HEIGHT,
  LOGIN_TITLE_WIDTH,
  LOGIN_TITLE_X,
  LOGIN_TITLE_Y,
  LOGIN_USERNAME_MAX_LENGTH,
} from '../src/UI/constants';

// Every text box and button the screen builds, in build order.
const made = vi.hoisted(() => ({
  boxes: [] as Array<{text: string}>,
  buttons: [] as Array<{text: string; click: () => void}>,
}));

// Replace the components so no canvas is needed: Konva.Text measures itself
// with one. The fakes record their text and click handler instead.
vi.mock('../src/UI/components', () => {
  class TextBoxComponent {
    private group: Konva.Group;
    private box: {text: string};

    constructor(
      x: number,
      y: number,
      width: number,
      height: number,
      text: string,
    ) {
      this.group = new Konva.Group({x, y, width, height});
      this.box = {text};
      made.boxes.push(this.box);
    }

    getGroup(): Konva.Group {
      return this.group;
    }

    setText(text: string): this {
      this.box.text = text;
      return this;
    }

    setFontFamily(): this {
      return this;
    }

    setFontSize(): this {
      return this;
    }
  }

  class ButtonComponent {
    private group: Konva.Group;

    constructor(
      x: number,
      y: number,
      width: number,
      height: number,
      text: string,
      onClick: () => void,
    ) {
      this.group = new Konva.Group({x, y, width, height});
      made.buttons.push({text, click: onClick});
    }

    getGroup(): Konva.Group {
      return this.group;
    }
  }

  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ButtonComponent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    TextBoxComponent,
  };
});

import {LoginScreenView} from '../src/UI/screens/LoginScreenView';

type KeyListener = (event: KeyboardEvent) => void;

// The keydown listeners currently registered on the fake window.
let listeners: KeyListener[] = [];

/** Presses a key, and returns the event so the test can inspect it. */
function press(key: string, modifiers: {ctrlKey?: boolean} = {}) {
  const event = {key, ...modifiers, preventDefault: vi.fn()};
  for (const listener of [...listeners]) {
    listener(event as unknown as KeyboardEvent);
  }
  return event;
}

/** Presses each character of the text in turn. */
const typeText = (text: string) => Array.from(text).forEach(key => press(key));

/** The texts of the text boxes on screen, in build order. */
const texts = () => made.boxes.map(box => box.text);

/** Builds the login screen and returns it with its action callback. */
function build(username = '', message?: string) {
  const onAction = vi.fn<(action: UiAction) => void>();
  const view = new LoginScreenView(onAction, {
    type: 'login',
    username,
    message,
  });
  return {view, onAction};
}

// Ensures that the component fits within the design dimensions
function checkBounds(x: number, y: number, width: number, height: number) {
  expect(x).toBeGreaterThanOrEqual(0);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(x + width).toBeLessThanOrEqual(DESIGN_WIDTH);
  expect(y + height).toBeLessThanOrEqual(DESIGN_HEIGHT);
}

beforeEach(() => {
  made.boxes.length = 0;
  made.buttons.length = 0;
  listeners = [];
  vi.stubGlobal('window', {
    addEventListener: (type: string, listener: KeyListener) => {
      if (type === 'keydown') listeners.push(listener);
    },
    removeEventListener: (type: string, listener: KeyListener) => {
      if (type === 'keydown') listeners = listeners.filter(l => l !== listener);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginScreenView', () => {
  it('shows the title, a prompt, an empty username and a Log In button', () => {
    const {view, onAction} = build();

    expect(texts()).toEqual(['Graphalaxy', 'Type your username', '_']);
    expect(made.buttons.map(b => b.text)).toEqual(['Log In']);
    expect(view.getGroup().getChildren()).toHaveLength(4);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('starts with the username and message it was given', () => {
    const {view} = build('amy', 'Server offline. Try again.');

    expect(texts()).toEqual([
      'Graphalaxy',
      'Type your username',
      'amy_',
      'Server offline. Try again.',
    ]);
    expect(view.getGroup().getChildren()).toHaveLength(5);
  });

  it('shows the username as it is typed', () => {
    build();

    typeText('amy');

    expect(texts()[2]).toBe('amy_');
  });

  it('removes the last character on Backspace', () => {
    build('amy');

    press('Backspace');
    press('Backspace');
    typeText('l');

    expect(texts()[2]).toBe('al_');
  });

  it('stops the username at its maximum length', () => {
    build();

    typeText('x'.repeat(LOGIN_USERNAME_MAX_LENGTH + 5));

    expect(texts()[2]).toBe('x'.repeat(LOGIN_USERNAME_MAX_LENGTH) + '_');
  });

  it('logs in with the typed username when Enter is pressed', () => {
    const {onAction} = build();

    typeText('amy');
    press('Enter');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: 'login',
      username: 'amy',
    });
  });

  it('logs in with the typed username when Log In is pressed', () => {
    const {onAction} = build('am');

    typeText('y');
    made.buttons[0].click();

    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: 'login',
      username: 'amy',
    });
  });

  it('reports an empty username as it is, for Game Manager to refuse', () => {
    const {onAction} = build();

    press('Enter');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: 'login',
      username: '',
    });
  });

  it('keeps the browser from also acting on the keys it uses', () => {
    build();

    expect(press('a').preventDefault).toHaveBeenCalledTimes(1);
    expect(press('Backspace').preventDefault).toHaveBeenCalledTimes(1);
    expect(press('Enter').preventDefault).toHaveBeenCalledTimes(1);
  });

  it('leaves other keys and shortcuts to the browser', () => {
    build('amy');

    expect(press('Tab').preventDefault).not.toHaveBeenCalled();
    expect(press('F5').preventDefault).not.toHaveBeenCalled();
    expect(press('r', {ctrlKey: true}).preventDefault).not.toHaveBeenCalled();
    expect(texts()[2]).toBe('amy_');
  });

  it('stops listening to the keyboard when it is destroyed', () => {
    const {view, onAction} = build();
    expect(listeners).toHaveLength(1);

    view.destroy();
    typeText('amy');
    press('Enter');

    expect(listeners).toHaveLength(0);
    expect(texts()[2]).toBe('_');
    expect(onAction).not.toHaveBeenCalled();
  });
});

describe('login screen bounds', () => {
  it('keeps every component inside the screen', () => {
    checkBounds(
      LOGIN_TITLE_X,
      LOGIN_TITLE_Y,
      LOGIN_TITLE_WIDTH,
      LOGIN_TITLE_HEIGHT,
    );
    for (const [y, height] of [
      [LOGIN_PROMPT_Y, LOGIN_PROMPT_HEIGHT],
      [LOGIN_INPUT_Y, LOGIN_INPUT_HEIGHT],
      [LOGIN_MESSAGE_Y, LOGIN_MESSAGE_HEIGHT],
    ]) {
      checkBounds(LOGIN_ROW_X, y, LOGIN_ROW_WIDTH, height);
    }
    checkBounds(
      LOGIN_BUTTON_X,
      LOGIN_BUTTON_Y,
      LOGIN_BUTTON_WIDTH,
      LOGIN_BUTTON_HEIGHT,
    );
  });

  it('stacks the components top to bottom without overlap', () => {
    expect(LOGIN_PROMPT_Y).toBeGreaterThanOrEqual(
      LOGIN_TITLE_Y + LOGIN_TITLE_HEIGHT,
    );
    expect(LOGIN_INPUT_Y).toBeGreaterThanOrEqual(
      LOGIN_PROMPT_Y + LOGIN_PROMPT_HEIGHT,
    );
    expect(LOGIN_MESSAGE_Y).toBeGreaterThanOrEqual(
      LOGIN_INPUT_Y + LOGIN_INPUT_HEIGHT,
    );
    expect(LOGIN_BUTTON_Y).toBeGreaterThanOrEqual(
      LOGIN_MESSAGE_Y + LOGIN_MESSAGE_HEIGHT,
    );
  });

  it('never lets a username be typed longer than the server accepts', () => {
    expect(LOGIN_USERNAME_MAX_LENGTH).toBeLessThanOrEqual(32);
  });
});
