import {describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from './helpers/konvaStubs';
import type {UiAction} from '../src/UI/types';
import {InstructionsScreenView} from '../src/UI/screens/InstructionsScreenView';
import {GAME_INSTRUCTIONS, INSTRUCTIONS_TEXT} from '../src/UI/instructions';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  INSTRUCTIONS_TEXT_HEIGHT,
  INSTRUCTIONS_TEXT_WIDTH,
  INSTRUCTIONS_TEXT_X,
  INSTRUCTIONS_TEXT_Y,
  NEXT_BUTTON_Y,
} from '../src/UI/constants';

// Build the real components in Node; see helpers/konvaStubs.ts
installKonvaStubs();

/** Builds the screen and returns it with its action callback. */
function build() {
  const onAction = vi.fn<(action: UiAction) => void>();
  const screen = new InstructionsScreenView(onAction, {
    type: 'instructions',
  }).getGroup();
  return {onAction, screen};
}

/** Every text shown on the screen. */
function texts(screen: Konva.Group): string[] {
  return screen
    .find((node: Konva.Node) => typeof node.getAttr('text') === 'string')
    .map(node => String(node.getAttr('text')));
}

/** Clicks the button (a top-level group) that shows the given text. */
function press(screen: Konva.Group, label: string): void {
  const button = screen
    .getChildren()
    .find(
      (child: Konva.Node) =>
        child instanceof Konva.Group &&
        child
          .getChildren()
          .some((node: Konva.Node) => node.getAttr('text') === label),
    );
  if (!button) throw new Error(`no "${label}" button on screen`);
  button.fire('click');
}

describe('InstructionsScreenView', () => {
  it('shows every step of how to play', () => {
    const {screen} = build();

    expect(texts(screen)).toContain(INSTRUCTIONS_TEXT);
    for (const step of GAME_INSTRUCTIONS) {
      expect(INSTRUCTIONS_TEXT).toContain(step);
    }
  });

  it("opens the map when Let's go! is pressed", () => {
    const {screen, onAction} = build();

    press(screen, "Let's go!");

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'next'});
  });

  it('goes back when Back is pressed', () => {
    const {screen, onAction} = build();

    press(screen, 'Back');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'back'});
  });

  it('opens the settings when the settings icon is clicked', () => {
    const {screen, onAction} = build();

    screen.findOne('.settingsIcon')?.fire('click');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'openSettings'});
  });

  it('keeps the steps inside the screen, above the buttons', () => {
    expect(INSTRUCTIONS_TEXT_X).toBeGreaterThanOrEqual(0);
    expect(INSTRUCTIONS_TEXT_X + INSTRUCTIONS_TEXT_WIDTH).toBeLessThanOrEqual(
      DESIGN_WIDTH,
    );
    expect(INSTRUCTIONS_TEXT_Y + INSTRUCTIONS_TEXT_HEIGHT).toBeLessThanOrEqual(
      Math.min(NEXT_BUTTON_Y, DESIGN_HEIGHT),
    );
  });
});
