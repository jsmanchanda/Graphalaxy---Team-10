import Konva from 'konva';
import {
  BUBBLE_FONT_SIZE,
  BUBBLE_TAIL_HEIGHT,
  BUBBLE_TAIL_WIDTH,
  TEXT_BOX_BORDER_COLOR,
  TEXT_BOX_FILL_COLOR,
  TEXT_COLOR,
  TEXT_FONT_FAMILY,
  TEXT_FONT_SIZE,
} from './constants';
import {getCachedImage} from './imageCache';

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
 * A speech bubble for the alien friend, with a tail on the bottom-left
 * pointing back at the alien.
 */
export class AlienDialogue extends Component {
  protected bubble: Konva.Shape;
  protected dialogue: Konva.Text;

  /**
   * Builds the speech bubble. The width includes the tail.
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    dialogue: string,
  ) {
    super(x, y);

    this.bubble = new Konva.Shape({
      width,
      height,
      fill: TEXT_BOX_FILL_COLOR,
      stroke: TEXT_BOX_BORDER_COLOR,
      sceneFunc(context, shape) {
        const w = shape.width();
        const h = shape.height();

        context.beginPath();
        context.moveTo(0, h);
        context.lineTo(w, h);
        context.lineTo(w, 0);
        context.lineTo(BUBBLE_TAIL_WIDTH, 0);
        context.lineTo(BUBBLE_TAIL_WIDTH, h - BUBBLE_TAIL_HEIGHT);
        context.closePath();
        context.fillStrokeShape(shape);
      },
    });

    this.group.add(this.bubble);

    this.dialogue = new Konva.Text({
      x: BUBBLE_TAIL_WIDTH,
      y: 0,
      text: dialogue,
      width: width - BUBBLE_TAIL_WIDTH,
      height,
      align: 'center',
      verticalAlign: 'middle',
      fontSize: BUBBLE_FONT_SIZE,
      fontFamily: TEXT_FONT_FAMILY,
      fill: TEXT_COLOR,
    });

    this.group.add(this.dialogue);
  }

  /**
   * Changes the width of the bubble, keeping the text beside the tail.
   * @param width The new full width, including the tail.
   * @returns This dialogue, so setters can be chained.
   */
  setWidth(width: number): this {
    this.bubble.width(width);
    this.dialogue.width(width - BUBBLE_TAIL_WIDTH);
    return this;
  }

  /**
   * Changes what the alien says, e.g. to show a hint.
   * @param text The new dialogue.
   * @returns This dialogue, so setters can be chained.
   */
  setText(text: string): this {
    this.dialogue.text(text);
    return this;
  }
}

/**
 * A box with text in the middle.
 */
export class TextBoxComponent extends Component {
  protected label: Konva.Text;
  protected box: Konva.Rect;

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

    this.box = new Konva.Rect({
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

    this.group.add(this.box, this.label);
  }

  /**
   * Changes the width of the box and its text.
   * @param width The new width in pixels.
   * @returns This text box, so setters can be chained.
   */
  setWidth(width: number): this {
    this.box.width(width);
    this.label.width(width);
    return this;
  }

  /**
   * Changes the text shown in the box.
   * @param text The new text.
   * @returns This text box, so setters can be chained.
   */
  setText(text: string): this {
    this.label.text(text);
    return this;
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

  /**
   * sets font color
   */
  setTextColor(color: string): this {
    this.label.fill(color);
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
   * Builds the image. A preloaded image appears right away; any other image appears once it finishes loading.
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    url: string,
    isGrayscale: boolean = false,
  ) {
    super(x, y);

    const addImage = (image: Konva.Image): void => {
      image.width(width);
      image.height(height);
      this.group.add(image);

      if (isGrayscale) {
        image.filters([Konva.Filters.Grayscale]);
        image.cache();
      }

      this.group.getLayer()?.batchDraw();
    };

    const cached = getCachedImage(url);
    if (cached) {
      addImage(new Konva.Image({image: cached}));
    } else {
      Konva.Image.fromURL(url, addImage);
    }
  }

  /**
   * Sets opacity of image
   */
  setOpacity(o: number): this {
    this.group.opacity(o);
    this.group.getLayer()?.batchDraw();
    return this;
  }

  /**
   * Forward event listeners directly to the hitbox so image can be interactive
   */
  on(evtStr: string, handler: (e: Konva.KonvaEventObject<MouseEvent>) => void) {
    this.group.on(evtStr, handler);
  }
}
