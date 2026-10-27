/// <reference lib="dom" />

import Konva from 'konva';

/** Displays the game's title screen. */
export class TitleScreenView {
  private group: Konva.Group;

  /**
   * Builds the title screen.
   * @param onStart Called when the player selects Start.
   */
  constructor(onStart: () => void) {
    this.group = new Konva.Group();

    Konva.Image.fromURL('/assets/background.jpeg', image => {
      image.width(800);
      image.height(500);
      this.group.add(image);
      image.moveToBottom();
      this.group.getLayer()?.batchDraw();
    });

    Konva.Image.fromURL('/assets/logo.png', image => {
      image.position({x: 200, y: 80});
      image.width(400);
      image.height(180);
      this.group.add(image);
      image.moveToTop();
      this.group.getLayer()?.batchDraw();
    });

    const startButton = new Konva.Group({x: 300, y: 320});

    const buttonBackground = new Konva.Rect({
      width: 200,
      height: 60,
      cornerRadius: 8,
      fill: '#3b82f6',
    });

    const buttonText = new Konva.Text({
      width: 200,
      height: 60,
      text: 'Start',
      align: 'center',
      verticalAlign: 'middle',
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#ffffff',
    });

    startButton.add(buttonBackground, buttonText);
    startButton.on('click tap', onStart);

    this.group.add(startButton);
  }

  /**
   * Gets the title screen group.
   * @returns The Konva group containing the title screen.
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
