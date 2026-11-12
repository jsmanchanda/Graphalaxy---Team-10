import type {Group} from 'konva/lib/Group';
import {MathFunction} from '../Graphing/functions';

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
  | {type: 'retryLesson'};

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
 * Reading with Graph
 */
export interface VisualReadingScreenModel {
  type: 'visualReading';
  readingText: string;
  mathFunction: MathFunction;
}

/**
 * Radio-wave minigame screen data.
 */
export interface RadioWaveMinigameScreenModel {
  type: 'radioWaveMinigame';
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
  | VisualReadingScreenModel
  | RadioWaveMinigameScreenModel;
