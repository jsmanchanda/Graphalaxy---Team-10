// run with:
// npm run dev:demo -w client
/**
 * UI DEMO
 * run with :
 *        npm run dev:demo -w client # starts Vite and opens http://localhost:5173/demo.html
 */

import {FONT_CONTHRAX, FONT_PLANET_KOSMOS} from '../constants';
import {
  LessonIntroScreenModel,
  LessonResultScreenModel,
  Question,
  QuestionResultScreenModel,
  QuestionScreenModel,
  ReadingScreenModel,
  ScreenModel,
  TitleScreenModel,
  UiAction,
} from '../types';
import {UiManager} from '../UIManager';

// Mock Data
const titleScreen: TitleScreenModel = {type: 'title', title: 'Graphalaxy'};

const lessonIntro: LessonIntroScreenModel = {
  type: 'intro',
  title: 'Planet 1: Lines',
  description:
    'This Planet is all about Lines. This Planet is all about Lines. This Planet is all about Lines. This Planet is all about Lines. This Planet is all about Lines. ',
};

const readingScreen: ReadingScreenModel = {
  type: 'reading',
  readingText:
    'this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. this is the reading. ',
};

const question: Question = {
  prompt: 'Question 1',
  option1: 'a',
  option2: 'b',
  option3: 'c',
  option4: 'd',
};

const questionScreen: QuestionScreenModel = {
  type: 'question',
  question: question,
};

const questionResultScreen: QuestionResultScreenModel = {
  type: 'questionResult',
  result: 'Correct!',
};

const lessonResultScreen: LessonResultScreenModel = {
  type: 'lessonResult',
  result:
    'you scored got 4/5 questions right. This planet is currently 80% is almost finished',
};

const lesson1: ScreenModel[] = [
  lessonIntro,
  readingScreen,
  questionScreen,
  questionResultScreen,
  lessonResultScreen,
];

// Game manager Mock
class GameManager {
  private ui: UiManager;
  private lesson: ScreenModel[];
  private lessonIndex: number;
  constructor() {
    this.ui = new UiManager('container', action => this.handleAction(action));
    this.lesson = lesson1;
    this.lessonIndex = -1; // -1 means lesson hasn't started
  }

  start() {
    this.ui.displayScreen(titleScreen);
  }

  private handleAction(action: UiAction): void {
    switch (action.type) {
      case 'start':
        this.lessonIndex = 0;
        this.ui.displayScreen(this.lesson[this.lessonIndex]);
        break;
      case 'next':
        this.lessonIndex++;
        this.ui.displayScreen(this.lesson[this.lessonIndex]);
        break;
      case 'answer':
        this.lessonIndex++;
        this.ui.displayScreen(this.lesson[this.lessonIndex]);
        break;
      case 'back':
        this.lessonIndex--;
        this.ui.displayScreen(this.lesson[this.lessonIndex]);
        break;
    }
  }
}

// Load all fonts before drawing anything, since Konva won't redraw when they arrive
const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

Promise.all(fonts.map(f => f.load()))
  .then(loaded => {
    loaded.forEach(f => document.fonts.add(f));
    const gm = new GameManager();
    gm.start();
  })
  .catch(err => console.error('Font failed to load:', err));
