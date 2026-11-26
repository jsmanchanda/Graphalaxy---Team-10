import Konva from 'konva';
import {SettingsIconComponent} from '../../UI/components';
import type {UiAction, View} from '../../UI/types';
import {AsteroidMiniGameController} from '../AsteroidMiniGameController';
import {AsteroidMiniGameModel} from '../AsteroidMiniGameModel';
import type {Screen} from '../types';
import {AsteroidGameView, type CreateInputs} from './AsteroidGameView';
import {AsteroidIntroView} from './AsteroidIntroView';
import {AsteroidResultView} from './AsteroidResultView';

/** Only tests pass these; UiManager passes neither. */
export interface AsteroidMiniGameViewOptions {
  /** The run to play; tests pass one with hand-made questions. */
  model?: AsteroidMiniGameModel;
  /** Builds the coefficient boxes; tests pass a fake (Vitest has no DOM). */
  createInputs?: CreateInputs;
}

/**
 * The asteroid minigame as one screen for UiManager. It runs the controller
 * and swaps the intro, game and result screens inside its own group, under
 * the settings icon. When the player leaves, it sends endMiniGame, with a
 * hint only for 3/3. While the settings screen is open, UiManager pauses it
 * and the current screen hides its HTML boxes.
 */
export class AsteroidMiniGameView implements View {
  private readonly group = new Konva.Group();
  // Holds the one screen showing now; the settings icon sits above it.
  private readonly screens = new Konva.Group({name: 'asteroidScreens'});
  private readonly controller: AsteroidMiniGameController;
  private readonly createInputs?: CreateInputs;
  private current: View | null = null;

  /**
   * Starts a run and shows its intro screen.
   * @param onAction UiManager's action callback; gets endMiniGame at the end
   * @param options test-only overrides
   */
  constructor(
    onAction: (action: UiAction) => void,
    options: AsteroidMiniGameViewOptions = {},
  ) {
    this.createInputs = options.createInputs;
    const settingsIcon = new SettingsIconComponent(() =>
      onAction({type: 'openSettings'}),
    );
    this.group.add(this.screens, settingsIcon.getGroup());
    this.controller = new AsteroidMiniGameController(
      screen => this.mount(screen),
      result =>
        onAction({
          type: 'endMiniGame',
          addHint: result.correct === result.attempted,
        }),
      options.model,
    );
    // After this.controller is set, since start() calls mount right away.
    this.controller.start();
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Konva.Group {
    return this.group;
  }

  /** Pauses the current screen while the settings screen is open. */
  pause(): void {
    this.current?.pause?.();
  }

  /** Carries on with the current screen after pause. */
  resume(): void {
    this.current?.resume?.();
  }

  /**
   * Replaces the current screen with the one the controller asked for.
   * Destroying the old screen's group also removes the game screen's HTML
   * boxes.
   * @param screen which screen to show
   */
  private mount(screen: Screen): void {
    this.current?.getGroup().destroy();
    this.current = this.build(screen);
    this.screens.add(this.current.getGroup());
    this.group.getLayer()?.batchDraw();
  }

  /**
   * Builds the view for a screen.
   * @param screen which screen to build
   * @returns the new view
   */
  private build(screen: Screen): View {
    switch (screen.type) {
      case 'AsteroidIntro':
        return new AsteroidIntroView(() => this.controller.launch());
      case 'AsteroidGame':
        return new AsteroidGameView(this.controller, this.createInputs);
      case 'AsteroidResult':
        return new AsteroidResultView(this.controller);
      default: {
        // Fails to compile if a new screen type is added without a case
        const unhandled: never = screen;
        throw new Error(`Unknown screen: ${JSON.stringify(unhandled)}`);
      }
    }
  }
}
