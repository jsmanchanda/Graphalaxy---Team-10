import type {PlanetSummary, Question, Settings} from '@graphalaxy/shared';

// --- view stuff ---
import {ScreenModel, UiAction} from '../UI/types';
import {UiManager} from '../UI/UIManager';
import {ALREADY_ANSWERED, SessionCache} from './SessionCache';
import {ApiError} from './ApiError';

// --- screenModelMaker ---
import * as screenModelMaker from './screenModelMaker';

// for MVP: there is no planet selection yet, so everyone plays this planet
const DEMO_PLANET_ID = 1;
const INTRO_INDEX = -1;

/**
 * Says whether a request failed because the server could not be reached.
 * @param error what the request threw
 * @returns true for network errors and timeouts
 */
function isOffline(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.kind === 'network' || error.kind === 'timeout')
  );
}

/**
 * Explains a failed login to the player.
 * @param error what login or loading the planet threw
 * @returns the message to show on the login screen
 */
function loginFailureMessage(error: unknown): string {
  if (isOffline(error)) {
    return 'Server offline. Try again.';
  }
  if (error instanceof ApiError && error.status === 400) {
    return "That username can't be used. Try another.";
  }
  return "Couldn't load the game. Try again.";
}

/**
 * Explains a failed answer to the player.
 * @param error what submitting the answer threw
 * @returns the message to show on the result screen
 */
function answerFailureMessage(error: unknown): string {
  if (isOffline(error)) {
    return 'Server offline. Press Ok to try again.';
  }
  if (error instanceof ApiError && error.code === ALREADY_ANSWERED) {
    return 'Question has already been answered. Press Ok to continue.';
  }
  return "Couldn't confirm answer. Press Ok to try again.";
}

/**
 * Which kind of screen is showing. 'lesson' is the planet's intro and its
 * readings; `taskIndex` says which one.
 */
type Stage =
  | 'login'
  | 'title'
  | 'settings'
  | 'lesson'
  | 'question'
  | 'questionResult'
  | 'lessonResult'
  | 'retryWarning';

/**
 * GameManager - coordinates game logic between SessionCache and UiManager
 * Kind of like the controller in MVC where SessionCache is the model and UiManager is the view
 *
 * The game opens on the login screen. Logging in loads the player's settings
 * and progress, and the planet, and leads to the title screen.
 *
 * A planet is played as its intro, its readings, then its questions. The
 * questions are loaded from the server one at a time and each is answered
 * once. After the last one the lesson result shows the score, from where the
 * planet can be redone.
 */
export class GameManager {
  private ui: UiManager;

  private session: SessionCache;
  private stage: Stage = 'login';
  private taskIndex: number;
  // Counts the screens shown, so a reply from the server is dropped if the
  // player has moved to another screen in the meantime.
  private screenId = 0;
  // True while an answer is with the server, so a double click sends one.
  private answerPending = false;
  // True while a planet reset is with the server, for the same reason.
  private resetPending = false;
  // True while a login is with the server, for the same reason.
  private loginPending = false;

  /**
   * Creates a new GameManager instance.
   * @param session the SessionCache instance to use for game data
   */
  constructor(session: SessionCache = new SessionCache()) {
    this.ui = new UiManager('container', action => this.handleAction(action));
    this.session = session;
    this.taskIndex = INTRO_INDEX;
  }

  /**
   * Starts the game on the login screen. Nothing is loaded until the player
   * logs in.
   */
  start(): void {
    this.show('login', screenModelMaker.makeLoginScreen(''));
  }

  /**
   * Logs the player in under the username they typed, which loads their
   * settings and progress, then loads the planet and shows the title. Stays
   * on the login screen, with a message, if the username is empty or anything
   * fails, so the player can try again.
   * @param username the username as typed on the login screen
   */
  private async login(username: string): Promise<void> {
    const name = username.trim();
    if (name === '') {
      this.show(
        'login',
        screenModelMaker.makeLoginScreen('', 'Enter username to log in.'),
      );
      return;
    }
    this.loginPending = true;
    this.show('login', screenModelMaker.makeLoginScreen(name, 'Logging in...'));
    try {
      await this.session.login(name);
      await this.session.loadPlanet(DEMO_PLANET_ID);
    } catch (error) {
      console.error(error);
      this.show(
        'login',
        screenModelMaker.makeLoginScreen(name, loginFailureMessage(error)),
      );
      return;
    } finally {
      this.loginPending = false;
    }
    this.showTitle();
  }

  /**
   * Handles a user click action
   * @param action the type of button that is clicked
   */
  private handleAction(action: UiAction): void {
    // update view (UIManager)
    if (this.stage === 'login') {
      // Nothing else works until the player is logged in.
      if (action.type === 'login' && !this.loginPending) {
        void this.login(action.username);
      }
      return;
    }
    const planet = this.session.currentPlanet;
    if (!planet) {
      return;
    }
    switch (action.type) {
      case 'start': {
        this.taskIndex = INTRO_INDEX;
        this.showLesson();
        break;
      }
      case 'answer': {
        const question = this.session.currentQuestion;
        if (this.stage !== 'question' || !question || this.answerPending) {
          return;
        }
        void this.submitAnswer(question, action.option);
        break;
      }
      case 'next': {
        if (this.stage === 'lesson') {
          if (this.taskIndex + 1 < planet.tasks.length) {
            this.taskIndex++;
            this.showLesson();
          } else {
            // Past the last reading: on to the questions.
            void this.showNextQuestion();
          }
        } else if (this.stage === 'questionResult') {
          void this.showNextQuestion();
        } else if (this.stage === 'lessonResult') {
          this.showTitle();
        }
        break;
      }
      case 'back': {
        if (this.stage === 'lesson') {
          this.taskIndex = Math.max(this.taskIndex - 1, INTRO_INDEX);
          this.showLesson();
        } else if (this.stage === 'question') {
          // Back to the last reading, or the intro if there are none.
          this.taskIndex = planet.tasks.length - 1;
          this.showLesson();
        } else if (this.stage === 'settings') {
          this.showTitle();
        }
        break;
      }
      case 'retryLesson': {
        if (this.stage === 'lessonResult') {
          this.showRetryWarning();
        }
        break;
      }
      case 'confirmRetry': {
        if (this.stage === 'retryWarning' && !this.resetPending) {
          void this.retryPlanet();
        }
        break;
      }
      case 'cancelRetry': {
        if (this.stage === 'retryWarning' && !this.resetPending) {
          this.showLessonResult();
        }
        break;
      }
      case 'openSettings': {
        const player = this.session.player;
        if (this.stage === 'title' && player) {
          this.show(
            'settings',
            screenModelMaker.makeSettingsScreen(player.settings),
          );
        }
        break;
      }
      case 'saveSettings': {
        if (this.stage === 'settings') {
          void this.saveSettings(action.settings);
        }
        break;
      }
    }
  }

  /**
   * Shows a screen and records which kind it is.
   * @param stage the kind of screen
   * @param model the screen's data
   */
  private show(stage: Stage, model: ScreenModel): void {
    this.stage = stage;
    this.screenId++;
    this.ui.displayScreen(model);
  }

  /**
   * Shows the title screen.
   */
  private showTitle(): void {
    this.show('title', {type: 'title', title: 'Graphalaxy'});
  }

  /**
   * Shows the lesson slide at `taskIndex`: the planet's intro with the
   * player's progress on it, or one of its readings.
   */
  private showLesson(): void {
    const planet = this.session.currentPlanet;
    if (!planet) {
      return;
    }
    if (this.taskIndex === INTRO_INDEX) {
      this.show(
        'lesson',
        screenModelMaker.makeLessonIntroScreen(
          planet.name,
          planet.introText,
          this.session.progressFor(planet.planetId),
        ),
      );
    } else {
      this.show(
        'lesson',
        screenModelMaker.taskToScreen(planet.tasks[this.taskIndex]),
      );
    }
  }

  /**
   * Shows the planet's next unanswered question, or the lesson result once
   * every question has been answered, right or wrong. The question is loaded
   * from the server unless one is already loaded and still unanswered, e.g.
   * after going back to the lesson. Drops the server's reply if the player has
   * moved to another screen in the meantime.
   */
  private async showNextQuestion(): Promise<void> {
    const loaded = this.session.currentQuestion;
    if (loaded) {
      this.showQuestion(loaded);
      return;
    }
    const screenId = this.screenId;
    try {
      const question = await this.session.loadNextQuestion();
      if (screenId !== this.screenId) {
        return;
      }
      if (question) {
        this.showQuestion(question);
      } else {
        this.showLessonResult();
      }
    } catch (error) {
      console.error(error);
      if (screenId === this.screenId) {
        // Ok on this screen asks for the question again.
        this.show('questionResult', {
          type: 'questionResult',
          result: isOffline(error)
            ? 'Server offline. Press Ok to retry.'
            : "Couldn't load next question. Press Ok to retry.",
        });
      }
    }
  }

  /**
   * Shows a question.
   * @param question the question to show
   */
  private showQuestion(question: Question): void {
    this.show(
      'question',
      screenModelMaker.questionTaskToQuestionScreen({
        type: 'Question',
        question,
      }),
    );
  }

  /**
   * Shows the lesson result: the player's progress on the planet, with the
   * option to redo it.
   */
  private showLessonResult(): void {
    const progress = this.currentProgress();
    this.show(
      'lessonResult',
      progress
        ? screenModelMaker.makeLessonResultScreen(progress)
        : {type: 'lessonResult', result: 'You finished this planet!'},
    );
  }

  /**
   * Shows the warning the player has to confirm before a planet is redone.
   * @param error a message to add when the last attempt to reset failed
   */
  private showRetryWarning(error?: string): void {
    const progress = this.currentProgress();
    this.show(
      'retryWarning',
      progress
        ? screenModelMaker.makeRetryWarningScreen(progress, error)
        : {
            type: 'retryWarning',
            message: 'Redo planet? Progress will be reset.',
          },
    );
  }

  /**
   * Gets the player's progress on the current planet.
   * @returns the planet's summary, or null if it has not been loaded
   */
  private currentProgress(): PlanetSummary | null {
    const planet = this.session.currentPlanet;
    return planet ? this.session.progressFor(planet.planetId) : null;
  }

  /**
   * Resets the player's progress on the current planet once they have
   * confirmed the warning, then starts its questions again from the first.
   */
  private async retryPlanet(): Promise<void> {
    const screenId = this.screenId;
    this.resetPending = true;
    try {
      await this.session.resetPlanet();
      if (screenId === this.screenId) {
        await this.showNextQuestion();
      }
    } catch (error) {
      console.error(error);
      if (screenId === this.screenId) {
        this.showRetryWarning(
          isOffline(error)
            ? 'Server offline. This planet was not reset.'
            : "Couldn't reset planet.",
        );
      }
    } finally {
      this.resetPending = false;
    }
  }

  /**
   * Saves the settings chosen on the settings screen, then shows the screen
   * again with the outcome.
   * @param settings the settings to save
   */
  private async saveSettings(settings: Settings): Promise<void> {
    const screenId = this.screenId;
    try {
      const player = await this.session.saveSettings(settings);
      if (screenId === this.screenId) {
        this.show(
          'settings',
          screenModelMaker.makeSettingsScreen(
            player.settings,
            'Settings saved.',
          ),
        );
      }
    } catch (error) {
      console.error(error);
      if (screenId === this.screenId) {
        // Keep what the player chose so they can try again.
        this.show(
          'settings',
          screenModelMaker.makeSettingsScreen(
            settings,
            isOffline(error)
              ? 'Server offline. Settings were not saved.'
              : "Couldn't save settings.",
          ),
        );
      }
    }
  }

  /**
   * Sends the chosen option to the server, which grades it, then shows the
   * result. Drops the result if the player has moved to another screen or
   * planet in the meantime.
   * @param question the question being answered
   * @param optionIndex the index of the clicked option button
   */
  private async submitAnswer(
    question: Question,
    optionIndex: number,
  ): Promise<void> {
    const option = question.options[optionIndex];
    if (!option) {
      return;
    }
    const screenId = this.screenId;
    this.answerPending = true;
    try {
      const result = await this.session.submitAnswer(
        question.questionId,
        option.optionId,
      );
      if (screenId === this.screenId) {
        this.show(
          'questionResult',
          screenModelMaker.makeQuestionResultScreen(result.correct),
        );
      }
    } catch (error) {
      console.error(error);
      if (screenId === this.screenId) {
        this.show('questionResult', {
          type: 'questionResult',
          result: answerFailureMessage(error),
        });
      }
    } finally {
      this.answerPending = false;
    }
  }
}
