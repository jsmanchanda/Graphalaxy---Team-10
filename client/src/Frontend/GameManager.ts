// --- view stuff ---
import {ScreenModel, UiAction} from '../UI/types';
import {UiManager} from '../UI/UIManager';
import {SessionCache} from './SessionCache';

// --- screenModelMaker ---
import * as screenModelMaker from './screenModelMaker';

// --- SessionCacheModels ---
// import {Planet, Task, QuestionTask} from './SessionCacheModels';
import {Task, QuestionTask} from './SessionCacheModels';

// for MVP
const DEMO_USERNAME = 'demo';
const DEMO_PLANET_ID = 1;

/**
 * GameManager - coordinates game logic between SessionCache and UiManager
 * Kind of like the controller in MVC where SessionCache is the model and UiManager is the view
 */
export class GameManager {
  private ui: UiManager;

  private session: SessionCache;
  private taskIndex: number;

  /**
   * Creates a new GameManager instance.
   * @param session the SessionCache instance to use for game data
   */
  constructor(session: SessionCache = new SessionCache()) {
    this.ui = new UiManager('container', action => this.handleAction(action));
    this.session = session;
    this.taskIndex = 0;
  }

  /**
   * Starts the game by logging in the demo user and loading the demo planet.
   * @returns a promise that resolves when the game has started or failed to start
   */
  async start(): Promise<void> {
    try {
      await this.session.login(DEMO_USERNAME);
      await this.session.loadPlanet(DEMO_PLANET_ID);
    } catch (error) {
      console.error(error);
      this.ui.displayScreen({type: 'title', title: 'Server offline'});
      return;
    }
    this.ui.displayScreen({type: 'title', title: 'Graphalaxy'});
  }

  /**
   * Handles a user click action
   * @param action the type of button that is clicked
   */
  private handleAction(action: UiAction): void {
    // update view (UIManager)
    const planet = this.session.currentPlanet;
    if (!planet) {
      return;
    }
    switch (action.type) {
      case 'start': {
        this.taskIndex = 0;
        const screenModel: ScreenModel = screenModelMaker.makeLessonIntroScreen(
          planet.name,
          planet.introText,
        );
        this.ui.displayScreen(screenModel);
        break;
      }
      case 'answer': {
        const task = planet.tasks[this.taskIndex];
        if (!(task instanceof QuestionTask)) {
          return;
        }
        const screenModel = screenModelMaker.makeQuestionResultScreen(
          action.option === task.correct,
        );
        this.ui.displayScreen(screenModel);
        break;
      }
      case 'next': {
        this.taskIndex++;
        if (this.taskIndex >= planet.tasks.length) {
          this.ui.displayScreen({
            type: 'title',
            title: 'this is not actually a title screen',
          });
        } else {
          const task: Task = planet.tasks[this.taskIndex];
          const screenModel: ScreenModel = screenModelMaker.taskToScreen(task);
          this.ui.displayScreen(screenModel);
        }
        break;
      }
      case 'back': {
        this.taskIndex--;
        if (this.taskIndex < 0) {
          const screenModel = screenModelMaker.makeLessonIntroScreen(
            planet.name,
            planet.introText,
          );
          this.ui.displayScreen(screenModel);
        } else {
          const task: Task = planet.tasks[this.taskIndex];
          const screenModel: ScreenModel = screenModelMaker.taskToScreen(task);
          this.ui.displayScreen(screenModel);
        }
        break;
      }
    }
  }
}
