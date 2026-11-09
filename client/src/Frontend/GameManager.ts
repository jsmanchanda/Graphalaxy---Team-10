import type {Planet, QuestionTask, Task} from '@graphalaxy/shared';

// --- View Objects ---
import {ScreenModel, UiAction} from '../UI/types';
import {UiManager} from '../UI/UIManager';
import {SessionCache} from './SessionCache';
import {ApiError} from './ApiError';

// --- screenModelMaker ---
import * as screenModelMaker from './screenModelMaker';
import {allPlanets, PlanetSummary} from '../demos/NavigationDemo';

// for MVP
const DEMO_USERNAME = 'demo';
const DEMO_PLANET_ID = 1;
const INTRO_INDEX = -1;
const DEMO_ALL_PLANETS: PlanetSummary[] = allPlanets;

/**
 * GameManager - coordinates game logic between SessionCache and UiManager
 * Kind of like the controller in MVC where SessionCache is the model and UiManager is the view
 */
export class GameManager {
  private ui: UiManager;
  private session: SessionCache;

  private currentPlanetId: number;
  private allPlanets: PlanetSummary[];
  private taskIndex: number;

  private answerPending = false; // True while an answer is with the server, so a double click sends one.

  /**
   * Creates a new GameManager instance.
   * @param session the SessionCache instance to use for game data
   */
  constructor(session: SessionCache = new SessionCache()) {
    this.ui = new UiManager('container', action => this.handleAction(action));
    this.session = session;
    this.currentPlanetId = 0;
    this.taskIndex = INTRO_INDEX;

    // TODO: put this in start() and call session manager for it
    this.allPlanets = DEMO_ALL_PLANETS;
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
      const offline =
        error instanceof ApiError &&
        (error.kind === 'network' || error.kind === 'timeout');
      this.ui.displayScreen({
        type: 'title',
        title: offline
          ? 'Server offline. Press Start to retry.'
          : "Couldn't load the game. Press Start to retry.",
      });
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
    console.log(action);
    const planet = this.session.currentPlanet;
    if (!planet) {
      if (action.type === 'start') {
        void this.start();
      }
      return;
    }
    switch (action.type) {
      case 'start': {
        const screenModel: ScreenModel = screenModelMaker.makeNavScreen(
          this.allPlanets,
        );
        this.ui.displayScreen(screenModel);
        break;
      }
      case 'navigate': {
        const screenModel: ScreenModel = screenModelMaker.makeNavScreen(
          this.allPlanets,
        );
        this.ui.displayScreen(screenModel);
        break;
      }
      case 'enterPlanet': {
        this.currentPlanetId = action.planetId;
        this.currentPlanetId = DEMO_PLANET_ID; // DEMO, need to remove
        // await this.session.loadPlanet(this.currentPlanetId);
        const screenModel: ScreenModel = screenModelMaker.makeLessonIntroScreen(
          planet.name,
          planet.introText,
        );
        this.ui.displayScreen(screenModel);
        break;
      }
      case 'answer': {
        const task = planet.tasks[this.taskIndex];
        if (task?.type !== 'Question' || this.answerPending) {
          return;
        }
        void this.submitAnswer(planet, task, action.option);
        break;
      }
      case 'next': {
        this.taskIndex++;
        if (this.taskIndex >= planet.tasks.length) {
          this.taskIndex = -1;
          const screenModel: ScreenModel = screenModelMaker.makeNavScreen(
            this.allPlanets,
          );
          this.ui.displayScreen(screenModel);
        } else {
          const task: Task = planet.tasks[this.taskIndex];
          const screenModel: ScreenModel = screenModelMaker.taskToScreen(task);
          this.ui.displayScreen(screenModel);
        }
        break;
      }
      case 'back': {
        if (this.taskIndex === INTRO_INDEX) {
          const screenModel: ScreenModel = screenModelMaker.makeNavScreen(
            this.allPlanets,
          );
          this.ui.displayScreen(screenModel);
        } else if (this.taskIndex === 0) {
          this.taskIndex--;
          const screenModel: ScreenModel =
            screenModelMaker.makeLessonIntroScreen(
              planet.name,
              planet.introText,
            );
          this.ui.displayScreen(screenModel);
        } else {
          this.taskIndex--;
          const task: Task = planet.tasks[this.taskIndex];
          const screenModel: ScreenModel = screenModelMaker.taskToScreen(task);
          this.ui.displayScreen(screenModel);
        }
        break;
      }
    }
  }

  /**
   * Sends the chosen option to the server, which grades it, then shows the
   * result. Drops the result if the player has moved to another slide or
   * planet in the meantime.
   * @param planet the planet the question is on
   * @param task the question being answered
   * @param optionIndex the index of the clicked option button
   */
  private async submitAnswer(
    planet: Planet,
    task: QuestionTask,
    optionIndex: number,
  ): Promise<void> {
    const option = task.question.options[optionIndex];
    if (!option) {
      return;
    }
    const taskIndex = this.taskIndex;
    const stillHere = () =>
      this.session.currentPlanet === planet && this.taskIndex === taskIndex;
    this.answerPending = true;
    try {
      const result = await this.session.submitAnswer(
        task.question.questionId,
        option.optionId,
      );
      if (stillHere()) {
        this.ui.displayScreen(
          screenModelMaker.makeQuestionResultScreen(result.correct),
        );
      }
    } catch (error) {
      console.error(error);
      if (stillHere()) {
        this.ui.displayScreen({
          type: 'questionResult',
          // TODO: show a different message for each ApiError kind.
          result: "We couldn't confirm your answer.",
        });
      }
    } finally {
      this.answerPending = false;
    }
  }
}
