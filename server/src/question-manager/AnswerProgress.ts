/** Published only for the first correct answer to a user's question. */
export interface AnswerEvent {
  userId: number;
  questionId: number;
  planetId: number;
}

/** Progress Manager boundary; handlers share the Data Writer's connection. */
export interface AnswerProgress {
  /** Updates progress synchronously; throwing rolls back the submission. */
  onAnswer(event: AnswerEvent): void;
}
