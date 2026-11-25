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

/** A variant to not shuffle. */
const keepOrder: Shuffle = items => [...items];

/** One attempt at a planet: its question order and the question on screen. */
interface Attempt {
  /** Question IDs in the order they are asked. */
  order: number[];
  /** The last question served, with its options already shuffled. */
  current?: Question;
}

/** The key for a player's attempt at a planet. */
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
   * Injects the Data Writer, a synchronous Progress Manager handler, and the
   * function that shuffles questions and options. The server passes lodash's
   * shuffle.
   */
  constructor(
    private readonly dataWriter: Pick<
      DataWriter,
      'content' | 'answers' | 'transaction'
    >,
    private readonly progress: AnswerProgress,
    private readonly shuffle: Shuffle = keepOrder,
  ) {}

  /**
   * Each player's current attempt at each planet, by attemptKey(). Kept in
   * memory: after a restart, the questions left get a new order.
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
   * Returns the next multiple-choice question on the planet that this user
   * has not answered yet, or null once they have answered every one. A wrong
   * answer counts: each question is asked once per attempt, and the player
   * moves on. Questions of other types are never asked.
   *
   * Each attempt at a planet has its own shuffled question order and answer options.
   * Call newAttempt() when the planet is reset to get a new order.
   */
  nextQuestion(userId: number, planetId: number): Question | null {
    return this.withStorageError('Unable to load the next question.', () => {
      this.requirePlanet(planetId);
      const unanswered = this.unansweredQuestions(userId, planetId);
      if (unanswered.length === 0) return null;

      const attempt = this.attemptFor(userId, planetId, unanswered);
      const next = this.firstInOrder(unanswered, attempt.order);

      if (attempt.current?.questionId !== next.questionId) {
        attempt.current = this.toQuestion(next);
      }
      return attempt.current;
    });
  }

  /**
   * Starts a new attempt: forgets this player's question order on the
   * planet, so the next question gets a new shuffle. Call it on reset.
   */
  newAttempt(userId: number, planetId: number): void {
    this.attempts.delete(attemptKey(userId, planetId));
  }

  /**
   * The planet's multiple-choice questions that this player has not
   * answered yet, right or wrong.
   */
  private unansweredQuestions(
    userId: number,
    planetId: number,
  ): StoredQuestion[] {
    const questions = this.dataWriter.content.getQuestions(planetId);
    return questions.filter(question => {
      const isMultipleChoice = question.qtype === 'mcq';
      const isAnswered = this.dataWriter.answers.hasAnswered(
        userId,
        question.questionId,
      );
      return isMultipleChoice && !isAnswered;
    });
  }

  /**
   * This player's current attempt at the planet. Its order is reused unless
   * it is missing one of the unanswered questions: then this is a new
   * attempt, the server restarted, or a question was added, and the
   * questions are shuffled again.
   */
  private attemptFor(
    userId: number,
    planetId: number,
    unanswered: StoredQuestion[],
  ): Attempt {
    const key = attemptKey(userId, planetId);
    const ids = unanswered.map(question => question.questionId);
    const saved = this.attempts.get(key);
    if (saved && ids.every(id => saved.order.includes(id))) {
      return saved;
    }
    const attempt: Attempt = {order: this.shuffle(ids)};
    this.attempts.set(key, attempt);
    return attempt;
  }

  /**
   * The question that comes first in the attempt's order. Every question
   * passed in must be in the order, which attemptFor() makes sure of.
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
