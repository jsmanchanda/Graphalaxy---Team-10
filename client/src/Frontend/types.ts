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
 * Type of task - think slide on a planet, what type of task it is
 */
export type Task = Reading | Question;

/**
 * Planet storing its details and the order of the tasks
 */
export interface Planet {
  planetId: number;
  name: string;
  introText: string;
  graphOrder: number;
  tasks: Task[];
}
