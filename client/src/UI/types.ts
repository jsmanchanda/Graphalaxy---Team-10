import type {Group} from 'konva/lib/Group';

/**
 * View: Data being displayed
 */
export interface View {
  getGroup(): Group;
  show(): void;
  hide(): void;
}

/**
 * Data to be viewed per screen
 */
export type Screen =
  {type: 'title'} | {type: 'question'; prompt: string; answers: [string]};

/**
 * Interface for switching screens
 */
export interface ScreenSwitcher {
  switchToScreen(screen: Screen): void;
}

/**
 * Multiple Choice Question
 */
export interface Question {
  prompt: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
}
