/// <reference lib="dom" />

import Konva from 'konva';
import {TitleScreenView} from './screens/titleScreenView';

const DESIGN_WIDTH = 800;
const DESIGN_HEIGHT = 500;

/** Sets up the Konva stage and screens. */
export class UiManager {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private titleScreen: TitleScreenView;

  /**
   * Sets up the UI.
   * @param containerId The Konva container.
   */
  constructor(containerId: string) {
    this.stage = new Konva.Stage({
      container: containerId,
      width: window.innerWidth,
      height: window.innerHeight,
    });
    this.layer = new Konva.Layer();
    this.titleScreen = new TitleScreenView(() => {
      console.log('Start button clicked');
    });

    this.layer.add(this.titleScreen.getGroup());
    this.stage.add(this.layer);
  }

  /** Starts the UI. */
  start(): void {
    this.resizeStage();
    window.addEventListener('resize', () => this.resizeStage());
  }

  private resizeStage(): void {
    const scale = Math.min(
      window.innerWidth / DESIGN_WIDTH,
      window.innerHeight / DESIGN_HEIGHT,
    );

    this.stage.size({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    this.layer.scale({x: scale, y: scale});
    this.layer.position({
      x: (window.innerWidth - DESIGN_WIDTH * scale) / 2,
      y: (window.innerHeight - DESIGN_HEIGHT * scale) / 2,
    });
    this.layer.draw();
  }
}
