import {describe, expect, it} from 'vitest';
import {
  Settings,
  Player,
  ReadingTask,
  QuestionTask,
  Lesson,
  Planet,
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
  it.each([0, 1])('accepts volumes at the boundary value %s', volume => {
    const JSON_STRING = JSON.stringify({
      musicVolume: volume,
      sfxVolume: volume,
    });
    expect(Settings.createFromJson(JSON_STRING)).toEqual({
      musicVolume: volume,
      sfxVolume: volume,
    });
  });
  it.each(['musicVolume', 'sfxVolume'])(
    'throws an error when %s is not a number',
    field => {
      const JSON_STRING = JSON.stringify({
        musicVolume: 0.5,
        sfxVolume: 0.75,
        [field]: '0.5',
      });
      expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
        FIELD_RANGE_ERROR(field, 0, 1),
      );
    },
  );
});

const VALID_PLAYER = {
  userId: 123,
  name: 'Player1',
  hintQuota: 3,
  settings: {musicVolume: 0.5, sfxVolume: 0.75},
};

describe('parsePlayer', () => {
  it('parses a valid player with nested settings', () => {
    const player = Player.createFromJson(JSON.stringify(VALID_PLAYER));
    expect(player).toBeInstanceOf(Player);
    expect(player.settings).toBeInstanceOf(Settings);
    expect(player).toEqual(VALID_PLAYER);
  });
  it('accepts a hintQuota of 0', () => {
    const JSON_STRING = JSON.stringify({...VALID_PLAYER, hintQuota: 0});
    expect(Player.createFromJson(JSON_STRING).hintQuota).toBe(0);
  });
  it('throws an error listing all missing fields', () => {
    const JSON_STRING = JSON.stringify({settings: VALID_PLAYER.settings});
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['userId', 'name', 'hintQuota']),
    );
  });
  it('throws an error when hintQuota is missing', () => {
    const JSON_STRING = JSON.stringify({
      userId: 123,
      name: 'Player1',
      settings: VALID_PLAYER.settings,
    });
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['hintQuota']),
    );
  });
  it.each(['userId', 'hintQuota'])(
    'throws an error when %s is not a number',
    field => {
      const JSON_STRING = JSON.stringify({...VALID_PLAYER, [field]: '1'});
      expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
        FIELD_RANGE_ERROR(field, 0, Infinity),
      );
    },
  );
  it('throws an error when name is blank', () => {
    const JSON_STRING = JSON.stringify({...VALID_PLAYER, name: '   '});
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      TYPE_ERROR('name', 'string'),
    );
  });
  it('wraps the error when settings values are invalid', () => {
    const JSON_STRING = JSON.stringify({
      ...VALID_PLAYER,
      settings: {musicVolume: 2, sfxVolume: 0.75},
    });
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      CLASS_CREATION_ERROR(
        'Settings',
        new Error(FIELD_RANGE_ERROR('musicVolume', 0, 1)),
      ),
    );
  });
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

const VALID_LESSON = {
  lessonNumber: 1,
  introText: 'A linear function has the form y = mx + b.',
  lessonName: 'Linear functions',
  tasks: [VALID_READING, VALID_QUESTION],
};
const VALID_PLANET = {
  planetId: 1,
  name: 'Linear Land',
  introText: 'A hostile world of straight lines.',
  graphOrder: 0,
  lessons: [VALID_LESSON],
};
describe('parseLesson', () => {
  it('parses a valid lesson with both task types', () => {
    const lesson = Lesson.createFromJson(JSON.stringify(VALID_LESSON));
    expect(lesson).toBeInstanceOf(Lesson);
    expect(lesson.tasks[0]).toBeInstanceOf(ReadingTask);
    expect(lesson.tasks[1]).toBeInstanceOf(QuestionTask);
    expect(lesson.toType()).toEqual(VALID_LESSON);
  });
  it('keeps the tasks in order', () => {
    const JSON_STRING = JSON.stringify({
      ...VALID_LESSON,
      tasks: [VALID_QUESTION, VALID_READING],
    });
    const lesson = Lesson.createFromJson(JSON_STRING);
    expect(lesson.tasks.map(task => task.taskType)).toEqual([
      'Question',
      'Reading',
    ]);
  });
  it('accepts a lesson with no tasks', () => {
    const JSON_STRING = JSON.stringify({...VALID_LESSON, tasks: []});
    expect(Lesson.createFromJson(JSON_STRING).tasks).toEqual([]);
  });
  it('throws an error listing all missing fields', () => {
    expect(() => Lesson.createFromJson('{}')).toThrowError(
      MISSING_FIELDS_ERROR([
        'lessonNumber',
        'introText',
        'lessonName',
        'tasks',
      ]),
    );
  });
  it('throws an error when lessonNumber is not a number', () => {
    const JSON_STRING = JSON.stringify({...VALID_LESSON, lessonNumber: '1'});
    expect(() => Lesson.createFromJson(JSON_STRING)).toThrowError(
      TYPE_ERROR('lessonNumber', 'number'),
    );
  });
  it.each([0, 1.5])('throws an error when lessonNumber is %s', lessonNumber => {
    const JSON_STRING = JSON.stringify({...VALID_LESSON, lessonNumber});
    expect(() => Lesson.createFromJson(JSON_STRING)).toThrowError(
      FIELD_RANGE_ERROR('lessonNumber', 1, Number.MAX_SAFE_INTEGER),
    );
  });
  it.each(['introText', 'lessonName'])(
    'throws an error when %s is not a string',
    field => {
      const JSON_STRING = JSON.stringify({...VALID_LESSON, [field]: 123});
      expect(() => Lesson.createFromJson(JSON_STRING)).toThrowError(
        TYPE_ERROR(field, 'string'),
      );
    },
  );
  it('throws an error when tasks is not an array', () => {
    const JSON_STRING = JSON.stringify({...VALID_LESSON, tasks: 'none'});
    expect(() => Lesson.createFromJson(JSON_STRING)).toThrowError(
      TYPE_ERROR('tasks', 'array'),
    );
  });
  it('throws an error when a task has no type', () => {
    const JSON_STRING = JSON.stringify({...VALID_LESSON, tasks: [{text: 'a'}]});
    expect(() => Lesson.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['type']),
    );
  });
  it('throws an error when a task has an unknown type', () => {
    const JSON_STRING = JSON.stringify({
      ...VALID_LESSON,
      tasks: [{type: 'Video'}],
    });
    expect(() => Lesson.createFromJson(JSON_STRING)).toThrowError(
      'Unknown task type: Video',
    );
  });
  it('throws an error when a task is invalid', () => {
    const JSON_STRING = JSON.stringify({
      ...VALID_LESSON,
      tasks: [VALID_READING, {type: 'Reading'}],
    });
    expect(() => Lesson.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['text']),
    );
  });
});

describe('parsePlanet', () => {
  it('parses a valid planet with nested lessons', () => {
    const planet = Planet.createFromJson(JSON.stringify(VALID_PLANET));
    expect(planet).toBeInstanceOf(Planet);
    expect(planet.planetId).toBe(1);
    expect(planet.name).toBe('Linear Land');
    expect(planet.introText).toBe('A hostile world of straight lines.');
    expect(planet.graphOrder).toBe(0);
    expect(planet.lessons[0]).toBeInstanceOf(Lesson);
    expect(planet.lessons[0].toType()).toEqual(VALID_LESSON);
  });
  it('accepts a planet with no lessons', () => {
    const JSON_STRING = JSON.stringify({...VALID_PLANET, lessons: []});
    expect(Planet.createFromJson(JSON_STRING).lessons).toEqual([]);
  });
  it('throws an error listing all missing fields', () => {
    expect(() => Planet.createFromJson('{}')).toThrowError(
      MISSING_FIELDS_ERROR([
        'planetId',
        'name',
        'introText',
        'graphOrder',
        'lessons',
      ]),
    );
  });
  it.each(['planetId', 'graphOrder'])(
    'throws an error when %s is not a number',
    field => {
      const JSON_STRING = JSON.stringify({...VALID_PLANET, [field]: '1'});
      expect(() => Planet.createFromJson(JSON_STRING)).toThrowError(
        TYPE_ERROR(field, 'number'),
      );
    },
  );
  it.each([0, 1.5])('throws an error when planetId is %s', planetId => {
    const JSON_STRING = JSON.stringify({...VALID_PLANET, planetId});
    expect(() => Planet.createFromJson(JSON_STRING)).toThrowError(
      FIELD_RANGE_ERROR('planetId', 1, Number.MAX_SAFE_INTEGER),
    );
  });
  it.each([-1, 1.5])('throws an error when graphOrder is %s', graphOrder => {
    const JSON_STRING = JSON.stringify({...VALID_PLANET, graphOrder});
    expect(() => Planet.createFromJson(JSON_STRING)).toThrowError(
      FIELD_RANGE_ERROR('graphOrder', 0, Number.MAX_SAFE_INTEGER),
    );
  });
  it.each(['name', 'introText'])(
    'throws an error when %s is not a string',
    field => {
      const JSON_STRING = JSON.stringify({...VALID_PLANET, [field]: 123});
      expect(() => Planet.createFromJson(JSON_STRING)).toThrowError(
        TYPE_ERROR(field, 'string'),
      );
    },
  );
  it('throws an error when lessons is not an array', () => {
    const JSON_STRING = JSON.stringify({...VALID_PLANET, lessons: 'none'});
    expect(() => Planet.createFromJson(JSON_STRING)).toThrowError(
      TYPE_ERROR('lessons', 'array'),
    );
  });
  it('throws an error when a nested lesson is invalid', () => {
    const JSON_STRING = JSON.stringify({
      ...VALID_PLANET,
      lessons: [{...VALID_LESSON, lessonName: 123}],
    });
    expect(() => Planet.createFromJson(JSON_STRING)).toThrowError(
      TYPE_ERROR('lessonName', 'string'),
    );
  });
});

describe.each([
  {
    model: 'Settings',
    parse: (json: string) => Settings.createFromJson(json),
    nonObjectError: MISSING_FIELDS_ERROR(['musicVolume', 'sfxVolume']),
  },
  {
    model: 'Player',
    parse: (json: string) => Player.createFromJson(json),
    nonObjectError: CLASS_CREATION_ERROR(
      'Settings',
      new Error(MISSING_FIELDS_ERROR(['settings'])),
    ),
  },
  {
    model: 'ReadingTask',
    parse: (json: string) => ReadingTask.createFromJson(json),
    nonObjectError: MISSING_FIELDS_ERROR(['text']),
  },
  {
    model: 'QuestionTask',
    parse: (json: string) => QuestionTask.createFromJson(json),
    nonObjectError: MISSING_FIELDS_ERROR(['prompt', 'options', 'correct']),
  },
  {
    model: 'Lesson',
    parse: (json: string) => Lesson.createFromJson(json),
    nonObjectError: MISSING_FIELDS_ERROR([
      'lessonNumber',
      'introText',
      'lessonName',
      'tasks',
    ]),
  },
  {
    model: 'Planet',
    parse: (json: string) => Planet.createFromJson(json),
    nonObjectError: MISSING_FIELDS_ERROR([
      'planetId',
      'name',
      'introText',
      'graphOrder',
      'lessons',
    ]),
  },
])('$model edge cases', ({parse, nonObjectError}) => {
  it.each(['null', '[]', '5', '"text"'])(
    'throws an error when the JSON is %s instead of an object',
    json => {
      expect(() => parse(json)).toThrowError(nonObjectError);
    },
  );
  it('throws a SyntaxError for malformed JSON', () => {
    expect(() => parse('{bad')).toThrowError(SyntaxError);
  });
});
