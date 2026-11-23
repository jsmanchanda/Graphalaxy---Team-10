import {describe, expect, it} from 'vitest';
import type {
  PlanetSummary,
  QuestionTask,
  ReadingTask,
} from '@graphalaxy/shared';
import {
  describeProgress,
  makeLessonIntroScreen,
  makeLessonResultScreen,
  questionTaskToQuestionScreen,
  readingTaskToScreen,
  taskToScreen,
} from '../src/Frontend/screenModelMaker';

const TASK: QuestionTask = {
  type: 'Question',
  question: {
    questionId: 1,
    prompt: 'What is the slope?',
    type: 'mcq',
    options: [{optionId: 11, label: 'a', text: '2'}],
  },
};

describe('question screen planet', () => {
  it.each([1, 2, 3, 4])('passes planet %i to the question screen', planetId => {
    expect(questionTaskToQuestionScreen(TASK, planetId).planetId).toBe(
      planetId,
    );
  });

  it('passes the planet through taskToScreen', () => {
    expect(taskToScreen(TASK, 3)).toMatchObject({planetId: 3});
  });

  it('leaves the planet to the view default when none is given', () => {
    expect(questionTaskToQuestionScreen(TASK)).not.toHaveProperty('planetId');
  });
});

const READING_TASK: ReadingTask = {type: 'Reading', text: 'Slope is m.'};

describe('reading screen planet', () => {
  it.each([1, 2, 3, 4])('passes planet %i to the reading screen', planetId => {
    expect(readingTaskToScreen(READING_TASK, planetId).planetId).toBe(planetId);
  });

  it('passes the planet through taskToScreen', () => {
    expect(taskToScreen(READING_TASK, 3)).toMatchObject({
      type: 'reading',
      planetId: 3,
    });
  });

  it('leaves the planet to the view default when none is given', () => {
    expect(readingTaskToScreen(READING_TASK)).not.toHaveProperty('planetId');
  });
});

const PROGRESS: PlanetSummary = {
  planetId: 1,
  name: 'Linear Land',
  graphOrder: 1,
  prereqIds: [],
  unlocked: true,
  status: 'hostile',
  correctCount: 1,
  questionCount: 2,
  completionPct: 0.5,
};

describe('describeProgress', () => {
  it('puts the status on its own line below the score', () => {
    expect(describeProgress(PROGRESS)).toBe(
      '1 of 2 questions correct (50%)\n\nStatus: hostile',
    );
  });
});

describe('lesson intro screen planet', () => {
  it.each([1, 2, 3, 4])('passes planet %i to the intro screen', planetId => {
    expect(
      makeLessonIntroScreen('Linear Land', 'Lines.', null, planetId).planetId,
    ).toBe(planetId);
  });

  it('leaves the planet to the view default when none is given', () => {
    expect(makeLessonIntroScreen('Linear Land', 'Lines.')).not.toHaveProperty(
      'planetId',
    );
  });

  it('adds the progress below the description', () => {
    expect(makeLessonIntroScreen('Linear Land', 'Lines.', PROGRESS)).toEqual({
      type: 'intro',
      title: 'Linear Land',
      description:
        'Lines.\n\nCurrent progress: 1 of 2 questions correct (50%)\n\nStatus: hostile',
    });
  });
});

describe('lesson result screen planet', () => {
  it.each([1, 2, 3, 4])('passes planet %i to the result screen', planetId => {
    expect(makeLessonResultScreen(PROGRESS, planetId).planetId).toBe(planetId);
  });

  it('leaves the planet to the view default when none is given', () => {
    expect(makeLessonResultScreen(PROGRESS)).not.toHaveProperty('planetId');
  });

  it('puts the outcome on a new line below the score', () => {
    expect(makeLessonResultScreen(PROGRESS).result).toBe(
      'You answered 1 of 2 questions correctly.\n' +
        ' Linear Land is still hostile. Redo the planet to try again.',
    );
  });
});
