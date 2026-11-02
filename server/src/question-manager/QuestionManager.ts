import type {
  AnswerOption,
  AnswerResult,
  Lesson,
  Question,
} from '@graphalaxy/shared';
import type {AnswerProgress} from './AnswerProgress';
import type {
  DataWriter,
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

/** Loads lesson content and grades MCQs through the Data Writer boundary. */
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
   * Maps readings to legacy lesson pages, ordered by reading number then ID.
   * Questions belong to planets, so these pages contain reading tasks only.
   */
  getLessons(planetId: number): Lesson[] {
    this.validateId(planetId, 'planetId');
    return this.withStorageError('Unable to load lessons.', () => {
      this.requirePlanet(planetId);
      return this.dataWriter.content
        .getReadings(planetId)
        .sort(
          (a, b) =>
            a.readingNumber - b.readingNumber || a.readingId - b.readingId,
        )
        .map(reading => ({
          lessonId: reading.readingId,
          lessonNumber: reading.readingNumber,
          lessonName: `Reading ${reading.readingNumber}`,
          tasks: [{type: 'Reading', text: reading.text}],
        }));
    });
  }

  /** Returns the first question without a correct attempt, or null if complete. */
  nextQuestion(userId: number, planetId: number): Question | null {
    this.validateId(userId, 'userId');
    this.validateId(planetId, 'planetId');
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
    this.validateId(userId, 'userId');
    this.validateId(questionId, 'questionId');
    this.validateId(optionId, 'optionId');
    return this.withStorageError('Unable to submit the answer.', () =>
      this.dataWriter.transaction(() => {
        const question = this.dataWriter.content.getQuestion(questionId);
        if (!question) {
          throw new QuestionManagerError(
            'NOT_FOUND',
            `Question ${questionId} does not exist.`,
          );
        }
        const {options, correctOption} = this.validOptions(question);
        const selected = this.dataWriter.content.findOption(
          questionId,
          optionId,
        );
        if (
          !selected ||
          selected.questionId !== questionId ||
          selected.optionId !== optionId ||
          !options.some(option => option.optionId === optionId)
        ) {
          throw new QuestionManagerError(
            'INVALID_INPUT',
            'The selected option does not belong to this question.',
          );
        }
        if (
          selected.isCorrect !==
          (selected.optionId === correctOption.optionId)
        ) {
          throw new QuestionManagerError(
            'INVALID_CONTENT',
            'Question answer options have inconsistent correctness.',
          );
        }
        const completed = this.dataWriter.answers.hasSolved(userId, questionId);
        const firstCorrect = selected.isCorrect && !completed;
        // The official schema allows only one correct row per user/question.
        // Keep recording wrong attempts, including those after completion.
        if (!selected.isCorrect || !completed) {
          this.dataWriter.answers.record(
            userId,
            questionId,
            optionId,
            selected.isCorrect,
          );
        }
        if (firstCorrect) {
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
    if (
      options.length < 2 ||
      options.length > 4 ||
      options.some(option => option.questionId !== question.questionId) ||
      new Set(options.map(option => option.optionId)).size !== options.length ||
      !correctOption ||
      !correctOption.isCorrect ||
      correctOption.questionId !== question.questionId ||
      !options.some(option => option.optionId === correctOption.optionId)
    ) {
      throw new QuestionManagerError(
        'INVALID_CONTENT',
        `Question ${question.questionId} must have two to four options and one correct option.`,
      );
    }
    // The official schema enforces at most one correct option per question.
    return {options, correctOption};
  }

  private toQuestion(question: StoredQuestion): Question {
    return {
      questionId: question.questionId,
      prompt: question.prompt,
      ...(question.graph === null ? {} : {graph: question.graph}),
      type: 'mcq',
      options: this.validOptions(question).options.map(option =>
        this.toOption(option),
      ),
    };
  }

  private toOption(option: PublicOption): AnswerOption {
    return {optionId: option.optionId, label: option.label, text: option.text};
  }

  private requirePlanet(planetId: number): void {
    if (!this.dataWriter.content.getPlanet(planetId)) {
      throw new QuestionManagerError(
        'NOT_FOUND',
        `Planet ${planetId} does not exist.`,
      );
    }
  }

  private validateId(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new QuestionManagerError(
        'INVALID_INPUT',
        `${name} must be a positive safe integer.`,
      );
    }
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
