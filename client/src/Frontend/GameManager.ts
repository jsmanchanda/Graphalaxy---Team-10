// --- view stuff ---
import {ScreenModel, UiAction} from '../UI/types';
import {UiManager} from '../UI/UIManager';

// --- screenModelMaker ---
import * as screenModelMaker from './screenModelMaker';

// --- SessionCacheModels ---
import {Planet, Task, QuestionTask} from './SessionCacheModels';

// for MVP
const VALID_READING = {type: 'Reading', text: 'The slope is m.'};
const VALID_QUESTION = {
  type: 'Question',
  prompt: 'What is the slope of y = 2x + 3?',
  options: ['1', '101', '2', '3'],
  correct: 0,
};
const VALID_PLANET = {
  planetId: 1,
  name: 'Linear Land',
  introText: 'A hostile world of straight lines.',
  graphOrder: 0,
  tasks: [VALID_READING, VALID_QUESTION],
};

/**
 * GameManager - coordinates game logic between SessionCache and UiManager
 * Kind of like the controller in MVC where SessionCache is the model and UiManager is the view
 */
export class GameManager {
  private ui: UiManager;

  private planet: Planet;
  private taskIndex: number;

  constructor() {
    this.ui = new UiManager('container', action => this.handleAction(action));

    this.planet = Planet.createFromJson(JSON.stringify(VALID_PLANET));
    this.taskIndex = 0;
  }

  /**
   * Start the session
   */
  start(): void {
    this.ui.displayScreen({type: 'title', title: 'Graphalaxy'});
  }

  /**
   * Handles a user click action
   * @param action the type of button that is clicked
   */
  private handleAction(action: UiAction): void {
    // update view (UIManager)
    switch (action.type) {
      case 'start': {
        this.taskIndex = 0;
        const screenModel: ScreenModel = screenModelMaker.makeLessonIntroScreen(
          this.planet.name,
          this.planet.introText,
        );
        this.ui.displayScreen(screenModel);
        break;
      }
      case 'answer': {
        const task = this.planet.tasks[this.taskIndex];
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
        if (this.taskIndex >= this.planet.tasks.length) {
          this.ui.displayScreen({
            type: 'title',
            title: 'this is not actually a title screen',
          });
        } else {
          const task: Task = this.planet.tasks[this.taskIndex];
          const screenModel: ScreenModel = screenModelMaker.taskToScreen(task);
          this.ui.displayScreen(screenModel);
        }
        break;
      }
      case 'back': {
        this.taskIndex--;
        if (this.taskIndex <= 0) {
          const screenModel = screenModelMaker.makeLessonIntroScreen(
            this.planet.name,
            this.planet.introText,
          );
          this.ui.displayScreen(screenModel);
        } else {
          const task: Task = this.planet.tasks[this.taskIndex];
          const screenModel: ScreenModel = screenModelMaker.taskToScreen(task);
          this.ui.displayScreen(screenModel);
        }
        break;
      }
    }
  }
}
