import type {
  AnswerOption,
  AnswerResult,
  GraphSpec,
  Lesson,
  Planet,
  Question,
  QuestionTask,
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

/**
 * Loads lesson content and grades MCQs through the Data Writer boundary.
 *
 * IDs are expected to be positive integers already: the HTTP layer parses them
 * once, so this class does not check them again.
 */
export class QuestionManager {
  /** Injects the Data Writer and a synchronous Progress Manager handler. */
  constructor(
    private readonly dataWriter: Pick<
      DataWriter,
      'content' | 'answers' | 'transaction'
    >,
    private readonly progress: AnswerProgress,
  ) {}

  /**
   * Maps readings to legacy lesson pages, in reading-number order.
   * Questions belong to planets, so these pages contain reading tasks only.
   */
  getLessons(planetId: number): Lesson[] {
    return this.withStorageError('Unable to load lessons.', () => {
      this.requirePlanet(planetId);
      return this.dataWriter.content.getReadings(planetId).map(reading => ({
        lessonId: reading.readingId,
        lessonNumber: reading.readingNumber,
        lessonName: `Reading ${reading.readingNumber}`,
        tasks: [{type: 'Reading', text: reading.text}],
      }));
    });
  }

  /**
   * Returns a planet as the client displays it: its readings, then its
   * questions with whether this user has solved each one. Answer keys are not
   * included; the client finds out through submit().
   */
  getPlanet(userId: number, planetId: number): Planet {
    return this.withStorageError('Unable to load the planet.', () => {
      const planet = this.requirePlanet(planetId);
      const readings: ReadingTask[] = this.dataWriter.content
        .getReadings(planetId)
        .map(reading => ({type: 'Reading', text: reading.text}));
      const questions: QuestionTask[] = this.dataWriter.content
        .getQuestions(planetId)
        .filter(question => question.qtype === 'mcq')
        .map(question => ({
          type: 'Question',
          question: this.toQuestion(question),
          solved: this.dataWriter.answers.hasSolved(
            userId,
            question.questionId,
          ),
        }));
      return {
        planetId: planet.planetId,
        name: planet.name,
        introText: planet.introText,
        graphOrder: planet.graphOrder,
        tasks: [...readings, ...questions],
      };
    });
  }

  /** Returns the first question without a correct attempt, or null if complete. */
  nextQuestion(userId: number, planetId: number): Question | null {
    return this.withStorageError('Unable to load the next question.', () => {
      this.requirePlanet(planetId);
      const question = this.dataWriter.content.nextUnsolvedQuestion(
        userId,
        planetId,
      );
      return question ? this.toQuestion(question) : null;
    });
  }

  /** Records a valid attempt and notifies progress once, in one transaction. */
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
        const completed = this.dataWriter.answers.hasSolved(userId, questionId);
        // The schema allows only one correct row per user/question.
        // Keep recording wrong attempts, including those after completion.
        if (!selected.isCorrect || !completed) {
          this.dataWriter.answers.record(
            userId,
            questionId,
            optionId,
            selected.isCorrect,
          );
        }
        if (selected.isCorrect && !completed) {
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
      options: this.validOptions(question).options.map(option =>
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
