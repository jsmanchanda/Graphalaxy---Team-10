/**
 * Reading task
 */
export interface Reading {
  text: string;
}

/**
 * MCQ task
 */
export interface Question {
  prompt: string;
  options: string[];
  correct: number;
}

/**
 * Type of task - think slide in a lesson, what type of task it is
 */
export type Task = {type: 'Reading'} | {type: 'Question'};

/**
 * Lesson storing its name and the order of the tasks
 */
export interface Lesson {
  lessonName: string;
  tasks: Task[];
}
