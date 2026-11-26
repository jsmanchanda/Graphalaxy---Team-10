import type {PlanetSummary, Question, Settings} from '@graphalaxy/shared';

// --- view stuff ---
import {MUSIC_URL} from '../UI/constants';
import {HintPanelModel, ScreenModel, UiAction} from '../UI/types';
import {UiManager} from '../UI/UIManager';
import {ALREADY_ANSWERED, SessionCache} from './SessionCache';
import {ApiError} from './ApiError';

// --- screenModelMaker ---
import * as screenModelMaker from './screenModelMaker';

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
 * Explains why asking for a hint failed. Never says a hint was unlocked.
 * @param error what unlocking or loading the hints threw
 * @returns the message to show in the hint panel
 */
function hintFailureMessage(error: unknown): string {
  if (isOffline(error)) {
    return 'Server offline. Try again.';
  }
  return "Couldn't get a hint. Try again.";
}

/**
 * Which kind of screen is showing. 'lesson' is the planet's intro and its
 * readings; `taskIndex` says which one.
 */
type Stage =
  | 'login'
  | 'title'
  | 'instructions'
  | 'settings'
  | 'navigation'
  | 'miniGameSelect'
  | 'miniGame'
  | 'lesson'
  | 'question'
  | 'questionResult'
  | 'lessonResult'
  | 'retryWarning';

/**
 * The screens with a settings icon, from which the settings screen opens.
 */
const SETTINGS_FROM: ReadonlySet<Stage> = new Set<Stage>([
  'title',
  'instructions',
  'navigation',
  'miniGameSelect',
  'miniGame',
  'lesson',
  'question',
  'questionResult',
  'lessonResult',
]);

/**
 * Screens that are paused, not rebuilt, while the settings screen is open,
 * because rebuilding them would lose the player's place. A minigame would
 * restart, with a new timer and new questions.
 */
const SUSPEND_FOR_SETTINGS: ReadonlySet<Stage> = new Set<Stage>(['miniGame']);

/**
 * What the settings screen goes back to: the screen it was opened from.
 * `suspended` is true when that screen was set aside with
 * UiManager.suspendScreen and is resumed rather than shown again.
 */
interface ReturnPoint {
  stage: Stage;
  model: ScreenModel;
  suspended: boolean;
}

/**
 * GameManager - coordinates game logic between SessionCache and UiManager
 * Kind of like the controller in MVC where SessionCache is the model and UiManager is the view
 *
 * The game opens on the login screen. Logging in loads the player's settings
 * and progress, and the planet, and leads to the title screen.
 *
 * From the title screen the player opens the navigation map, picks a planet,
 * and chooses or skips a minigame before entering its lesson. The first time
 * the map is opened after logging in, the instructions are shown before it.
 *
 * The settings screen opens from the settings icon on the title and game
 * screens, and Back returns to the screen it was opened from. A minigame is
 * paused while settings is open and carries on from where it was. Logging
 * out there forgets the player and returns to the login screen.
 *
 * A planet is played as its intro, its readings, then its questions. The
 * questions are loaded from the server one at a time and each is answered
 * once. After the last one the lesson result shows the score, from where the
 * planet can be redone or the map reopened.
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
  // True while a hint unlock is with the server, so a double click spends one
  // credit.
  private hintPending = false;
  // The option the player had selected when they asked for a hint, so it is
  // still selected when the question is redrawn.
  private selection: {questionId: number; option: number} | null = null;
  // True while a login is with the server, for the same reason.
  private loginPending = false;
  // Prevents handling the same minigame result twice.
  private minigamePending = false;
  // The planet load started by selectPlanet, awaited before its lesson opens.
  private planetLoad: Promise<unknown> | null = null;
  // True once the player has read the instructions since logging in, so the
  // map opens straight away from then on.
  private instructionsSeen = false;
  // The screen showing now, so the settings screen can return to it.
  private currentModel: ScreenModel | null = null;
  // Where Back on the settings screen leads.
  private settingsReturn: ReturnPoint | null = null;
  // True while a screen (a minigame) is paused behind the settings screen.
  private screenSuspended = false;
  // The background music. Kept here, not on a screen, so it keeps playing
  // when screens change. Made on first use, since tests have no Audio.
  private music: HTMLAudioElement | null = null;

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
   * settings and progress, then shows the title. The first Start after that
   * shows the instructions before the map. A planet's content is loaded
   * later, when the player picks it on the map. Stays on the login screen,
   * with a message, if the username is empty or anything fails, so the player
   * can try again.
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
    // A new login reads the instructions again before the map.
    this.instructionsSeen = false;
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
    switch (action.type) {
      case 'start': {
        if (this.instructionsSeen) {
          this.showNavigation();
        } else {
          this.showInstructions();
        }
        break;
      }
      case 'navigate': {
        this.showNavigation();
        break;
      }
      case 'selectPlanet': {
        const summary = this.session.progressFor(action.planetId);
        if (summary && !summary.unlocked) {
          // Locked planets are not playable yet.
          return;
        }
        // Loads while the player chooses a minigame; openLesson waits for it.
        this.planetLoad = this.session.loadPlanet(action.planetId);
        // Keeps a failed load from becoming an unhandled rejection; the error
        // is reported when the player tries to enter the planet.
        this.planetLoad.catch(() => undefined);
        this.taskIndex = INTRO_INDEX;

        this.show('miniGameSelect', {
          type: 'miniGameSelect',
          minigame: Math.random() < 0.5 ? 'Asteroid' : 'Radio',
        });
        break;
      }
      case 'startMiniGame': {
        if (this.stage !== 'miniGameSelect') break;
        if (action.name === 'Radio') {
          this.show('miniGame', screenModelMaker.makeRadioWaveMinigameScreen());
        } else if (action.name === 'Asteroid') {
          // The minigame sends endMiniGame when the player leaves it.
          this.show('miniGame', {type: 'asteroidMinigame'});
        }
        break;
      }
      case 'endMiniGame': {
        if (this.stage !== 'miniGame' || this.minigamePending) break;
        this.minigamePending = true;
        if (action.addHint) {
          void this.session.awardHintCredits(1).catch(error => {
            console.error(error);
          });
        }
        void this.openLesson().finally(() => {
          this.minigamePending = false;
        });
        break;
      }
      case 'enterPlanet': {
        void this.openLesson();
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
      case 'requestHint': {
        const question = this.session.currentQuestion;
        // Also waits for a pending answer: redrawing the question now would
        // drop the answer's result.
        if (
          this.stage !== 'question' ||
          !question ||
          this.hintPending ||
          this.answerPending
        ) {
          return;
        }
        this.selection =
          action.selectedOption === null
            ? null
            : {questionId: question.questionId, option: action.selectedOption};
        void this.showHint(question);
        break;
      }
      case 'closeHints': {
        const question = this.session.currentQuestion;
        if (this.stage === 'question' && question && !this.hintPending) {
          this.showQuestion(question);
        }
        break;
      }
      case 'next': {
        if (this.stage === 'instructions') {
          this.instructionsSeen = true;
          this.showNavigation();
          break;
        }
        const planet = this.session.currentPlanet;
        if (!planet) {
          return;
        }
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
          this.showNavigation();
        }
        break;
      }
      case 'back': {
        const planet = this.session.currentPlanet;
        if (this.stage === 'lesson' && planet) {
          if (this.taskIndex === INTRO_INDEX) {
            // Back from the planet's intro leaves it for the map.
            this.showNavigation();
          } else {
            this.taskIndex--;
            this.showLesson();
          }
        } else if (this.stage === 'question' && planet) {
          // Back to the last reading, or the intro if there are none.
          this.taskIndex = planet.tasks.length - 1;
          this.showLesson();
        } else if (this.stage === 'miniGameSelect') {
          this.showNavigation();
        } else if (
          this.stage === 'navigation' ||
          this.stage === 'instructions'
        ) {
          this.showTitle();
        } else if (this.stage === 'settings') {
          this.leaveSettings();
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
        this.openSettings();
        break;
      }
      case 'saveSettings': {
        if (this.stage === 'settings') {
          void this.saveSettings(action.settings);
        }
        break;
      }
      case 'logout': {
        if (this.stage === 'settings') {
          this.logout();
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
    if (stage !== 'settings' && this.screenSuspended) {
      // Leaving settings for anywhere but the paused screen (e.g. logging
      // out) ends that screen for good.
      this.screenSuspended = false;
      this.ui.discardSuspendedScreen();
    }
    this.stage = stage;
    this.screenId++;
    this.currentModel = model;
    this.ui.displayScreen(model);
  }

  /**
   * Shows the title screen.
   */
  private showTitle(): void {
    // The music starts on the title screen and keeps playing from there. The
    // title always follows a click (login or Back), so the browser allows it.
    this.startMusic(this.session.player?.settings.musicVolume ?? 1);
    this.show('title', {type: 'title', title: 'Graphalaxy'});
  }

  /**
   * Shows how to play, before the navigation map.
   */
  private showInstructions(): void {
    this.show('instructions', {type: 'instructions'});
  }

  /**
   * Opens the settings screen from the screen showing now, which Back on the
   * settings screen returns to. A minigame is paused and kept rather than
   * replaced, so it carries on afterwards. Does nothing on screens without a
   * settings icon, while an answer or a planet reset is with the server,
   * since leaving would drop its reply, or once a minigame has reported its
   * result.
   */
  private openSettings(): void {
    const player = this.session.player;
    const model = this.currentModel;
    if (
      !player ||
      !model ||
      !SETTINGS_FROM.has(this.stage) ||
      this.answerPending ||
      this.resetPending ||
      this.minigamePending
    ) {
      return;
    }
    const suspended = SUSPEND_FOR_SETTINGS.has(this.stage);
    if (suspended) {
      this.ui.suspendScreen();
      this.screenSuspended = true;
    }
    this.settingsReturn = {stage: this.stage, model, suspended};
    this.show('settings', screenModelMaker.makeSettingsScreen(player.settings));
  }

  /**
   * Leaves the settings screen for the screen it was opened from, or the
   * title if that is unknown. A paused minigame is resumed, not restarted.
   */
  private leaveSettings(): void {
    const back = this.settingsReturn;
    this.settingsReturn = null;
    if (!back) {
      this.showTitle();
    } else if (back.suspended && this.screenSuspended) {
      // The paused screen is showing again, so record it as current.
      this.screenSuspended = false;
      this.ui.resumeScreen();
      this.stage = back.stage;
      this.screenId++;
      this.currentModel = back.model;
    } else {
      this.show(back.stage, back.model);
    }
  }

  /**
   * Logs the player out and shows the login screen, so another player can
   * log in. The instructions are shown again after the next login.
   */
  private logout(): void {
    this.session.logout();
    this.stopMusic();
    this.instructionsSeen = false;
    this.settingsReturn = null;
    this.planetLoad = null;
    this.taskIndex = INTRO_INDEX;
    this.show('login', screenModelMaker.makeLoginScreen('', 'Logged out.'));
  }

  /**
   * Opens the lesson of the planet picked on the map, once its content has
   * arrived. Returns to the map if it cannot be loaded.
   */
  private async openLesson(): Promise<void> {
    const screenId = this.screenId;
    try {
      await this.planetLoad;
    } catch (error) {
      console.error(error);
      if (screenId === this.screenId) {
        this.showNavigation();
      }
      return;
    }
    if (screenId === this.screenId) {
      this.taskIndex = INTRO_INDEX;
      this.showLesson();
    }
  }

  /**
   * Shows the navigation map, built from the progress loaded at login.
   */
  private showNavigation(): void {
    this.show(
      'navigation',
      screenModelMaker.makeNavScreen(this.session.planets),
    );
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
          planet.planetId,
        ),
      );
    } else {
      this.show(
        'lesson',
        screenModelMaker.taskToScreen(
          planet.tasks[this.taskIndex],
          planet.planetId,
        ),
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
          type: 'reading',
          readingText: isOffline(error)
            ? 'Server offline. Press Ok to retry.'
            : "Couldn't load next question. Press Ok to retry.",
        });
      }
    }
  }

  /**
   * Shows a question with the player's hint credits, and the option they had
   * selected before asking for a hint.
   * @param question the question to show
   * @param hintPanel the hint panel to show over it, if any
   */
  private showQuestion(question: Question, hintPanel?: HintPanelModel): void {
    const selection = this.selection;
    this.show(
      'question',
      screenModelMaker.questionTaskToQuestionScreen(
        {type: 'Question', question},
        this.session.currentPlanet?.planetId,
        {
          hintsLeft: this.session.player?.hintQuota ?? 0,
          selectedOption:
            selection?.questionId === question.questionId
              ? selection.option
              : undefined,
          hintPanel,
        },
      ),
    );
  }

  /**
   * Unlocks the planet's next hint and shows it in the hint panel with the
   * hints unlocked before it, or says why there is none. Drops the reply if
   * the player has moved to another screen in the meantime.
   * @param question the question the hint panel is shown over
   */
  private async showHint(question: Question): Promise<void> {
    this.hintPending = true;
    this.showQuestion(question, {hints: [], message: 'Loading hint...'});
    const screenId = this.screenId;
    try {
      const outcome = await this.session.unlockHint();
      if (screenId === this.screenId) {
        this.showQuestion(question, screenModelMaker.makeHintPanel(outcome));
      }
    } catch (error) {
      console.error(error);
      if (screenId === this.screenId) {
        this.showQuestion(question, {
          hints: [],
          message: hintFailureMessage(error),
        });
      }
    } finally {
      this.hintPending = false;
    }
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
        ? screenModelMaker.makeLessonResultScreen(
            progress,
            this.session.currentPlanet?.planetId,
          )
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
            message: 'Redo this planet? Your progress on it will be reset.',
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
   * Starts the looping background music at the given volume, unless it is
   * already playing. Must follow a click, or the browser blocks it. Does
   * nothing where there is no Audio, as in tests.
   * @param volume the music volume, from 0 to 1
   */
  private startMusic(volume: number): void {
    if (typeof Audio === 'undefined') return;
    if (!this.music) {
      this.music = new Audio(MUSIC_URL);
      // Restart from the beginning automatically when the track ends.
      this.music.loop = true;
    }
    this.music.volume = volume;
    if (!this.music.paused) return;
    // A blocked or missing file should not break the game.
    this.music.play().catch((error: unknown) => console.warn(error));
  }

  /**
   * Changes the music volume, if the music has been started.
   * @param volume the music volume, from 0 to 1
   */
  private setMusicVolume(volume: number): void {
    if (this.music) this.music.volume = volume;
  }

  /**
   * Stops the music and rewinds it, so the next login starts it from the top.
   */
  private stopMusic(): void {
    if (!this.music) return;
    this.music.pause();
    this.music.currentTime = 0;
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
      this.setMusicVolume(player.settings.musicVolume);
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
    this.selection = null;
    try {
      const result = await this.session.submitAnswer(
        question.questionId,
        option.optionId,
      );
      if (screenId === this.screenId) {
        this.show(
          'questionResult',
          screenModelMaker.makeQuestionResultScreen(
            result.correct,
            this.session.currentPlanet?.planetId,
          ),
        );
      }
    } catch (error) {
      console.error(error);
      if (screenId === this.screenId) {
        this.show('questionResult', {
          type: 'reading',
          readingText: answerFailureMessage(error),
        });
      }
    } finally {
      this.answerPending = false;
    }
  }
}
