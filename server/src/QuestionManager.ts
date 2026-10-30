import type {
  AnswerOption,
  AnswerResult,
  Lesson,
  Question,
} from '@graphalaxy/shared';
import type {
  AnswerOptionRecord,
  AnswerProgress,
  QuestionRecord,
  QuestionRepo,
} from './QuestionRepo';

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
    private readonly repo: QuestionRepo,
    private readonly progress: AnswerProgress,
  ) {}

  /** Returns ordered readings followed by ordered, client-safe MCQs. */
  getLessons(planetId: number): Lesson[] {
    this.validateId(planetId, 'planetId');
    return this.withStorageError('Unable to load lessons.', () => {
      this.requirePlanet(planetId);
      const lessons = this.repo.getLessons(planetId);
      const questions = this.orderedQuestions(planetId, lessons);
      return lessons
        .sort(
          (a, b) => a.lessonNumber - b.lessonNumber || a.lessonId - b.lessonId,
        )
        .map(lesson => ({
          lessonId: lesson.lessonId,
          lessonNumber: lesson.lessonNumber,
          lessonName:
            lesson.lessonNumber === 0
              ? 'Introduction'
              : `Lesson ${lesson.lessonNumber}`,
          tasks: [
            {type: 'Reading', text: lesson.text},
            ...questions
              .filter(question => question.lessonId === lesson.lessonId)
              .map(question => ({
                type: 'Question' as const,
                question: this.toQuestion(question),
              })),
          ],
        }));
    });
  }

  /** Returns the first question without a correct attempt, or null if complete. */
  nextQuestion(userId: number, planetId: number): Question | null {
    this.validateId(userId, 'userId');
    this.validateId(planetId, 'planetId');
    return this.withStorageError('Unable to load the next question.', () => {
      this.requirePlanet(planetId);
      const completed = new Set(
        this.repo.getCompletedQuestionIds(userId, planetId),
      );
      const question = this.orderedQuestions(planetId).find(
        question => !completed.has(question.questionId),
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
      this.repo.transaction(() => {
        const question = this.repo.getQuestion(questionId);
        if (!question) {
          throw new QuestionManagerError(
            'NOT_FOUND',
            `Question ${questionId} does not exist.`,
          );
        }
        const options = this.validOptions(question);
        const selected = options.find(option => option.optionId === optionId);
        if (!selected) {
          throw new QuestionManagerError(
            'INVALID_INPUT',
            'The selected option does not belong to this question.',
          );
        }
        const correctOption = options.find(option => option.isCorrect);
        // validOptions guarantees exactly one correct option.
        if (!correctOption) {
          throw new QuestionManagerError(
            'INVALID_CONTENT',
            'Question has no correct option.',
          );
        }
        const firstCorrect = this.repo.recordAnswer(
          userId,
          questionId,
          selected.isCorrect,
        );
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

  private orderedQuestions(
    planetId: number,
    lessonRecords = this.repo.getLessons(planetId),
  ): QuestionRecord[] {
    const lessons = new Map(
      lessonRecords.map(lesson => [lesson.lessonId, lesson]),
    );
    const questions = this.repo.getQuestions(planetId);
    for (const question of questions) {
      if (!lessons.has(question.lessonId)) {
        throw new QuestionManagerError(
          'INVALID_CONTENT',
          'Question references a missing lesson.',
        );
      }
    }
    return questions.sort((a, b) => {
      const leftNumber = lessons.get(a.lessonId)?.lessonNumber ?? 0;
      const rightNumber = lessons.get(b.lessonId)?.lessonNumber ?? 0;
      return (
        leftNumber - rightNumber ||
        a.lessonId - b.lessonId ||
        a.questionOrder - b.questionOrder ||
        a.questionId - b.questionId
      );
    });
  }

  private validOptions(question: QuestionRecord): AnswerOptionRecord[] {
    if (question.type !== 'mcq') {
      throw new QuestionManagerError(
        'INVALID_CONTENT',
        'Only multiple-choice questions are supported.',
      );
    }
    const options = this.repo.getAnswerOptions(question.questionId);
    if (
      options.length < 2 ||
      options.some(option => option.questionId !== question.questionId) ||
      options.filter(option => option.isCorrect).length !== 1
    ) {
      throw new QuestionManagerError(
        'INVALID_CONTENT',
        `Question ${question.questionId} must have at least two options and exactly one correct option.`,
      );
    }
    return options;
  }

  private toQuestion(question: QuestionRecord): Question {
    return {
      questionId: question.questionId,
      prompt: question.prompt,
      ...(question.graph === null ? {} : {graph: question.graph}),
      type: 'mcq',
      options: this.validOptions(question).map(option => this.toOption(option)),
    };
  }

  private toOption(option: AnswerOptionRecord): AnswerOption {
    return {optionId: option.optionId, label: option.label, text: option.text};
  }

  private requirePlanet(planetId: number): void {
    if (!this.repo.planetExists(planetId)) {
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
