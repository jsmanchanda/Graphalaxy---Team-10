/**
 * Reading task
 */
export interface Reading {
  type: 'Reading';
  text: string;
}

/**
 * MCQ task
 */
export interface Question {
  type: 'Question';
  prompt: string;
  options: string[];
  correct: number;
}

/**
 * Type of task - think slide in a lesson, what type of task it is
 */
export type Task = Reading | Question;

/**
 * Lesson storing its name and the order of the tasks
 */
export interface Lesson {
  lessonName: string;
  lessonNumber: number;
  introText: string;
  tasks: Task[];
}
