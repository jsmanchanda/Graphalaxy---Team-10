/*
  @fileoverview Converts session cache models into the screen models the UI renders.
*/

// SC models (input)
import type {ReadingTask, QuestionTask} from './SessionCacheModels';

// screen models (output)
import type {
  ReadingScreenModel,
  Question,
  QuestionScreenModel,
  QuestionResultScreenModel,
  LessonIntroScreenModel,
  // LessonResultScreenModel
} from '../UI/types';

/**
 * Converts a reading task into a reading screen model.
 * @param readingTask The reading task to display.
 * @returns The reading screen model for the UI.
 */
export function readingTaskToScreen(
  readingTask: ReadingTask,
): ReadingScreenModel {
  return {type: 'reading', readingText: readingTask.text};
}

/**
 * Converts a question task into a question screen model.
 * The correct answer is left out so the UI never receives it.
 * Missing options are filled with empty strings and options past the fourth are ignored.
 * @param questionTask The question task to display.
 * @returns The question screen model for the UI.
 */
export function questionTaskToQuestionScreen(
  questionTask: QuestionTask,
): QuestionScreenModel {
  // this hardcode 4 options, need to figure out how to not do that
  const [option1 = '', option2 = '', option3 = '', option4 = ''] =
    questionTask.options;

  const question: Question = {
    prompt: questionTask.prompt,
    option1,
    option2,
    option3,
    option4,
  };

  return {type: 'question', question: question};
}

/**
 * Creates the question result screen model shown after the player answers.
 * @param correct Whether the player's answer was correct.
 * @returns The question result screen model for the UI.
 */
export function questionTaskToQuestionResultScreen(
  correct: boolean,
): QuestionResultScreenModel {
  let result: string;
  if (correct) result = 'Correct';
  else result = 'Wrong';
  return {type: 'questionResult', result: result};
}

/**
 * Creates the lesson intro screen model.
 * @param title The lesson title.
 * @param description The lesson's introductory text.
 * @returns The lesson intro screen model for the UI.
 */
export function makeLessonIntroScreen(
  title: string,
  description: string,
): LessonIntroScreenModel {
  return {type: 'intro', title: title, description: description};
}

// function makeLessonResultScreen - dependent on progress tracking
