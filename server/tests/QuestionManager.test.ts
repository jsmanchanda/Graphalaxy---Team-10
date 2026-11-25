import {beforeEach, describe, expect, it, vi, type Mock} from 'vitest';
import {
  QuestionManager,
  QuestionManagerError,
  type Shuffle,
} from '../src/question-manager/QuestionManager';
import lodashShuffle from 'lodash/shuffle';
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
    countQuestions: planetId =>
      this.content
        .getQuestions(planetId)
        .filter(question => question.qtype === 'mcq').length,
    getQuestion: questionId =>
      this.questions.find(question => question.questionId === questionId),
    getQuestions: planetId =>
      this.questions
        .filter(question => question.planetId === planetId)
        .sort((a, b) => a.questionId - b.questionId),
    nextUnansweredQuestion: (userId, planetId) =>
      this.content
        .getQuestions(planetId)
        .find(
          question =>
            question.qtype === 'mcq' &&
            !this.attempts.some(
              attempt =>
                attempt.userId === userId &&
                attempt.questionId === question.questionId,
            ),
        ),
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
    hasAnswered: (userId, questionId) =>
      this.attempts.some(
        attempt =>
          attempt.userId === userId && attempt.questionId === questionId,
      ),
    clearForPlanet: (userId, planetId) => {
      const kept = this.attempts.filter(
        attempt =>
          attempt.userId !== userId ||
          this.content.getQuestion(attempt.questionId)?.planetId !== planetId,
      );
      const cleared = this.attempts.length - kept.length;
      this.attempts = kept;
      return cleared;
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

  it('serves questions in question ID order when not shuffled', () => {
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(1);
    manager.submit(1, 1, 11);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(2);
    manager.submit(1, 2, 21);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(3);
  });

  it("skips the questions this user has answered, right or wrong, and no one else's", () => {
    writer.attempts.push({
      userId: 2,
      questionId: 1,
      optionId: 11,
      correct: true,
    });
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(1);
    manager.submit(1, 1, 12);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(2);
    manager.submit(1, 2, 21);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(3);
  });

  it('returns null after all questions are completed', () => {
    [1, 2, 3].forEach(questionId =>
      manager.submit(1, questionId, questionId * 10 + 1),
    );
    expect(manager.nextQuestion(1, 1)).toBeNull();
  });

  it('returns null after every question is answered, even when some answers were wrong', () => {
    manager.submit(1, 1, 12);
    manager.submit(1, 2, 21);
    manager.submit(1, 3, 32);
    expect(manager.nextQuestion(1, 1)).toBeNull();
    expect(onAnswer).toHaveBeenCalledTimes(1);
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
    },
  );

  it('returns a planet with its ordered readings and none of its questions', () => {
    expect(manager.getPlanet(1, 1)).toEqual({
      planetId: 1,
      name: 'Planet 1',
      introText: 'Welcome',
      graphOrder: 1,
      tasks: [
        {type: 'Reading', text: 'Lines'},
        {type: 'Reading', text: 'Quadratics'},
      ],
    });
  });

  it('serves the questions left out of the planet one at a time, in question ID order', () => {
    const served: number[] = [];
    for (
      let question = manager.nextQuestion(1, 1);
      question;
      question = manager.nextQuestion(1, 1)
    ) {
      served.push(question.questionId);
      manager.submit(1, question.questionId, question.questionId * 10 + 1);
    }
    expect(served).toEqual([1, 2, 3]);
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

  it('loads a planet without reading its questions, even malformed ones', () => {
    writer.questions[2].qtype = 'free_response';
    writer.questions[1].graph = 'not json';
    const getQuestions = vi.spyOn(writer.content, 'getQuestions');
    expect(manager.getPlanet(1, 1).tasks).toHaveLength(2);
    expect(getQuestions).not.toHaveBeenCalled();
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

  it('records wrong attempts, reveals feedback, and moves on to the next question', () => {
    expect(manager.submit(1, 1, 12)).toMatchObject({
      correct: false,
      correctOption: {optionId: 11},
    });
    expect(writer.attempts[0]).toMatchObject({optionId: 12, correct: false});
    expect(onAnswer).not.toHaveBeenCalled();
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(2);
  });

  it('rejects a second answer, so a wrong answer cannot be turned into a correct one', () => {
    manager.submit(1, 1, 12);
    expect(() => manager.submit(1, 1, 11)).toThrow(
      expect.objectContaining({code: 'ALREADY_ANSWERED'}),
    );
    expect(writer.attempts).toHaveLength(1);
    expect(onAnswer).not.toHaveBeenCalled();
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(2);
  });

  it('accepts an answer again once the attempts on the planet are cleared', () => {
    manager.submit(1, 1, 12);
    writer.answers.clearForPlanet(1, 1);
    expect(manager.submit(1, 1, 11).correct).toBe(true);
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

  it('rejects repeated submissions without duplicate writes or progress, per user', () => {
    manager.submit(1, 1, 11);
    for (const optionId of [11, 12]) {
      expect(() =>
        new QuestionManager(writer, {onAnswer}).submit(1, 1, optionId),
      ).toThrow(expect.objectContaining({code: 'ALREADY_ANSWERED'}));
    }
    expect(writer.attempts).toHaveLength(1);
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
  it('never asks a question that is not multiple choice, and rejects answers to it', () => {
    writer.questions[2].qtype = 'free_response';
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(2);
    expect(() => manager.submit(1, 1, 11)).toThrow(
      expect.objectContaining({code: 'INVALID_CONTENT'}),
    );
    manager.submit(1, 2, 21);
    manager.submit(1, 3, 31);
    expect(manager.nextQuestion(1, 1)).toBeNull();
    expect(writer.content.countQuestions(1)).toBe(2);
  });

  it.each(['no correct option', 'too few options', 'too many options'])(
    'rejects malformed authored content: %s',
    scenario => {
      if (scenario === 'no correct option') writer.options[4].isCorrect = false;
      if (scenario === 'too few options') writer.options = [writer.options[4]];
      if (scenario === 'too many options') {
        writer.options.push(
          ...[13, 14, 15].map(optionId => ({...writer.options[5], optionId})),
        );
      }
      expect(() => manager.submit(1, 1, 11)).toThrow(
        expect.objectContaining({code: 'INVALID_CONTENT'}),
      );
      expect(() => manager.nextQuestion(1, 1)).toThrow(
        expect.objectContaining({code: 'INVALID_CONTENT'}),
      );
      expect(writer.attempts).toEqual([]);
    },
  );

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

describe('QuestionManager random question order', () => {
  /** A known order that is not question ID order. */
  const reverseOrder: Shuffle = items => [...items].reverse();

  /** Reverses, and records each list it was given. */
  const recordingShuffle = () => {
    const calls: unknown[][] = [];
    const shuffle: Shuffle = items => {
      calls.push([...items]);
      return reverseOrder(items);
    };
    return {shuffle, calls};
  };
  /** Answers every question left (correctly) and returns the IDs served. */
  const playThrough = (manager: QuestionManager, userId = 1): number[] => {
    const served: number[] = [];
    for (
      let question = manager.nextQuestion(userId, 1);
      question;
      question = manager.nextQuestion(userId, 1)
    ) {
      served.push(question.questionId);
      manager.submit(userId, question.questionId, question.questionId * 10 + 1);
    }
    return served;
  };

  /** The next question for user 1 on planet 1, which must exist. */
  const requireNext = (manager: QuestionManager) => {
    const question = manager.nextQuestion(1, 1);
    if (!question) throw new Error('Expected a question');
    return question;
  };

  /** Loads a QuestionManager with lodash's shuffle by default */
  const newManager = (
    writer = new FakeDataWriter(),
    shuffle: Shuffle = lodashShuffle,
  ) => new QuestionManager(writer, {onAnswer: vi.fn()}, shuffle);

  it('asks questions in the order the shuffle gives, options too', () => {
    const manager = newManager(new FakeDataWriter(), reverseOrder);
    const first = requireNext(manager);
    expect(first.questionId).toBe(3);
    expect(first.options.map(option => option.label)).toEqual(['b', 'a']);
    manager.submit(1, 3, 31);
    expect(playThrough(manager)).toEqual([2, 1]);
  });

  it('asks every question exactly once per attempt, in a random order', () => {
    const orders = new Set<string>();
    for (let run = 0; run < 20; run++) {
      const served = playThrough(newManager());
      expect([...served].sort()).toEqual([1, 2, 3]);
      orders.add(served.join());
    }
    // 3 questions have 6 orders; 20 random runs all matching is ~1 in 10^15.
    expect(orders.size).toBeGreaterThan(1);
  });

  it('returns the same question and option order when asked again before answering', () => {
    const {shuffle, calls} = recordingShuffle();
    const manager = newManager(new FakeDataWriter(), shuffle);
    const first = manager.nextQuestion(1, 1);
    const count = calls.length;
    expect(manager.nextQuestion(1, 1)).toEqual(first);
    expect(calls).toHaveLength(count);
  });

  it('shuffles the options and still grades by option ID, not position', () => {
    // reverseOrder puts the correct option (label a) last.
    const manager = newManager(new FakeDataWriter(), reverseOrder);
    const question = requireNext(manager);
    const correctId = question.questionId * 10 + 1;
    expect(question.options.at(-1)?.optionId).toBe(correctId);
    expect(manager.submit(1, question.questionId, correctId)).toMatchObject({
      correct: true,
      correctOption: {optionId: correctId, label: 'a'},
    });
  });

  it('shuffles again with all questions after the planet is reset', () => {
    const writer = new FakeDataWriter();
    const {shuffle, calls} = recordingShuffle();
    const manager = newManager(writer, shuffle);
    playThrough(manager);
    writer.answers.clearForPlanet(1, 1);
    manager.newAttempt(1, 1);
    calls.length = 0;
    expect(playThrough(manager)).toEqual([3, 2, 1]);
    expect(calls).toContainEqual([1, 2, 3]);
  });

  it("keeps each player's order separate", () => {
    const manager = newManager();
    const first = manager.nextQuestion(1, 1);
    playThrough(manager, 2);
    expect(manager.nextQuestion(1, 1)).toEqual(first);
  });

  it('includes a question added to the planet during an attempt', () => {
    const writer = new FakeDataWriter();
    const manager = newManager(writer);
    const first = requireNext(manager);
    manager.submit(1, first.questionId, first.questionId * 10 + 1);
    writer.questions.push({
      questionId: 4,
      planetId: 1,
      prompt: 'New?',
      graph: null,
      qtype: 'mcq',
    });
    writer.options.push(
      {questionId: 4, optionId: 41, label: 'a', text: '1', isCorrect: true},
      {questionId: 4, optionId: 42, label: 'b', text: '2', isCorrect: false},
    );
    const rest = playThrough(manager);
    expect([first.questionId, ...rest].sort()).toEqual([1, 2, 3, 4]);
  });
});
