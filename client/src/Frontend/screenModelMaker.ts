/*
  @fileoverview Converts the shared API types into the screen models the UI renders.
*/

import type {
  PlanetSummary,
  QuestionTask,
  ReadingTask,
  Settings,
  Task,
} from '@graphalaxy/shared';

// screen models (output)
import type {
  ScreenModel,
  ReadingScreenModel,
  QuestionScreenModel,
  QuestionResultScreenModel,
  LessonIntroScreenModel,
  LessonResultScreenModel,
  LoginScreenModel,
  RetryWarningScreenModel,
  SettingsScreenModel,
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
  return {type: 'reading', readingText: readingTask.text};
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
  return {
    type: 'question',
    question: {prompt, options: options.map(option => option.text)},
  };
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
 * @param progress The player's progress on the planet, if it has been loaded.
 * It is shown under the description.
 * @returns The lesson intro screen model for the UI.
 */
export function makeLessonIntroScreen(
  title: string,
  description: string,
  progress?: PlanetSummary | null,
): LessonIntroScreenModel {
  return {
    type: 'intro',
    title: title,
    description: progress
      ? `${description}\n\nYour progress: ${describeProgress(progress)}`
      : description,
  };
}

/**
 * Describes a player's progress on a planet in one line.
 * @param progress The player's progress on the planet.
 * @returns E.g. '2 of 5 questions correct (40%), hostile'.
 */
export function describeProgress(progress: PlanetSummary): string {
  const {correctCount, questionCount, completionPct, status} = progress;
  const percent = Math.round(completionPct * 100);
  return `${correctCount} of ${questionCount} questions correct (${percent}%), ${status}`;
}

/**
 * Creates the lesson result screen model shown once every question has been
 * answered: the score, and whether that made the planet peaceful.
 * @param progress The player's progress on the planet.
 * @returns The lesson result screen model for the UI.
 */
export function makeLessonResultScreen(
  progress: PlanetSummary,
): LessonResultScreenModel {
  const {name, correctCount, questionCount, status} = progress;
  const outcome =
    status === 'peaceful'
      ? `${name} is now peaceful!`
      : `${name} is still hostile. Redo the planet to try again.`;
  return {
    type: 'lessonResult',
    result: `You answered ${correctCount} of ${questionCount} questions correctly. ${outcome}`,
  };
}

/**
 * Creates the warning screen model shown before a planet is redone.
 * @param progress The player's progress on the planet, which would be reset.
 * @param error A message to add when the last attempt to reset failed.
 * @returns The retry warning screen model for the UI.
 */
export function makeRetryWarningScreen(
  progress: PlanetSummary,
  error?: string,
): RetryWarningScreenModel {
  const consequence =
    progress.status === 'peaceful'
      ? 'The planet turns hostile again and you answer every question from the start.'
      : 'You answer every question from the start.';
  const warning =
    `Redo ${progress.name}? This resets your progress here. ` +
    `Right now: ${describeProgress(progress)}. ${consequence}`;
  return {
    type: 'retryWarning',
    message: error ? `${error}\n\n${warning}` : warning,
  };
}

/**
 * Creates the settings screen model.
 * @param settings The settings to show.
 * @param message The outcome of the last save, if there was one.
 * @returns The settings screen model for the UI.
 */
export function makeSettingsScreen(
  settings: Settings,
  message?: string,
): SettingsScreenModel {
  return message
    ? {type: 'settings', settings, message}
    : {type: 'settings', settings};
}

/**
 * Creates the login screen model.
 * @param username The username the input starts with.
 * @param message Progress, or the outcome of the last attempt to log in.
 * @returns The login screen model for the UI.
 */
export function makeLoginScreen(
  username: string,
  message?: string,
): LoginScreenModel {
  return message
    ? {type: 'login', username, message}
    : {type: 'login', username};
}
