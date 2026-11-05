/*
  @fileoverview Checks that JSON from the backend matches the shared API
  types. Each parser takes an already-parsed JSON value (ApiClient calls
  JSON.parse once) and returns it typed, or throws an Error saying what is
  wrong. The types themselves live in @graphalaxy/shared.
*/

import type {
  AnswerOption,
  AnswerResult,
  GraphSpec,
  Planet,
  Player,
  Question,
  QuestionTask,
  ReadingTask,
  Settings,
  Task,
} from '@graphalaxy/shared';

import {
  MISSING_FIELDS_ERROR,
  CLASS_CREATION_ERROR,
  FIELD_RANGE_ERROR,
  TYPE_ERROR,
} from './ErrorMessages';

/**
 * Checks whether a value is a JSON object (not null and not an array).
 * @param x The value to check.
 * @returns True if x is a non-null, non-array object.
 */
function isObject(x: unknown): x is Record<string, unknown> {
  // empty array or set is also `typeof 'object'`, but we don't want that.
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Checks that a value is an object with all the given fields.
 * @param json The value to check.
 * @param fields The field names that must be present.
 * @throws {Error} Listing every missing field, or all of them for a non-object.
 */
function assertHasFields(
  json: unknown,
  fields: string[],
): asserts json is Record<string, unknown> {
  if (!isObject(json)) {
    throw new Error(MISSING_FIELDS_ERROR(fields));
  }
  const missingFields = fields.filter(field => !(field in json));
  if (missingFields.length > 0) {
    throw new Error(MISSING_FIELDS_ERROR(missingFields));
  }
}

/**
 * Checks that a value is a whole number of at least `min`.
 * @param value The value to check.
 * @param field The field name, for the error message.
 * @param min The smallest allowed value.
 * @returns The value as a number.
 */
function requireInteger(value: unknown, field: string, min: number): number {
  if (typeof value !== 'number') {
    throw new Error(TYPE_ERROR(field, 'number'));
  }
  if (!Number.isSafeInteger(value) || value < min) {
    throw new Error(FIELD_RANGE_ERROR(field, min, Number.MAX_SAFE_INTEGER));
  }
  return value;
}

/**
 * Checks that a value is a string.
 * @param value The value to check.
 * @param field The field name, for the error message.
 * @returns The value as a string.
 */
function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(TYPE_ERROR(field, 'string'));
  }
  return value;
}

/**
 * Parses audio settings.
 * @param json The parsed JSON value.
 * @returns The settings.
 * @throws {Error} If a field is missing or a volume is not between 0 and 1.
 */
export function parseSettings(json: unknown): Settings {
  assertHasFields(json, ['musicVolume', 'sfxVolume']);
  for (const field of ['musicVolume', 'sfxVolume'] as const) {
    const volume = json[field];
    if (typeof volume !== 'number' || !(volume >= 0 && volume <= 1)) {
      throw new Error(FIELD_RANGE_ERROR(field, 0, 1));
    }
  }
  return {
    musicVolume: json.musicVolume as number,
    sfxVolume: json.sfxVolume as number,
  };
}

/**
 * Parses a player and their nested settings.
 * @param json The parsed JSON value.
 * @returns The player.
 * @throws {Error} If a field is missing or invalid. Settings errors are wrapped
 * with CLASS_CREATION_ERROR('Settings', ...).
 */
export function parsePlayer(json: unknown): Player {
  assertHasFields(json, ['userId', 'name', 'hintQuota', 'settings']);
  if (typeof json.name !== 'string' || json.name.trim() === '') {
    throw new Error(TYPE_ERROR('name', 'string'));
  }
  if (typeof json.userId !== 'number' || json.userId < 0) {
    throw new Error(FIELD_RANGE_ERROR('userId', 0, Infinity));
  }
  if (typeof json.hintQuota !== 'number' || json.hintQuota < 0) {
    throw new Error(FIELD_RANGE_ERROR('hintQuota', 0, Infinity));
  }
  let settings: Settings;
  try {
    settings = parseSettings(json.settings);
  } catch (error) {
    throw new Error(CLASS_CREATION_ERROR('Settings', error));
  }
  return {
    userId: json.userId,
    name: json.name,
    hintQuota: json.hintQuota,
    settings,
  };
}

/**
 * Parses an answer option.
 * @param json The parsed JSON value.
 * @returns The option.
 */
export function parseAnswerOption(json: unknown): AnswerOption {
  assertHasFields(json, ['optionId', 'label', 'text']);
  return {
    optionId: requireInteger(json.optionId, 'optionId', 1),
    label: requireString(json.label, 'label'),
    text: requireString(json.text, 'text'),
  };
}

/**
 * Parses a multiple-choice question. It carries no answer key.
 * @param json The parsed JSON value.
 * @returns The question.
 */
export function parseQuestion(json: unknown): Question {
  assertHasFields(json, ['questionId', 'prompt', 'type', 'options']);
  if (json.type !== 'mcq') {
    throw new Error(`Unknown question type: ${json.type}`);
  }
  if (!Array.isArray(json.options) || json.options.length === 0) {
    throw new Error(TYPE_ERROR('options', 'non-empty array'));
  }
  if ('graph' in json && !isObject(json.graph)) {
    throw new Error(TYPE_ERROR('graph', 'object'));
  }
  return {
    questionId: requireInteger(json.questionId, 'questionId', 1),
    prompt: requireString(json.prompt, 'prompt'),
    ...('graph' in json ? {graph: json.graph as GraphSpec} : {}),
    type: 'mcq',
    options: json.options.map(parseAnswerOption),
  };
}

/**
 * Parses a reading slide.
 * @param json The parsed JSON value.
 * @returns The reading task.
 */
export function parseReadingTask(json: unknown): ReadingTask {
  assertHasFields(json, ['text']);
  const text = requireString(json.text, 'text');
  if (text.trim() === '') {
    throw new Error('text cannot be empty');
  }
  return {type: 'Reading', text};
}

/**
 * Parses a question slide.
 * @param json The parsed JSON value.
 * @returns The question task.
 */
export function parseQuestionTask(json: unknown): QuestionTask {
  assertHasFields(json, ['question', 'solved']);
  if (typeof json.solved !== 'boolean') {
    throw new Error(TYPE_ERROR('solved', 'boolean'));
  }
  return {
    type: 'Question',
    question: parseQuestion(json.question),
    solved: json.solved,
  };
}

/**
 * Parses one slide, choosing the parser by its `type`.
 * @param json The parsed JSON value.
 * @returns The task.
 */
export function parseTask(json: unknown): Task {
  assertHasFields(json, ['type']);
  switch (json.type) {
    case 'Reading':
      return parseReadingTask(json);
    case 'Question':
      return parseQuestionTask(json);
    default:
      throw new Error(`Unknown task type: ${json.type}`);
  }
}

/**
 * Parses a planet and its ordered slides.
 * @param json The parsed JSON value.
 * @returns The planet.
 */
export function parsePlanet(json: unknown): Planet {
  assertHasFields(json, [
    'planetId',
    'name',
    'introText',
    'graphOrder',
    'tasks',
  ]);
  const planetId = requireInteger(json.planetId, 'planetId', 1);
  const name = requireString(json.name, 'name');
  const introText = requireString(json.introText, 'introText');
  const graphOrder = requireInteger(json.graphOrder, 'graphOrder', 0);
  if (!Array.isArray(json.tasks)) {
    throw new Error(TYPE_ERROR('tasks', 'array'));
  }
  return {
    planetId,
    name,
    introText,
    graphOrder,
    tasks: json.tasks.map(parseTask),
  };
}

/**
 * Parses the feedback for a submitted answer.
 * @param json The parsed JSON value.
 * @returns The answer result.
 */
export function parseAnswerResult(json: unknown): AnswerResult {
  assertHasFields(json, ['questionId', 'correct', 'correctOption']);
  if (typeof json.correct !== 'boolean') {
    throw new Error(TYPE_ERROR('correct', 'boolean'));
  }
  return {
    questionId: requireInteger(json.questionId, 'questionId', 1),
    correct: json.correct,
    correctOption: parseAnswerOption(json.correctOption),
  };
}
