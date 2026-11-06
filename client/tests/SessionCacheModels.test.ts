import {describe, expect, it} from 'vitest';
import {
  parseAnswerOption,
  parseAnswerResult,
  parsePlanet,
  parsePlayer,
  parseQuestion,
  parseQuestionTask,
  parseReadingTask,
  parseSettings,
} from '../src/Frontend/SessionCacheModels';
import {
  MISSING_FIELDS_ERROR,
  CLASS_CREATION_ERROR,
  FIELD_RANGE_ERROR,
  TYPE_ERROR,
} from '../src/Frontend/ErrorMessages';

describe('parseSettings', () => {
  it('parses valid settings', () => {
    expect(parseSettings({musicVolume: 0.5, sfxVolume: 0.75})).toEqual({
      musicVolume: 0.5,
      sfxVolume: 0.75,
    });
  });
  it('throws an error when missing sfxVolume', () => {
    expect(() => parseSettings({musicVolume: 0.5})).toThrowError(
      MISSING_FIELDS_ERROR(['sfxVolume']),
    );
  });
  it('throws an error when missing musicVolume', () => {
    expect(() => parseSettings({sfxVolume: 0.75})).toThrowError(
      MISSING_FIELDS_ERROR(['musicVolume']),
    );
  });
  it('throws an error for missing both musicVolume and sfxVolume', () => {
    expect(() => parseSettings({})).toThrowError(
      MISSING_FIELDS_ERROR(['musicVolume', 'sfxVolume']),
    );
  });
  it('throws an error when musicVolume is out of range', () => {
    expect(() =>
      parseSettings({musicVolume: -0.1, sfxVolume: 0.75}),
    ).toThrowError(FIELD_RANGE_ERROR('musicVolume', 0, 1));
  });
  it('throws an error when sfxVolume is out of range', () => {
    expect(() =>
      parseSettings({musicVolume: 0.5, sfxVolume: 1.1}),
    ).toThrowError(FIELD_RANGE_ERROR('sfxVolume', 0, 1));
  });
  it.each([0, 1])('accepts volumes at the boundary value %s', volume => {
    expect(parseSettings({musicVolume: volume, sfxVolume: volume})).toEqual({
      musicVolume: volume,
      sfxVolume: volume,
    });
  });
  it.each(['musicVolume', 'sfxVolume'])(
    'throws an error when %s is not a number',
    field => {
      expect(() =>
        parseSettings({musicVolume: 0.5, sfxVolume: 0.75, [field]: '0.5'}),
      ).toThrowError(FIELD_RANGE_ERROR(field, 0, 1));
    },
  );
  it('drops fields that are not part of Settings', () => {
    expect(
      parseSettings({musicVolume: 0.5, sfxVolume: 0.75, extra: true}),
    ).toEqual({musicVolume: 0.5, sfxVolume: 0.75});
  });
});

const VALID_PLAYER = {
  userId: 123,
  name: 'Player1',
  hintQuota: 3,
  settings: {musicVolume: 0.5, sfxVolume: 0.75},
};

describe('parsePlayer', () => {
  it('parses a valid player with nested settings', () => {
    expect(parsePlayer(VALID_PLAYER)).toEqual(VALID_PLAYER);
  });
  it('accepts a hintQuota of 0', () => {
    expect(parsePlayer({...VALID_PLAYER, hintQuota: 0}).hintQuota).toBe(0);
  });
  it('throws an error listing all missing fields', () => {
    expect(() => parsePlayer({settings: VALID_PLAYER.settings})).toThrowError(
      MISSING_FIELDS_ERROR(['userId', 'name', 'hintQuota']),
    );
  });
  it.each(['userId', 'name', 'hintQuota', 'settings'])(
    'throws an error when %s is missing',
    field => {
      const json: Record<string, unknown> = {...VALID_PLAYER};
      delete json[field];
      expect(() => parsePlayer(json)).toThrowError(
        MISSING_FIELDS_ERROR([field]),
      );
    },
  );
  it.each(['userId', 'hintQuota'])(
    'throws an error when %s is not a number',
    field => {
      expect(() => parsePlayer({...VALID_PLAYER, [field]: '1'})).toThrowError(
        TYPE_ERROR(field, 'number'),
      );
    },
  );
  it.each([
    ['userId', 0, 1],
    ['userId', 1.5, 1],
    ['hintQuota', -1, 0],
    ['hintQuota', 1.5, 0],
  ])('throws an error when %s is %s', (field, value, min) => {
    expect(() => parsePlayer({...VALID_PLAYER, [field]: value})).toThrowError(
      FIELD_RANGE_ERROR(
        field as string,
        min as number,
        Number.MAX_SAFE_INTEGER,
      ),
    );
  });
  it.each(['   ', 456])('throws an error when name is %s', name => {
    expect(() => parsePlayer({...VALID_PLAYER, name})).toThrowError(
      TYPE_ERROR('name', 'string'),
    );
  });
  it('wraps the error when settings values are invalid', () => {
    expect(() =>
      parsePlayer({
        ...VALID_PLAYER,
        settings: {musicVolume: 2, sfxVolume: 0.75},
      }),
    ).toThrowError(
      CLASS_CREATION_ERROR(
        'Settings',
        new Error(FIELD_RANGE_ERROR('musicVolume', 0, 1)),
      ),
    );
  });
});

const VALID_OPTION = {optionId: 11, label: 'a', text: '2'};
const VALID_QUESTION = {
  questionId: 1,
  prompt: 'What is the slope of y = 2x + 3?',
  type: 'mcq',
  options: [VALID_OPTION, {optionId: 12, label: 'b', text: '3'}],
};
const VALID_READING = {type: 'Reading', text: 'The slope is m.'};
const VALID_QUESTION_TASK = {
  type: 'Question',
  question: VALID_QUESTION,
  // solved: false,
};

describe('parseAnswerOption', () => {
  it('parses a valid option', () => {
    expect(parseAnswerOption(VALID_OPTION)).toEqual(VALID_OPTION);
  });
  it('throws an error listing all missing fields', () => {
    expect(() => parseAnswerOption({})).toThrowError(
      MISSING_FIELDS_ERROR(['optionId', 'label', 'text']),
    );
  });
  it.each([0, 1.5])('throws an error when optionId is %s', optionId => {
    expect(() => parseAnswerOption({...VALID_OPTION, optionId})).toThrowError(
      FIELD_RANGE_ERROR('optionId', 1, Number.MAX_SAFE_INTEGER),
    );
  });
  it('throws an error when text is not a string', () => {
    expect(() => parseAnswerOption({...VALID_OPTION, text: 2})).toThrowError(
      TYPE_ERROR('text', 'string'),
    );
  });
});

describe('parseQuestion', () => {
  it('parses a valid question without a graph', () => {
    expect(parseQuestion(VALID_QUESTION)).toEqual(VALID_QUESTION);
  });
  it('keeps a graph object', () => {
    const json = {...VALID_QUESTION, graph: {fn: '2*x+3'}};
    expect(parseQuestion(json).graph).toEqual({fn: '2*x+3'});
  });
  // Cases are wrapped in arrays because it.each spreads an array case.
  it.each([['2*x+3'], [null], [[]]])(
    'throws an error when graph is %j',
    graph => {
      expect(() => parseQuestion({...VALID_QUESTION, graph})).toThrowError(
        TYPE_ERROR('graph', 'object'),
      );
    },
  );
  it('throws an error listing all missing fields', () => {
    expect(() => parseQuestion({})).toThrowError(
      MISSING_FIELDS_ERROR(['questionId', 'prompt', 'type', 'options']),
    );
  });
  it('throws an error for an unknown question type', () => {
    expect(() =>
      parseQuestion({...VALID_QUESTION, type: 'free_response'}),
    ).toThrowError('Unknown question type: free_response');
  });
  it('throws an error when prompt is not a string', () => {
    expect(() => parseQuestion({...VALID_QUESTION, prompt: 123})).toThrowError(
      TYPE_ERROR('prompt', 'string'),
    );
  });
  it.each([['a'], [[]]])('throws an error when options is %j', options => {
    expect(() => parseQuestion({...VALID_QUESTION, options})).toThrowError(
      TYPE_ERROR('options', 'non-empty array'),
    );
  });
  it('throws an error when an option is invalid', () => {
    expect(() =>
      parseQuestion({...VALID_QUESTION, options: ['2', '3']}),
    ).toThrowError(MISSING_FIELDS_ERROR(['optionId', 'label', 'text']));
  });
  it('does not keep an answer key the server should never send', () => {
    const question = parseQuestion({...VALID_QUESTION, correct: 0});
    expect(question).not.toHaveProperty('correct');
  });
});

describe('parseReadingTask', () => {
  it('parses a valid reading task', () => {
    expect(parseReadingTask(VALID_READING)).toEqual(VALID_READING);
  });
  it('throws an error when text is missing', () => {
    expect(() => parseReadingTask({})).toThrowError(
      MISSING_FIELDS_ERROR(['text']),
    );
  });
  it('throws an error when text is not a string', () => {
    expect(() => parseReadingTask({text: 123})).toThrowError(
      TYPE_ERROR('text', 'string'),
    );
  });
  it('throws an error when text is blank', () => {
    expect(() => parseReadingTask({text: '   '})).toThrowError(
      'text cannot be empty',
    );
  });
});

describe('parseQuestionTask', () => {
  it('parses a valid question task', () => {
    expect(parseQuestionTask(VALID_QUESTION_TASK)).toEqual(VALID_QUESTION_TASK);
  });
  it('throws an error listing all missing fields', () => {
    expect(() => parseQuestionTask({})).toThrowError(
      MISSING_FIELDS_ERROR(['question']),
    );
  });
  // it('throws an error when solved is not a boolean', () => {
  //   expect(() =>
  //     parseQuestionTask({...VALID_QUESTION_TASK, solved: 'no'}),
  //   ).toThrowError(TYPE_ERROR('solved', 'boolean'));
  // });
});

const VALID_PLANET = {
  planetId: 1,
  name: 'Linear Land',
  introText: 'A hostile world of straight lines.',
  graphOrder: 0,
  tasks: [VALID_READING, VALID_QUESTION_TASK],
};

describe('parsePlanet', () => {
  it('parses a valid planet with both task types', () => {
    expect(parsePlanet(VALID_PLANET)).toEqual(VALID_PLANET);
  });
  it('keeps the tasks in order', () => {
    const planet = parsePlanet({
      ...VALID_PLANET,
      tasks: [VALID_QUESTION_TASK, VALID_READING],
    });
    expect(planet.tasks.map(task => task.type)).toEqual([
      'Question',
      'Reading',
    ]);
  });
  it('accepts a planet with no tasks', () => {
    expect(parsePlanet({...VALID_PLANET, tasks: []}).tasks).toEqual([]);
  });
  it('throws an error listing all missing fields', () => {
    expect(() => parsePlanet({})).toThrowError(
      MISSING_FIELDS_ERROR([
        'planetId',
        'name',
        'introText',
        'graphOrder',
        'tasks',
      ]),
    );
  });
  it.each(['planetId', 'graphOrder'])(
    'throws an error when %s is not a number',
    field => {
      expect(() => parsePlanet({...VALID_PLANET, [field]: '1'})).toThrowError(
        TYPE_ERROR(field, 'number'),
      );
    },
  );
  it.each([0, 1.5])('throws an error when planetId is %s', planetId => {
    expect(() => parsePlanet({...VALID_PLANET, planetId})).toThrowError(
      FIELD_RANGE_ERROR('planetId', 1, Number.MAX_SAFE_INTEGER),
    );
  });
  it.each([-1, 1.5])('throws an error when graphOrder is %s', graphOrder => {
    expect(() => parsePlanet({...VALID_PLANET, graphOrder})).toThrowError(
      FIELD_RANGE_ERROR('graphOrder', 0, Number.MAX_SAFE_INTEGER),
    );
  });
  it.each(['name', 'introText'])(
    'throws an error when %s is not a string',
    field => {
      expect(() => parsePlanet({...VALID_PLANET, [field]: 123})).toThrowError(
        TYPE_ERROR(field, 'string'),
      );
    },
  );
  it('throws an error when tasks is not an array', () => {
    expect(() => parsePlanet({...VALID_PLANET, tasks: 'none'})).toThrowError(
      TYPE_ERROR('tasks', 'array'),
    );
  });
  it('throws an error when a task has no type', () => {
    expect(() =>
      parsePlanet({...VALID_PLANET, tasks: [{text: 'a'}]}),
    ).toThrowError(MISSING_FIELDS_ERROR(['type']));
  });
  it('throws an error when a task has an unknown type', () => {
    expect(() =>
      parsePlanet({...VALID_PLANET, tasks: [{type: 'Video'}]}),
    ).toThrowError('Unknown task type: Video');
  });
  it('throws an error when a task is invalid', () => {
    expect(() =>
      parsePlanet({...VALID_PLANET, tasks: [VALID_READING, {type: 'Reading'}]}),
    ).toThrowError(MISSING_FIELDS_ERROR(['text']));
  });
});

const VALID_RESULT = {
  questionId: 1,
  correct: false,
  correctOption: VALID_OPTION,
};

describe('parseAnswerResult', () => {
  it('parses a valid answer result', () => {
    expect(parseAnswerResult(VALID_RESULT)).toEqual(VALID_RESULT);
  });
  it('throws an error listing all missing fields', () => {
    expect(() => parseAnswerResult({})).toThrowError(
      MISSING_FIELDS_ERROR(['questionId', 'correct', 'correctOption']),
    );
  });
  it('throws an error when correct is not a boolean', () => {
    expect(() => parseAnswerResult({...VALID_RESULT, correct: 1})).toThrowError(
      TYPE_ERROR('correct', 'boolean'),
    );
  });
});

describe.each([
  {
    model: 'Settings',
    parse: parseSettings,
    nonObjectError: MISSING_FIELDS_ERROR(['musicVolume', 'sfxVolume']),
  },
  {
    model: 'Player',
    parse: parsePlayer,
    nonObjectError: MISSING_FIELDS_ERROR([
      'userId',
      'name',
      'hintQuota',
      'settings',
    ]),
  },
  {
    model: 'ReadingTask',
    parse: parseReadingTask,
    nonObjectError: MISSING_FIELDS_ERROR(['text']),
  },
  {
    model: 'QuestionTask',
    parse: parseQuestionTask,
    nonObjectError: MISSING_FIELDS_ERROR(['question']),
  },
  {
    model: 'Planet',
    parse: parsePlanet,
    nonObjectError: MISSING_FIELDS_ERROR([
      'planetId',
      'name',
      'introText',
      'graphOrder',
      'tasks',
    ]),
  },
  {
    model: 'AnswerResult',
    parse: parseAnswerResult,
    nonObjectError: MISSING_FIELDS_ERROR([
      'questionId',
      'correct',
      'correctOption',
    ]),
  },
])('$model edge cases', ({parse, nonObjectError}) => {
  it.each([[null], [[]], [5], ['text']])(
    'throws an error when the JSON is %j instead of an object',
    json => {
      expect(() => parse(json)).toThrowError(nonObjectError);
    },
  );
});
