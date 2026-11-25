import Konva from 'konva';
import {TitleScreenView} from './screens/TitleScreenView';
import {InstructionsScreenView} from './screens/InstructionsScreenView';
import {ReadingScreenView} from './screens/ReadingScreenView';
import {QuestionScreenView} from './screens/QuestionScreenView';
import {RadioWaveMinigameView} from './screens/RadioWaveMinigameView';
import {QuestionResultScreenView} from './screens/QuestionResultView';
import {LessonIntroScreenView} from './screens/LessonIntroScreenView';
import {LessonResultScreenView} from './screens/LessonResultScreenView';
import {LoginScreenView} from './screens/LoginScreenView';
import {RetryWarningScreenView} from './screens/RetryWarningScreenView';
import {SettingsScreenView} from './screens/SettingsScreenView';

import {DESIGN_HEIGHT, DESIGN_WIDTH} from './constants';
import {ScreenModel, UiAction, View} from './types';
import {ImageComponent} from './components';
import {NavigationScreenView} from './screens/NavigationScreenView';
import {MiniGameSelectView} from './screens/MiniGameSelectView';
import {AsteroidMiniGameView} from '../Asteroids/views/AsteroidMiniGameView';

/** Renders different Konva screens */
export class UiManager {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private currentView: View | null = null;
  // A view set aside by suspendScreen, hidden and paused, until it is resumed
  // or discarded. Lets settings open over a minigame without restarting it.
  private suspendedView: View | null = null;
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
      '/assets/background.jpeg',
    );
    this.layer = new Konva.Layer({
      clip: {
        x: 0,
        y: 0,
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
      },
    });
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
   * Sets the current view aside so another screen can be shown in its place
   * without destroying it: the view is paused and hidden, and comes back as
   * it was on resumeScreen. A view already set aside is discarded first.
   */
  suspendScreen(): void {
    const view = this.currentView;
    if (view == null) return;
    this.discardSuspendedScreen();
    view.pause?.();
    view.getGroup().visible(false);
    this.suspendedView = view;
    this.currentView = null;
    this.layer.batchDraw();
  }

  /**
   * Brings back the view set aside by suspendScreen in place of the current
   * one, which is destroyed, and lets it carry on.
   * @returns false, changing nothing, if no view was set aside
   */
  resumeScreen(): boolean {
    const view = this.suspendedView;
    if (view == null) return false;
    this.suspendedView = null;
    this.destroyView(this.currentView);
    this.currentView = view;
    // On top, in case anything was added to the layer meanwhile.
    view.getGroup().moveToTop();
    view.getGroup().visible(true);
    view.resume?.();
    this.layer.batchDraw();
    return true;
  }

  /**
   * Destroys the view set aside by suspendScreen, if any, e.g. when the
   * player logs out from the settings screen opened over a minigame.
   */
  discardSuspendedScreen(): void {
    this.destroyView(this.suspendedView);
    this.suspendedView = null;
  }

  /**
   * Cleans up a view and removes it from the layer.
   * @param view the view to destroy, or null for none
   */
  private destroyView(view: View | null): void {
    if (view == null) return;
    view.destroy?.();
    view.getGroup().destroy();
  }

  /**
   * Renders different types of screens. Replaces the current view; a view
   * set aside by suspendScreen is kept until it is resumed or discarded.
   * @param model Screens data to be displayed
   */
  displayScreen(model: ScreenModel): void {
    this.destroyView(this.currentView);
    switch (model.type) {
      case 'login':
        this.currentView = new LoginScreenView(this.onAction, model);
        break;
      case 'title':
        this.currentView = new TitleScreenView(this.onAction, model);
        break;
      case 'instructions':
        this.currentView = new InstructionsScreenView(this.onAction, model);
        break;
      case 'intro':
        this.currentView = new LessonIntroScreenView(this.onAction, model);
        break;
      case 'navigation':
        this.currentView = new NavigationScreenView(this.onAction, model);
        break;
      case 'miniGameSelect':
        this.currentView = new MiniGameSelectView(this.onAction, model);
        break;
      case 'asteroidMinigame':
        this.currentView = new AsteroidMiniGameView(this.onAction);
        break;
      case 'reading':
        this.currentView = new ReadingScreenView(this.onAction, model);
        break;
      case 'radioWaveMinigame':
        this.currentView = new RadioWaveMinigameView(this.onAction, model);
        break;
      case 'question':
        this.currentView = new QuestionScreenView(this.onAction, model);
        break;
      case 'questionResult':
        this.currentView = new QuestionResultScreenView(this.onAction, model);
        break;
      case 'lessonResult':
        this.currentView = new LessonResultScreenView(this.onAction, model);
        break;
      case 'retryWarning':
        this.currentView = new RetryWarningScreenView(this.onAction, model);
        break;
      case 'settings':
        this.currentView = new SettingsScreenView(this.onAction, model);
        break;
      default: {
        // Fails to compile if a new screen type is added without a case
        const unhandled: never = model;
        throw new Error(`Unknown screen: ${JSON.stringify(unhandled)}`);
      }
    }
    this.layer.add(this.currentView.getGroup());
  }
}
