// --- view stuff ---
import {
  //   LessonIntroScreenModel,
  //   LessonResultScreenModel,
  //   Question as UiQuestion,
  //   QuestionResultScreenModel,
  //   QuestionScreenModel,
  //   ReadingScreenModel,
  ScreenModel,
  //   TitleScreenModel,
  UiAction,
  //   View,
} from '../UI/types';
import {UiManager} from '../UI/UIManager';

// // --- model stuff ---
// import {
//   Reading,
//   Question as SessionCacheQuestion, // BRING THIS UP IN STAND UP - duplicate
// } from './types';
// // --- SessionCacheModels ---
// import {
//   Settings,
//   Player,
//   Planet,
//   Task,
//   ReadingTask,
//   QuestionTask,
// } from './SessionCacheModels';

/**
 * GameManager - coordinates game logic between SessionCache and UiManager
 * Kind of like the view in MVC where SessionCache is the model and UiManager is the view
 */
export class GameManager {
  private ui: UiManager;

  // private session: SessionCache;

  private lesson: ScreenModel[];
  private lessonIndex: number;

  constructor() {
    // view
    this.ui = new UiManager('container', action => this.handleAction(action));

    // load from SessionCache?
    this.lesson = [];
    // ScreenModel[]?
    this.lessonIndex = -1; // -1 means lesson hasn't started
    // this.numHints = this.session.numHints // TODO: call to SessionCache?
  }

  /**
   * Start the session
   */
  start(): void {
    // this.session.loadLesson() // telling SessionCache to get a lesson
    // this.ui.displayScreen(titleScreen); // TODO: kind of stuck here - maybe a constant title screen?
  }

  /**
   * Handles a user click action
   * @param action the type of button that is clicked
   */
  private handleAction(action: UiAction): void {
    // update model (SessionCache)
    // TODO: when SessionCache get more written

    // update view (UIManager)
    switch (action.type) {
      case 'start':
        this.lessonIndex = 0;
        this.ui.displayScreen(this.lesson[this.lessonIndex]);
        break;
      case 'answer':
        // ensure an answer is selected here before switching screens?

        // check answer correctness and update SessionCache here?

        this.lessonIndex++;
        this.ui.displayScreen(this.lesson[this.lessonIndex]);
        break;
      case 'next':
        this.lessonIndex++;
        this.ui.displayScreen(this.lesson[this.lessonIndex]);
        break;
      case 'back':
        this.lessonIndex--;
        this.ui.displayScreen(this.lesson[this.lessonIndex]);
        break;
    }
  }
}
