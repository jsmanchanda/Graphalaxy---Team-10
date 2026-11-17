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

describe('question screen alien', () => {
  it.each([
    [1, '/assets/alien-dog.png'],
    [2, '/assets/alien-cat.png'],
    [3, '/assets/alien-seal.png'],
    [4, '/assets/alien-hamster.png'],
  ])('shows planet %i its own alien', (planetId, image) => {
    expect(questionTaskToQuestionScreen(TASK, planetId).alienImage).toBe(image);
  });

  it('passes the planet through taskToScreen', () => {
    expect(taskToScreen(TASK, 3)).toMatchObject({
      alienImage: '/assets/alien-seal.png',
    });
  });

  it('leaves the alien to the view default for an unknown planet', () => {
    expect(questionTaskToQuestionScreen(TASK, 99).alienImage).toBeUndefined();
    expect(questionTaskToQuestionScreen(TASK).alienImage).toBeUndefined();
  });
});
