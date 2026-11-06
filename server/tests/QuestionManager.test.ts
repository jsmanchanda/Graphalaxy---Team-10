import {beforeEach, describe, expect, it, vi, type Mock} from 'vitest';
import {
  QuestionManager,
  QuestionManagerError,
} from '../src/question-manager/QuestionManager';
import type {AnswerProgress} from '../src/question-manager/AnswerProgress';
import type {
  AnswerRep,
  ContentRep,
  DataWriter,
  PrivateOption,
  Question,
  Reading,
} from '../src/data-writer';

/** A stored attempt, including the submitted option required by the schema. */
interface Attempt {
  userId: number;
  questionId: number;
  optionId: number;
  correct: boolean;
}

/** Fake implementing the official Data Writer contracts and rollback behavior. */
class FakeDataWriter implements Pick<
  DataWriter,
  'content' | 'answers' | 'transaction'
> {
  readings: Reading[] = [
    {readingId: 20, planetId: 1, readingNumber: 2, text: 'Quadratics'},
    {readingId: 10, planetId: 1, readingNumber: 1, text: 'Lines'},
  ];
  questions: Question[] = [
    {questionId: 3, planetId: 1, prompt: 'Vertex?', graph: null, qtype: 'mcq'},
    {
      questionId: 2,
      planetId: 1,
      prompt: 'Intercept?',
      graph: null,
      qtype: 'mcq',
    },
    {
      questionId: 1,
      planetId: 1,
      prompt: 'Slope?',
      graph: '{"fn":"2*x+1"}',
      qtype: 'mcq',
    },
  ];
  options: PrivateOption[] = this.questions.flatMap(question => [
    {
      questionId: question.questionId,
      optionId: question.questionId * 10 + 1,
      label: 'a',
      text: '2',
      isCorrect: true,
    },
    {
      questionId: question.questionId,
      optionId: question.questionId * 10 + 2,
      label: 'b',
      text: '3',
      isCorrect: false,
    },
  ]);
  attempts: Attempt[] = [];

  content: ContentRep = {
    listPlanets: () =>
      [1, 2].map(planetId => ({
        planetId,
        name: `Planet ${planetId}`,
        introText: 'Welcome',
        graphOrder: planetId,
      })),
    getPlanet: planetId =>
      this.content.listPlanets().find(planet => planet.planetId === planetId),
    listPrereqs: () => [],
    // Like the SQL query, returns readings ordered by reading_number.
    getReadings: planetId =>
      this.readings
        .filter(reading => reading.planetId === planetId)
        .sort((a, b) => a.readingNumber - b.readingNumber),
    countQuestions: planetId => this.content.getQuestions(planetId).length,
    getQuestion: questionId =>
      this.questions.find(question => question.questionId === questionId),
    getQuestions: planetId =>
      this.questions
        .filter(question => question.planetId === planetId)
        .sort((a, b) => a.questionId - b.questionId),
    nextUnsolvedQuestion: (userId, planetId) =>
      this.content
        .getQuestions(planetId)
        .find(question => !this.answers.hasSolved(userId, question.questionId)),
    // Include private properties at runtime to exercise response allowlisting.
    getPublicOptions: questionId =>
      this.options
        .filter(option => option.questionId === questionId)
        .sort((a, b) => a.label.localeCompare(b.label)),
    findOption: (questionId, optionId) =>
      this.options.find(
        option =>
          option.questionId === questionId && option.optionId === optionId,
      ),
    getCorrectOption: questionId =>
      this.options.find(
        option => option.questionId === questionId && option.isCorrect,
      ),
  };

  answers: AnswerRep = {
    hasSolved: (userId, questionId) =>
      this.attempts.some(
        attempt =>
          attempt.userId === userId &&
          attempt.questionId === questionId &&
          attempt.correct,
      ),
    record: (userId, questionId, optionId, correct) => {
      if (!this.content.findOption(questionId, optionId)) {
        throw new Error('foreign option');
      }
      if (correct && this.answers.hasSolved(userId, questionId)) {
        throw new Error('duplicate correct attempt');
      }
      this.attempts.push({userId, questionId, optionId, correct});
    },
  };

  transaction<T>(work: () => T): T {
    const previous = [...this.attempts];
    try {
      return work();
    } catch (error) {
      this.attempts = previous;
      throw error;
    }
  }
}

describe('QuestionManager using Data Writer', () => {
  let writer: FakeDataWriter;
  let onAnswer: Mock<AnswerProgress['onAnswer']>;
  let manager: QuestionManager;

  beforeEach(() => {
    writer = new FakeDataWriter();
    onAnswer = vi.fn();
    manager = new QuestionManager(writer, {onAnswer});
  });

  it('does not require readings to ask questions', () => {
    writer.readings = [];
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(1);
  });

  it('uses the Data Writer next-unsolved operation and its question ID order', () => {
    const next = vi.spyOn(writer.content, 'nextUnsolvedQuestion');
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(1);
    expect(next).toHaveBeenCalledWith(1, 1);
    manager.submit(1, 1, 11);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(2);
    manager.submit(1, 2, 21);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(3);
  });

  it("skips only this user's correct attempts", () => {
    writer.attempts.push(
      {userId: 1, questionId: 1, optionId: 12, correct: false},
      {userId: 2, questionId: 1, optionId: 11, correct: true},
    );
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(1);
    manager.submit(1, 1, 11);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(2);
  });

  it('returns null after all questions are completed', () => {
    [1, 2, 3].forEach(questionId =>
      manager.submit(1, questionId, questionId * 10 + 1),
    );
    expect(manager.nextQuestion(1, 1)).toBeNull();
  });

  it('returns empty content for an existing planet without readings or questions', () => {
    expect(manager.getPlanet(1, 2).tasks).toEqual([]);
    expect(manager.nextQuestion(1, 2)).toBeNull();
  });

  it('serializes only allowed fields, even if Data Writer objects have extra answer keys', () => {
    Object.assign(writer.questions[2], {answerKey: 'secret', correct: true});
    Object.assign(writer.readings[0], {correctAnswer: 'secret'});
    Object.assign(
      writer.options[4],
      JSON.parse('{"is_correct":1,"correctAnswer":"secret"}'),
    );
    const question = manager.nextQuestion(1, 1);
    expect(question).toEqual({
      questionId: 1,
      prompt: 'Slope?',
      graph: {fn: '2*x+1'},
      type: 'mcq',
      options: [
        {optionId: 11, label: 'a', text: '2'},
        {optionId: 12, label: 'b', text: '3'},
      ],
    });
    expect(
      JSON.stringify({
        question,
        planet: manager.getPlanet(1, 1),
      }),
    ).not.toMatch(/is_correct|isCorrect|correctAnswer|answerKey|"correct"/);
  });

  it('omits a null graph', () => {
    manager.submit(1, 1, 11);
    expect(manager.nextQuestion(1, 1)).not.toHaveProperty('graph');
  });

  it.each(['not json', '[1,2]', '"text"', 'null'])(
    'rejects a stored graph that is not a JSON object: %s',
    graph => {
      writer.questions[2].graph = graph;
      expect(() => manager.nextQuestion(1, 1)).toThrow(
        expect.objectContaining({code: 'INVALID_CONTENT'}),
      );
      expect(() => manager.getPlanet(1, 1)).toThrow(
        expect.objectContaining({code: 'INVALID_CONTENT'}),
      );
    },
  );

  it('returns a planet with ordered readings, then questions with options', () => {
    expect(manager.getPlanet(1, 1)).toEqual({
      planetId: 1,
      name: 'Planet 1',
      introText: 'Welcome',
      graphOrder: 1,
      tasks: [
        {type: 'Reading', text: 'Lines'},
        {type: 'Reading', text: 'Quadratics'},
        ...[1, 2, 3].map(questionId => ({
          type: 'Question',
          question: expect.objectContaining({
            questionId,
            type: 'mcq',
            options: [
              {optionId: questionId * 10 + 1, label: 'a', text: '2'},
              {optionId: questionId * 10 + 2, label: 'b', text: '3'},
            ],
          }),
          // solved: false,
        })),
      ],
    });
  });

  // it("marks only this user's correctly answered questions as solved", () => {
  //   manager.submit(1, 1, 12);
  //   manager.submit(1, 2, 21);
  //   manager.submit(2, 3, 31);
  //   const solved = (userId: number) =>
  //     manager
  //       .getPlanet(userId, 1)
  //       .tasks.flatMap(task => (task.type === 'Question' ? [task.solved] : []));
  //   expect(solved(1)).toEqual([false, true, false]);
  //   expect(solved(2)).toEqual([false, false, true]);
  // });

  it('skips non-MCQ questions when loading a planet', () => {
    writer.questions[2].qtype = 'free_response';
    const ids = manager
      .getPlanet(1, 1)
      .tasks.flatMap(task =>
        task.type === 'Question' ? [task.question.questionId] : [],
      );
    expect(ids).toEqual([2, 3]);
  });

  it('returns an existing planet without readings or questions', () => {
    expect(manager.getPlanet(1, 2).tasks).toEqual([]);
  });

  it('records the selected option and sends a first-correct event inside the transaction', () => {
    const transaction = vi.spyOn(writer, 'transaction');
    expect(manager.submit(1, 1, 11)).toEqual({
      questionId: 1,
      correct: true,
      correctOption: {optionId: 11, label: 'a', text: '2'},
    });
    expect(writer.attempts).toEqual([
      {userId: 1, questionId: 1, optionId: 11, correct: true},
    ]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith({
      userId: 1,
      questionId: 1,
      planetId: 1,
    });
  });

  it('records wrong attempts, reveals feedback, and allows retrying', () => {
    expect(manager.submit(1, 1, 12)).toMatchObject({
      correct: false,
      correctOption: {optionId: 11},
    });
    expect(writer.attempts[0]).toMatchObject({optionId: 12, correct: false});
    expect(onAnswer).not.toHaveBeenCalled();
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(1);
    manager.submit(1, 1, 11);
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it.each([21, 999])(
    'rejects foreign or nonexistent option %i without a write',
    optionId => {
      expect(() => manager.submit(1, 1, optionId)).toThrow(
        expect.objectContaining({code: 'INVALID_INPUT'}),
      );
      expect(writer.attempts).toEqual([]);
      expect(onAnswer).not.toHaveBeenCalled();
    },
  );

  it('returns feedback for repeated correct submissions without duplicate writes or progress', () => {
    manager.submit(1, 1, 11);
    expect(
      new QuestionManager(writer, {onAnswer}).submit(1, 1, 11).correct,
    ).toBe(true);
    manager.submit(1, 1, 12);
    manager.submit(1, 1, 11);
    expect(writer.attempts).toHaveLength(2);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(2);
    manager.submit(2, 1, 11);
    expect(onAnswer).toHaveBeenCalledTimes(2);
  });

  it('still validates the option on a completed question', () => {
    manager.submit(1, 1, 11);
    expect(() => manager.submit(1, 1, 21)).toThrow(
      expect.objectContaining({code: 'INVALID_INPUT'}),
    );
    expect(writer.attempts).toHaveLength(1);
  });

  it('rejects nonexistent questions and planets', () => {
    expect(() => manager.submit(1, 999, 11)).toThrow(
      expect.objectContaining({code: 'NOT_FOUND'}),
    );
    expect(() => manager.nextQuestion(1, 999)).toThrow(
      expect.objectContaining({code: 'NOT_FOUND'}),
    );
    expect(() => manager.getPlanet(1, 999)).toThrow(
      expect.objectContaining({code: 'NOT_FOUND'}),
    );
    expect(writer.attempts).toEqual([]);
  });

  // Options belonging to another question, duplicate option IDs and a second
  // correct option are ruled out by the queries and the schema, so they are
  // covered by the integration and data-writer tests rather than here.
  it.each([
    'no correct option',
    'too few options',
    'too many options',
    'unsupported type',
  ])('rejects malformed authored content: %s', scenario => {
    if (scenario === 'no correct option') writer.options[4].isCorrect = false;
    if (scenario === 'too few options') writer.options = [writer.options[4]];
    if (scenario === 'too many options') {
      writer.options.push(
        ...[13, 14, 15].map(optionId => ({...writer.options[5], optionId})),
      );
    }
    if (scenario === 'unsupported type') {
      writer.questions[2].qtype = 'free_response';
    }
    expect(() => manager.submit(1, 1, 11)).toThrow(
      expect.objectContaining({code: 'INVALID_CONTENT'}),
    );
    expect(() => manager.nextQuestion(1, 1)).toThrow(
      expect.objectContaining({code: 'INVALID_CONTENT'}),
    );
    expect(writer.attempts).toEqual([]);
  });

  it('wraps dependency read failures and preserves their internal cause', () => {
    const cause = new Error('database unavailable');
    vi.spyOn(writer.content, 'getPlanet').mockImplementation(() => {
      throw cause;
    });
    expect(() => manager.getPlanet(1, 1)).toThrow(
      expect.objectContaining({code: 'STORAGE_ERROR', cause}),
    );
    expect(() => manager.nextQuestion(1, 1)).toThrow(QuestionManagerError);
  });

  it('rolls back a failed answer write and does not notify progress', () => {
    vi.spyOn(writer.answers, 'record').mockImplementation(() => {
      writer.attempts.push({
        userId: 1,
        questionId: 1,
        optionId: 11,
        correct: true,
      });
      throw new Error('write failed');
    });
    expect(() => manager.submit(1, 1, 11)).toThrow(
      expect.objectContaining({code: 'STORAGE_ERROR'}),
    );
    expect(writer.attempts).toEqual([]);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('rolls back progress-handler failures so a retry can deliver the event', () => {
    onAnswer.mockImplementationOnce(() => {
      throw new Error('progress unavailable');
    });
    expect(() => manager.submit(1, 1, 11)).toThrow(
      expect.objectContaining({code: 'PROGRESS_UPDATE_FAILED'}),
    );
    expect(writer.attempts).toEqual([]);
    manager.submit(1, 1, 11);
    expect(writer.attempts).toHaveLength(1);
    expect(onAnswer).toHaveBeenCalledTimes(2);
  });

  it('wraps failures to start a transaction', () => {
    vi.spyOn(writer, 'transaction').mockImplementation(() => {
      throw new Error('transaction failed');
    });
    expect(() => manager.submit(1, 1, 11)).toThrow(
      expect.objectContaining({code: 'STORAGE_ERROR'}),
    );
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
