/** An answer option safe to send before a question is graded. */
export interface AnswerOption {
  optionId: number;
  label: string;
  text: string;
}

/** A multiple-choice question; answer keys remain on the server. */
export interface Question {
  questionId: number;
  prompt: string;
  graph?: string;
  type: 'mcq';
  options: AnswerOption[];
}

/** The reading displayed before a lesson's questions. */
export interface ReadingTask {
  type: 'Reading';
  text: string;
}

/** A question slide in a lesson. */
export interface QuestionTask {
  type: 'Question';
  question: Question;
}

/** A lesson's reading and question slides in display order. */
export interface Lesson {
  lessonId: number;
  lessonNumber: number;
  lessonName: string;
  tasks: Array<ReadingTask | QuestionTask>;
}

/** Feedback released only after a valid answer submission. */
export interface AnswerResult {
  questionId: number;
  correct: boolean;
  correctOption: AnswerOption;
}
