import type {Group} from 'konva/lib/Group';
import type {PlanetSummary, Settings} from '@graphalaxy/shared';

/**
 * Data being displayed
 * usually collection of Konva elements
 */
export interface View {
  getGroup(): Group;
  /**
   * Cleans up anything the view holds outside its Konva group, such as a
   * keyboard listener. UiManager calls it before it removes the view.
   */
  destroy?(): void;
}

/**
 * User interaction types
 */
export type UiAction =
  | {type: 'login'; username: string}
  | {type: 'start'}
  | {type: 'answer'; option: number}
  | {type: 'next'}
  | {type: 'back'}
  | {type: 'retryLesson'}
  | {type: 'confirmRetry'}
  | {type: 'cancelRetry'}
  | {type: 'openSettings'}
  | {type: 'saveSettings'; settings: Settings}
  | {type: 'enterPlanet'}
  | {type: 'selectPlanet'; planetId: number}
  | {type: 'navigate'}
  | {type: 'startMiniGame'; name: 'Asteroid' | 'Radio'}
  | {type: 'endMiniGame'; addHint: boolean};

// ================== Screens Models ===================
/**
 * Login Screen Data. `username` is what the input starts with, and `message`
 * reports progress or the outcome of the last attempt to log in.
 */
export interface LoginScreenModel {
  type: 'login';
  username: string;
  message?: string;
}

/**
 * Title Screen Data
 */
export interface TitleScreenModel {
  type: 'title';
  title: string;
}

/**
 * Lesson Introduction Screen Data
 */
export interface LessonIntroScreenModel {
  type: 'intro';
  title: string;
  description: string;
  planetId?: number;
}

/**
 * Reading Screen Data
 */
export interface ReadingScreenModel {
  type: 'reading';
  readingText: string;
  planetId?: number;
  equation?: string;
}

/**
 * What the question screen shows. It holds no answer key: grading happens on
 * the server.
 */
export interface QuestionDisplay {
  prompt: string;
  options: string[];
}

/**
 * Question Screen Data
 */
export interface QuestionScreenModel {
  type: 'question';
  question: QuestionDisplay;
  equation?: string;
  planetId?: number; // picks the alien and background; defaults to planet 2
}

/**
 * Question Result Screen Data
 */
export interface QuestionResultScreenModel {
  type: 'questionResult';
  result: string;
}

/**
 * Lesson Result Screen Data
 */
export interface LessonResultScreenModel {
  type: 'lessonResult';
  result: string;
  planetId?: number;
}

/**
 * Retry Warning Screen Data: the warning shown before a planet is redone
 */
export interface RetryWarningScreenModel {
  type: 'retryWarning';
  message: string;
}

/**
 * Settings Screen Data. `message` reports the outcome of the last save.
 */
export interface SettingsScreenModel {
  type: 'settings';
  settings: Settings;
  message?: string;
}

/**
 * Data for the navigation screen: the map of planets and how far the player
 * has got overall, from 0 to 1.
 */
export interface NavigationScreenModel {
  type: 'navigation';
  planets: PlanetSummary[];
  overallStatus: number;
}

/**
 * Data for the minigame select screen, shown after a planet is picked.
 */
export interface MiniGameSelectModel {
  type: 'miniGameSelect';
}

/**
 * Data needed to create a radio-wave minigame question.
 */
export interface RadioWaveQuestion {
  amplitude: number;
  frequency: number;
  horizontalShift: number;
  verticalShift: number;
}

/**
 * Rules for a radio-wave minigame round.
 */
export interface RadioWaveMinigameConfig {
  timeLimitSeconds: number;
  correctAnswersForHint: number;
}

/**
 * Radio-wave minigame screen data.
 */
export interface RadioWaveMinigameScreenModel {
  type: 'radioWaveMinigame';
  question: RadioWaveQuestion;
  config: RadioWaveMinigameConfig;
}

/**
 * Asteroid minigame screen. It needs no data: the minigame makes its own
 * questions.
 */
export interface AsteroidMiniGameScreenModel {
  type: 'asteroidMinigame';
}

/**
 * Generic Screen Model Type
 */
export type ScreenModel =
  | LoginScreenModel
  | TitleScreenModel
  | LessonIntroScreenModel
  | ReadingScreenModel
  | QuestionScreenModel
  | QuestionResultScreenModel
  | LessonResultScreenModel
  | RetryWarningScreenModel
  | SettingsScreenModel
  | NavigationScreenModel
  | MiniGameSelectModel
  | RadioWaveMinigameScreenModel
  | AsteroidMiniGameScreenModel;
