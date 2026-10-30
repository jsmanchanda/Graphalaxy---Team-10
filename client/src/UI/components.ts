import Konva from 'konva';
import {
  TEXT_BOX_BORDER_COLOR,
  TEXT_BOX_FILL_COLOR,
  TEXT_COLOR,
  TEXT_FONT_FAMILY,
  TEXT_FONT_SIZE,
} from './constants';

/**
 * Base class for UI components. Holds the Konva group a screen displays.
 */
export abstract class Component {
  protected group: Konva.Group;

  /**
   * Creates the group at the given position.
   */
  constructor(x: number, y: number) {
    this.group = new Konva.Group({x, y});
  }

  /**
   * Gets the group to add to a screen.
   */
  getGroup(): Konva.Group {
    return this.group;
  }

  /**
   * Removes the component from the screen.
   */
  destroy(): void {
    this.group.destroy();
  }
}

/**
 * A box with text in the middle.
 */
export class TextBoxComponent extends Component {
  protected label: Konva.Text;

  /**
   * Builds the text box.
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
  ) {
    super(x, y);

    const box = new Konva.Rect({
      width,
      height,
      cornerRadius: 0,
      fill: TEXT_BOX_FILL_COLOR,
      stroke: TEXT_BOX_BORDER_COLOR,
    });

    this.label = new Konva.Text({
      width,
      height,
      text,
      align: 'center',
      verticalAlign: 'middle',
      fontSize: TEXT_FONT_SIZE,
      fontFamily: TEXT_FONT_FAMILY,
      fill: TEXT_COLOR,
    });

    this.group.add(box, this.label);
  }

  /**
   * Changes the font of the text.
   * @param fontFamily A loaded font's name, e.g. TITLE_FONT_FAMILY.
   * @returns This text box, so setters can be chained.
   */
  setFontFamily(fontFamily: string): this {
    this.label.fontFamily(fontFamily);
    return this;
  }

  /**
   * Changes the size of the text.
   * @param fontSize The size in pixels.
   * @returns This text box, so setters can be chained.
   */
  setFontSize(fontSize: number): this {
    this.label.fontSize(fontSize);
    return this;
  }
}

/**
 * A text box that calls onClick when clicked.
 */
export class ButtonComponent extends TextBoxComponent {
  /**
   * Builds the button.
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    onClick: () => void,
  ) {
    super(x, y, width, height, text);
    this.group.on('click tap', onClick);
  }
}

/**
 * An image loaded from a URL.
 */
export class ImageComponent extends Component {
  /**
   * Builds the image. It appears once it finishes loading.
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    url: string,
  ) {
    super(x, y);

    Konva.Image.fromURL(url, image => {
      image.width(width);
      image.height(height);
      this.group.add(image);
      this.group.getLayer()?.batchDraw();
    });
  }
}
