/// <reference lib="dom" />

import Konva from 'konva';
import {TitleScreenView} from './screens/titleScreenView';
import {ReadingScreenView} from './screens/ReadingScreenView';
import {QuestionScreenView} from './screens/questionScreenView';
import {QuestionResultScreenView} from './screens/questionResultView';
import {LessonResultScreenView} from './screens/LessonResultScreenView';

import {DESIGN_HEIGHT, DESIGN_WIDTH} from './constants';
import {ScreenModel, UiAction, View} from './types';
import {ImageComponent} from './components';

/** Renders different Konva screens */
export class UiManager {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private currentView: View | null = null;
  private onAction: (action: UiAction) => void;

  /**
   * Initializes Konva elements and renders background image
   * @param containerId The Konva container HTML id
   */
  constructor(containerId: string, onAction: (action: UiAction) => void) {
    this.stage = new Konva.Stage({
      container: containerId,
      width: window.innerWidth,
      height: window.innerHeight,
    });
    const background = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      'assets/background.jpeg',
    );
    this.layer = new Konva.Layer();
    this.layer.add(background.getGroup());
    this.stage.add(this.layer);

    this.onAction = onAction;

    this.resizeStage();
    window.addEventListener('resize', () => this.resizeStage());
  }

  /**
   * Resizes the screen when page is reformatted
   */
  private resizeStage(): void {
    const scale = Math.min(
      window.innerWidth / DESIGN_WIDTH,
      window.innerHeight / DESIGN_HEIGHT,
    );

    this.stage.size({width: window.innerWidth, height: window.innerHeight});
    this.layer.scale({x: scale, y: scale});
    this.layer.position({
      x: (window.innerWidth - DESIGN_WIDTH * scale) / 2,
      y: (window.innerHeight - DESIGN_HEIGHT * scale) / 2,
    });
    this.layer.batchDraw();
  }

  /**
   * Renders different types of screens
   * @param model Screens data to be displayed
   */
  displayScreen(model: ScreenModel): void {
    if (this.currentView != null) {
      this.currentView.getGroup().destroy();
    }
    switch (model.type) {
      case 'title':
        this.currentView = new TitleScreenView(this.onAction, model);
        this.layer.add(this.currentView.getGroup());
        break;
      case 'question':
        this.currentView = new QuestionScreenView(this.onAction, model);
        this.layer.add(this.currentView.getGroup());
        break;
      case 'reading':
        this.currentView = new ReadingScreenView(this.onAction, model);
        break;
      case 'questionResult':
        this.currentView = new QuestionResultScreenView(this.onAction, model);
        break;
      case 'lessonResult':
        this.currentView = new LessonResultScreenView(this.onAction, model);
        break;
      default: {
        // Fails to compile if a new screen type is added without a case
        const unhandled: never = model;
        throw new Error(`Unknown screen: ${JSON.stringify(unhandled)}`);
      }
    }
  }
}
