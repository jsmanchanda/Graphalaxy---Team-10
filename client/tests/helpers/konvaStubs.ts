import Konva from 'konva';
import {vi} from 'vitest';

/**
 * Stand-in for Konva.Text. The real one needs a canvas to measure itself,
 * which Node does not have. This keeps the width, height and text it was
 * given, so tests can read them back with getAttr('text').
 */
export class FakeText extends Konva.Rect {
  /** No-op so TextBoxComponent.setFontFamily still works. */
  fontFamily(): this {
    return this;
  }

  /** No-op so TextBoxComponent.setFontSize still works. */
  fontSize(): this {
    return this;
  }
}

/**
 * Lets the real components, views and GraphComponent be built in Node.
 * Call it at the top of a test file, before anything is constructed.
 */
export function installKonvaStubs(): void {
  Reflect.set(Konva, 'Text', FakeText);

  // Images never load in Node; hand back an empty image right away instead.
  vi.spyOn(Konva.Image, 'fromURL').mockImplementation((url, callback) =>
    callback(new Konva.Image({image: undefined})),
  );
}
