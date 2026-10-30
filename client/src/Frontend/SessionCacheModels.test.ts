import {describe, expect, it} from 'vitest';
import {
  Settings,
  Player,
  ReadingTask,
  QuestionTask,
} from './SessionCacheModels';
import {
  MISSING_FIELDS_ERROR,
  CLASS_CREATION_ERROR,
  FIELD_RANGE_ERROR,
  TYPE_ERROR,
} from './ErrorMessages';

describe('parseSettings', () => {
  it('parse valid setting JSON strings', () => {
    const JSON_STRING = JSON.stringify({musicVolume: 0.5, sfxVolume: 0.75});
    const settings = Settings.createFromJson(JSON_STRING);
    expect(settings).toBeInstanceOf(Settings);
    expect(settings).toEqual({musicVolume: 0.5, sfxVolume: 0.75});
  });
  it('throws an error when missing sfxVolume', () => {
    const JSON_STRING = JSON.stringify({musicVolume: 0.5});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['sfxVolume']),
    );
  });
  it('throws an error when missing musicVolume', () => {
    const JSON_STRING = JSON.stringify({sfxVolume: 0.75});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['musicVolume']),
    );
  });
  it('throws an error for missing both musicVolume and sfxVolume', () => {
    const JSON_STRING = JSON.stringify({});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['musicVolume', 'sfxVolume']),
    );
  });
  it('throws an error when musicVolume is out of range', () => {
    const JSON_STRING = JSON.stringify({musicVolume: -0.1, sfxVolume: 0.75});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      FIELD_RANGE_ERROR('musicVolume', 0, 1),
    );
  });
  it('throws an error when sfxVolume is out of range', () => {
    const JSON_STRING = JSON.stringify({musicVolume: 0.5, sfxVolume: 1.1});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      FIELD_RANGE_ERROR('sfxVolume', 0, 1),
    );
  });
});

describe('parsePlayer', () => {
  it('throws an error when missing userId', () => {
    const JSON_STRING = JSON.stringify({
      name: 'Player1',
      hintQuota: 3,
      settings: {musicVolume: 0.5, sfxVolume: 0.75},
    });
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['userId']),
    );
  });
  it('throws an error when class creation fails for settings', () => {
    const JSON_STRING = JSON.stringify({
      userId: 123,
      name: 'Player1',
      hintQuota: 3,
    });
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      CLASS_CREATION_ERROR(
        'Settings',
        new Error(MISSING_FIELDS_ERROR(['settings'])),
      ),
    );
  });
  it('throws an error when hintQuota is negative', () => {
    const JSON_STRING = JSON.stringify({
      userId: 123,
      name: 'Player1',
      hintQuota: -1,
      settings: {musicVolume: 0.5, sfxVolume: 0.75},
    });
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      FIELD_RANGE_ERROR('hintQuota', 0, Infinity),
    );
  });
  it('throws an error when name is missing', () => {
    const JSON_STRING = JSON.stringify({
      userId: 123,
      hintQuota: 3,
      settings: {musicVolume: 0.5, sfxVolume: 0.75},
    });
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['name']),
    );
  });
  it('throws an error when name is not a string', () => {
    const JSON_STRING = JSON.stringify({
      userId: 123,
      name: 456,
      hintQuota: 3,
      settings: {musicVolume: 0.5, sfxVolume: 0.75},
    });
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      TYPE_ERROR('name', 'string'),
    );
  });
});

const VALID_READING = {type: 'Reading', text: 'The slope is m.'};
const VALID_QUESTION = {
  type: 'Question',
  prompt: 'What is the slope of y = 2x + 3?',
  options: ['2', '3'],
  correct: 0,
};

describe('parseReadingTask', () => {
  it('parses a valid reading task', () => {
    const task = ReadingTask.createFromJson(JSON.stringify(VALID_READING));
    expect(task).toBeInstanceOf(ReadingTask);
    expect(task.toType()).toEqual(VALID_READING);
  });
  it('throws an error when text is missing', () => {
    expect(() => ReadingTask.createFromJson('{}')).toThrowError(
      MISSING_FIELDS_ERROR(['text']),
    );
  });
  it('throws an error when text is not a string', () => {
    const JSON_STRING = JSON.stringify({text: 123});
    expect(() => ReadingTask.createFromJson(JSON_STRING)).toThrowError(
      TYPE_ERROR('text', 'string'),
    );
  });
  it('throws an error when text is blank', () => {
    const JSON_STRING = JSON.stringify({text: '   '});
    expect(() => ReadingTask.createFromJson(JSON_STRING)).toThrowError(
      'text cannot be empty',
    );
  });
});

describe('parseQuestionTask', () => {
  it('parses a valid question task', () => {
    const task = QuestionTask.createFromJson(JSON.stringify(VALID_QUESTION));
    expect(task).toBeInstanceOf(QuestionTask);
    expect(task.toType()).toEqual(VALID_QUESTION);
  });
  it('throws an error listing all missing fields', () => {
    expect(() => QuestionTask.createFromJson('{}')).toThrowError(
      MISSING_FIELDS_ERROR(['prompt', 'options', 'correct']),
    );
  });
  it('throws an error when prompt is not a string', () => {
    const JSON_STRING = JSON.stringify({...VALID_QUESTION, prompt: 123});
    expect(() => QuestionTask.createFromJson(JSON_STRING)).toThrowError(
      TYPE_ERROR('prompt', 'string'),
    );
  });
  it('throws an error when options is not an array', () => {
    const JSON_STRING = JSON.stringify({...VALID_QUESTION, options: 'a'});
    expect(() => QuestionTask.createFromJson(JSON_STRING)).toThrowError(
      TYPE_ERROR('options', 'string[]'),
    );
  });
  it('throws an error when an option is not a string', () => {
    const JSON_STRING = JSON.stringify({...VALID_QUESTION, options: ['a', 1]});
    expect(() => QuestionTask.createFromJson(JSON_STRING)).toThrowError(
      TYPE_ERROR('options', 'string[]'),
    );
  });
  it('throws an error when options is empty', () => {
    const JSON_STRING = JSON.stringify({...VALID_QUESTION, options: []});
    expect(() => QuestionTask.createFromJson(JSON_STRING)).toThrowError(
      'options cannot be empty',
    );
  });
  it('accepts the last option as correct', () => {
    const JSON_STRING = JSON.stringify({...VALID_QUESTION, correct: 1});
    expect(QuestionTask.createFromJson(JSON_STRING).correct).toBe(1);
  });
  it.each([2, -1, 0.5, '0'])('throws an error when correct is %s', correct => {
    const JSON_STRING = JSON.stringify({...VALID_QUESTION, correct});
    expect(() => QuestionTask.createFromJson(JSON_STRING)).toThrowError(
      FIELD_RANGE_ERROR('correct', 0, 1),
    );
  });
});
