/*
  @fileoverview Converts the shared API types into the screen models the UI renders.
*/

import type {QuestionTask, ReadingTask, Task} from '@graphalaxy/shared';

// screen models (output)
import type {
  ScreenModel,
  ReadingScreenModel,
  QuestionScreenModel,
  QuestionResultScreenModel,
  LessonIntroScreenModel,
  // LessonResultScreenModel
} from '../UI/types';

/**
 * Converts a task into the screen model for that task's type.
 * Hands reading tasks and question tasks to their own mappers.
 * @param task The current task from the planet.
 * @returns The reading or question screen model for the UI.
 */
export function taskToScreen(task: Task): ScreenModel {
  switch (task.type) {
    case 'Question':
      return questionTaskToQuestionScreen(task);
    case 'Reading':
      return readingTaskToScreen(task);
  }
}

/**
 * Converts a reading task into a reading screen model.
 * @param readingTask The reading task to display.
 * @returns The reading screen model for the UI.
 */
export function readingTaskToScreen(
  readingTask: ReadingTask,
): ReadingScreenModel {
  const model: ReadingScreenModel = {
    type: 'reading',
    readingText: readingTask.text,
  };

  if (readingTask.graph) {
    model.equation = readingTask.graph['fn'];
  }
  return model;
}

/**
 * Converts a question task into a question screen model: the prompt and the
 * option texts in order. The UI reports the chosen option by its index, and
 * GameManager maps that index back to an optionId.
 * @param questionTask The question task to display.
 * @returns The question screen model for the UI.
 */
export function questionTaskToQuestionScreen(
  questionTask: QuestionTask,
): QuestionScreenModel {
  const {prompt, options} = questionTask.question;
  const model: QuestionScreenModel = {
    type: 'question',
    question: {prompt, options: options.map(option => option.text)},
  };

  // If question has a graph component add it to the model
  if (questionTask.question.graph) {
    model.equation = questionTask.question.graph['fn'];
  }
  return model;
}

/**
 * Creates the question result screen model shown after the player answers.
 * @param correct Whether the server graded the answer as correct.
 * @returns The question result screen model for the UI.
 */
export function makeQuestionResultScreen(
  correct: boolean,
): QuestionResultScreenModel {
  return {type: 'questionResult', result: correct ? 'Correct' : 'Wrong'};
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
