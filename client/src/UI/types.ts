import {MathFunction} from '../Graphing/functions';
import type {Group} from 'konva/lib/Group';
import type {PlanetSummary} from '@graphalaxy/shared';

/**
 * Data being displayed
 * usually collection of Konva elements
 */
export interface View {
  getGroup(): Group;
}

/**
 * User interaction types
 */
export type UiAction =
  | {type: 'start'}
  | {type: 'answer'; option: number}
  | {type: 'next'}
  | {type: 'back'}
  | {type: 'retryLesson'}
  | {type: 'enterPlanet'}
  | {type: 'selectPlanet'; planetId: number}
  | {type: 'navigate'}
  | {type: 'startMiniGame'; name: 'Asteroid' | 'Radio'}
  | {type: 'endMiniGame'; addHint: boolean};

// ================== Screens Models ===================
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
}

/**
 * Reading Screen Data
 */
export interface ReadingScreenModel {
  type: 'reading';
  readingText: string;
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
}

/**
 * Data for navigation screen
 */
export interface NavigationScreenModel {
  type: 'navigation';
  planets: PlanetSummary[];
  overallStatus: number;
}

/**
 * Data for navigation screen
 */
export interface MiniGameSelectModel {
  type: 'miniGameSelect';
}

/**
 * Reading with Graph
 */
export interface VisualReadingScreenModel {
  type: 'visualReading';
  readingText: string;
  mathFunction: MathFunction;
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
 * Generic Screen Model Type
 */
export type ScreenModel =
  | TitleScreenModel
  | LessonIntroScreenModel
  | ReadingScreenModel
  | QuestionScreenModel
  | QuestionResultScreenModel
  | LessonResultScreenModel
  | NavigationScreenModel
  | MiniGameSelectModel
  | VisualReadingScreenModel
  | RadioWaveMinigameScreenModel;
