import {describe, expect, it} from 'vitest';
import type {QuestionTask} from '@graphalaxy/shared';
import {
  questionTaskToQuestionScreen,
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
