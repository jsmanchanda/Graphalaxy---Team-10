import type {
  AnswerOption,
  AnswerResult,
  GraphSpec,
  Planet,
  Question,
  ReadingTask,
} from '@graphalaxy/shared';
import type {AnswerProgress} from './AnswerProgress';
import type {
  DataWriter,
  Planet as StoredPlanet,
  PrivateOption,
  PublicOption,
  Question as StoredQuestion,
} from '../data-writer';

/** Stable error codes for the API Manager's HTTP error mapping. */
export type QuestionErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'ALREADY_ANSWERED'
  | 'INVALID_CONTENT'
  | 'STORAGE_ERROR'
  | 'PROGRESS_UPDATE_FAILED';

/** A domain or dependency error; API responses should omit the internal cause. */
export class QuestionManagerError extends Error {
  /** Preserves a dependency failure for server-side diagnostics. */
  constructor(
    readonly code: QuestionErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'QuestionManagerError';
  }
}

/** Returns a shuffled copy of a list. */
export type Shuffle = <T>(items: readonly T[]) => T[];

/** Keeps the original order. QuestionManager uses it unless told otherwise. */
const keepOrder: Shuffle = items => [...items];

/** A player's attempt at a planet. */
interface Attempt {
  /** The question IDs, in the order the player gets them. */
  order: number[];
  /** The question the player sees now, with its options already shuffled. */
  current?: Question;
}

/** Builds the key that stores a player's attempt at a planet. */
function attemptKey(userId: number, planetId: number): string {
  return `${userId}:${planetId}`;
}

/**
 * Loads lesson content and grades MCQs through the Data Writer boundary.
 *
 * IDs are expected to be positive integers already: the HTTP layer parses them
 * once, so this class does not check them again.
 */
export class QuestionManager {
  /**
   * Creates the manager. Only the server turns on shuffling and the
   * per-attempt limit; tests usually leave both at their defaults.
   * @param dataWriter reads questions and saves answers
   * @param progress gets told about each first correct answer
   * @param shuffle shuffles questions and options; the server passes
   * lodash's shuffle, and the default keeps the original order
   * @param questionsPerAttempt how many questions an attempt asks; the server
   * passes 5, and the default asks every question
   */
  constructor(
    private readonly dataWriter: Pick<
      DataWriter,
      'content' | 'answers' | 'transaction'
    >,
    private readonly progress: AnswerProgress,
    private readonly shuffle: Shuffle = keepOrder,
    private readonly questionsPerAttempt = Infinity,
  ) {}

  /**
   * Stores each player's current attempt at each planet, in memory. After a
   * restart, the player gets the questions they have left in a new order.
   */
  private readonly attempts = new Map<string, Attempt>();

  /**
   * Returns a planet's lesson as the client displays it: its readings in
   * order. Questions are not included; the client loads them one at a time
   * through nextQuestion().
   */
  getPlanet(userId: number, planetId: number): Planet {
    return this.withStorageError('Unable to load the planet.', () => {
      const planet = this.requirePlanet(planetId);
      const readings: ReadingTask[] = this.dataWriter.content
        .getReadings(planetId)
        .map(reading => ({type: 'Reading', text: reading.text}));
      return {
        planetId: planet.planetId,
        name: planet.name,
        introText: planet.introText,
        graphOrder: planet.graphOrder,
        tasks: readings,
      };
    });
  }

  /**
   * Returns the player's next question on the planet, or null when the
   * attempt is over. An attempt is over when the player has answered
   * questionsPerAttempt questions, or every question. A wrong answer still
   * counts as answered, so the player moves on.
   *
   * Each attempt shuffles the question order and each question's options.
   * Asking again before answering returns the same question, with its options
   * in the same order. Call newAttempt() when the player redoes the planet.
   */
  nextQuestion(userId: number, planetId: number): Question | null {
    return this.withStorageError('Unable to load the next question.', () => {
      this.requirePlanet(planetId);
      const unanswered = this.unansweredQuestions(userId, planetId);
      const noQuestionsLeft = unanswered.length === 0;
      if (noQuestionsLeft || this.attemptIsOver(userId, planetId)) {
        // Free the memory the finished attempt used.
        this.attempts.delete(attemptKey(userId, planetId));
        return null;
      }

      const attempt = this.attemptFor(userId, planetId, unanswered);
      const next = this.firstInOrder(unanswered, attempt.order);

      // Build each question once, so its options keep the same order.
      if (attempt.current?.questionId !== next.questionId) {
        attempt.current = this.toQuestion(next);
      }
      return attempt.current;
    });
  }

  /**
   * Starts a new attempt: forgets the player's question order on the planet,
   * so the next question comes from a new shuffle. Call it on a reset.
   */
  newAttempt(userId: number, planetId: number): void {
    this.attempts.delete(attemptKey(userId, planetId));
  }

  /** Lists the planet's multiple-choice questions. Other types are skipped. */
  private multipleChoiceQuestions(planetId: number): StoredQuestion[] {
    return this.dataWriter.content
      .getQuestions(planetId)
      .filter(question => question.qtype === 'mcq');
  }

  /** Lists the planet's questions that the player has not answered yet. */
  private unansweredQuestions(
    userId: number,
    planetId: number,
  ): StoredQuestion[] {
    return this.multipleChoiceQuestions(planetId).filter(
      question =>
        !this.dataWriter.answers.hasAnswered(userId, question.questionId),
    );
  }

  /**
   * Checks whether the player has answered as many questions on the planet
   * as an attempt asks. A reset deletes the planet's answers, so every answer
   * counted here belongs to the current attempt.
   */
  private attemptIsOver(userId: number, planetId: number): boolean {
    const questionCount = this.multipleChoiceQuestions(planetId).length;
    const unansweredCount = this.unansweredQuestions(userId, planetId).length;
    const answeredCount = questionCount - unansweredCount;
    return answeredCount >= this.questionsPerAttempt;
  }

  /**
   * Returns the player's current attempt at the planet, or starts a new one.
   * It starts a new one, with a new shuffle, when there is none or when its
   * order is missing an unanswered question. That happens after a server
   * restart, or when someone adds a question to the planet.
   */
  private attemptFor(
    userId: number,
    planetId: number,
    unanswered: StoredQuestion[],
  ): Attempt {
    const key = attemptKey(userId, planetId);
    const ids = unanswered.map(question => question.questionId);
    const saved = this.attempts.get(key);
    const savedHasEveryQuestion =
      saved !== undefined && ids.every(id => saved.order.includes(id));
    if (saved && savedHasEveryQuestion) {
      return saved;
    }
    const attempt: Attempt = {order: this.shuffle(ids)};
    this.attempts.set(key, attempt);
    return attempt;
  }

  /**
   * Returns the question that comes first in the attempt's order. attemptFor()
   * puts every unanswered question in the order, so one is always found.
   */
  private firstInOrder(
    questions: StoredQuestion[],
    order: number[],
  ): StoredQuestion {
    const position = (question: StoredQuestion) =>
      order.indexOf(question.questionId);
    const [first] = [...questions].sort((a, b) => position(a) - position(b));
    return first;
  }

  /**
   * Records a valid attempt and notifies progress if it is correct, in one
   * transaction. A question can be answered once: a second attempt throws
   * ALREADY_ANSWERED, until the planet is reset.
   */
  submit(userId: number, questionId: number, optionId: number): AnswerResult {
    return this.withStorageError('Unable to submit the answer.', () =>
      this.dataWriter.transaction(() => {
        const question = this.dataWriter.content.getQuestion(questionId);
        if (!question) {
          throw new QuestionManagerError(
            'NOT_FOUND',
            `Question ${questionId} does not exist.`,
          );
        }
        const {correctOption} = this.validOptions(question);
        // findOption only returns an option that belongs to this question.
        const selected = this.dataWriter.content.findOption(
          questionId,
          optionId,
        );
        if (!selected) {
          throw new QuestionManagerError(
            'INVALID_INPUT',
            'The selected option does not belong to this question.',
          );
        }
        // Each question is answered once, so a wrong answer cannot be turned
        // into a correct one by sending another request.
        if (this.dataWriter.answers.hasAnswered(userId, questionId)) {
          throw new QuestionManagerError(
            'ALREADY_ANSWERED',
            `Question ${questionId} has already been answered.`,
          );
        }
        // Stop the player from answering more questions than an attempt asks. e.g., trying to send more answer options when they've already finished answer all questions.
        if (this.attemptIsOver(userId, question.planetId)) {
          throw new QuestionManagerError(
            'ALREADY_ANSWERED',
            'This attempt is over. Redo the planet to answer more questions.',
          );
        }
        this.dataWriter.answers.record(
          userId,
          questionId,
          optionId,
          selected.isCorrect,
        );
        if (selected.isCorrect) {
          try {
            this.progress.onAnswer({
              userId,
              questionId,
              planetId: question.planetId,
            });
          } catch (cause) {
            throw new QuestionManagerError(
              'PROGRESS_UPDATE_FAILED',
              'Unable to update question progress.',
              cause,
            );
          }
        }
        return {
          questionId,
          correct: selected.isCorrect,
          correctOption: this.toOption(correctOption),
        };
      }),
    );
  }

  /**
   * Loads a question's options and its correct option, and checks what the
   * schema cannot: that it is an MCQ with two to four options and one of them
   * is marked correct. The rest (options belong to the question, unique IDs,
   * at most one correct option) is enforced by the queries and the schema.
   */
  private validOptions(question: StoredQuestion): {
    options: PublicOption[];
    correctOption: PrivateOption;
  } {
    if (question.qtype !== 'mcq') {
      throw new QuestionManagerError(
        'INVALID_CONTENT',
        'Only multiple-choice questions are supported.',
      );
    }
    const options = this.dataWriter.content.getPublicOptions(
      question.questionId,
    );
    const correctOption = this.dataWriter.content.getCorrectOption(
      question.questionId,
    );
    if (options.length < 2 || options.length > 4 || !correctOption) {
      throw new QuestionManagerError(
        'INVALID_CONTENT',
        `Question ${question.questionId} must have two to four options and one correct option.`,
      );
    }
    return {options, correctOption};
  }

  private toQuestion(question: StoredQuestion): Question {
    const graph = this.parseGraph(question);
    return {
      questionId: question.questionId,
      prompt: question.prompt,
      ...(graph === undefined ? {} : {graph}),
      type: 'mcq',
      // Answer options shuffled.
      options: this.shuffle(this.validOptions(question).options).map(option =>
        this.toOption(option),
      ),
    };
  }

  /** Parses the stored graph JSON (e.g. {"fn":"2*x+3"}), or undefined if none. */
  private parseGraph(question: StoredQuestion): GraphSpec | undefined {
    if (question.graph === null) return undefined;
    try {
      const graph: unknown = JSON.parse(question.graph);
      if (
        typeof graph === 'object' &&
        graph !== null &&
        !Array.isArray(graph)
      ) {
        return graph as GraphSpec;
      }
    } catch {
      // fall through to the error below
    }
    throw new QuestionManagerError(
      'INVALID_CONTENT',
      `Question ${question.questionId} has an invalid graph.`,
    );
  }

  private toOption(option: PublicOption): AnswerOption {
    return {optionId: option.optionId, label: option.label, text: option.text};
  }

  private requirePlanet(planetId: number): StoredPlanet {
    const planet = this.dataWriter.content.getPlanet(planetId);
    if (!planet) {
      throw new QuestionManagerError(
        'NOT_FOUND',
        `Planet ${planetId} does not exist.`,
      );
    }
    return planet;
  }

  private withStorageError<T>(message: string, work: () => T): T {
    try {
      return work();
    } catch (cause) {
      if (cause instanceof QuestionManagerError) throw cause;
      throw new QuestionManagerError('STORAGE_ERROR', message, cause);
    }
  }
}
