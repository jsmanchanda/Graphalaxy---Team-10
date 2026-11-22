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
  NavigationScreenModel,
  RadioWaveMinigameScreenModel,
  RetryWarningScreenModel,
  SettingsScreenModel,
} from '../UI/types';

/**
 * Converts a task into the screen model for that task's type.
 * Hands reading tasks and question tasks to their own mappers.
 * @param task The current task from the planet.
 * @param planetId The planet the task is on, passed to the question screen.
 * @returns The reading or question screen model for the UI.
 */
export function taskToScreen(task: Task, planetId?: number): ScreenModel {
  switch (task.type) {
    case 'Question':
      return questionTaskToQuestionScreen(task, planetId);
    case 'Reading':
      return readingTaskToScreen(task, planetId);
  }
}

/**
 * Converts a reading task into a reading screen model.
 * @param readingTask The reading task to display.
 * @param planetId The planet the task is on, passed to the question screen.
 * @returns The reading screen model for the UI.
 */
export function readingTaskToScreen(
  readingTask: ReadingTask,
  planetId?: number,
): ReadingScreenModel {
  const model: ReadingScreenModel = {
    type: 'reading',
    readingText: readingTask.text,
  };

  if (readingTask.graph) {
    model.equation = readingTask.graph['fn'];
  }

  if (planetId !== undefined) {
    model.planetId = planetId;
  }
  return model;
}

/**
 * Converts a question task into a question screen model: the prompt and the
 * option texts in order. The UI reports the chosen option by its index, and
 * GameManager maps that index back to an optionId.
 * @param questionTask The question task to display.
 * @param planetId The planet the question is on, which picks its alien and
 *   background.
 * @returns The question screen model for the UI.
 */
export function questionTaskToQuestionScreen(
  questionTask: QuestionTask,
  planetId?: number,
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

  if (planetId !== undefined) {
    model.planetId = planetId;
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
      ? `${description}\n\nCurrent progress: ${describeProgress(progress)}`
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
  planetId?: number,
): LessonResultScreenModel {
  const {name, correctCount, questionCount, status} = progress;
  const outcome =
    status === 'peaceful'
      ? `${name} is now peaceful!`
      : `${name} is still hostile. Redo the planet to try again.`;
  const model: LessonResultScreenModel = {
    type: 'lessonResult',
    result: `You answered ${correctCount} of ${questionCount} questions correctly.\n ${outcome}`,
  };

  if (planetId !== undefined) {
    model.planetId = planetId;
  }

  return model;
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
    `Redo ${progress.name}? ` +
    `Current progress: ${describeProgress(progress)}. This resets all progress here. ${consequence}`;
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

/**
 * Creates the navigation screen model: the planets on the map and how far the
 * player has got across all of them.
 * @param allPlanets The player's progress on every planet.
 * @returns The navigation screen model for the UI.
 */
export function makeNavScreen(
  allPlanets: PlanetSummary[],
): NavigationScreenModel {
  const totalProgress = allPlanets.reduce(
    (sum, planet) => sum + planet.completionPct,
    0,
  );
  return {
    type: 'navigation',
    planets: allPlanets,
    // Guards against dividing by zero before any planet has loaded.
    overallStatus:
      allPlanets.length === 0 ? 0 : totalProgress / allPlanets.length,
  };
}

/** Creates the radio-wave round for the navigation flow and standalone demo. */
export function makeRadioWaveMinigameScreen(): RadioWaveMinigameScreenModel {
  return {
    type: 'radioWaveMinigame',
    question: {
      amplitude: 1,
      frequency: 1,
      horizontalShift: 0,
      verticalShift: 0,
    },
    config: {timeLimitSeconds: 80, correctAnswersForHint: 5},
  };
}
