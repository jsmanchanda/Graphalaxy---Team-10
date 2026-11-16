/**
 * GRAPH TEST
 * run with:
 *        npm run dev:graph -w client # starts Vite and opens http://localhost:5173/src/demos/graph.html
 */
import {FONT_CONTHRAX, FONT_PLANET_KOSMOS} from '../UI/constants';
import {UiManager} from '../UI/UIManager';
import {Question, Task} from '@graphalaxy/shared';
import {taskToScreen} from '../Frontend/screenModelMaker';
import {ScreenModel} from '../UI/types';

const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

const readingTask: Task = {
  type: 'Reading',
  text: 'this is a reading',
  graph: {fn: '3*x+2'},
};

const question: Question = {
  questionId: 0,
  prompt: 'this is a question prompt',
  graph: {fn: '-4*x+2'},
  type: 'mcq',
  options: [
    {optionId: 0, label: 'a', text: 'A'},
    {optionId: 1, label: 'b', text: 'B'},
    {optionId: 2, label: 'c', text: 'C'},
    {optionId: 3, label: 'd', text: 'D'},
  ],
};

const questionTask: Task = {
  type: 'Question',
  question: question,
};

const screensToTest: ScreenModel[] = [];
screensToTest.push(taskToScreen(readingTask));
screensToTest.push(taskToScreen(questionTask));

let screenIndex = 0;
function demoSwitchScreen() {
  screenIndex++;
  if (screenIndex > screensToTest.length - 1) {
    screenIndex = 0;
  }
  ui.displayScreen(screensToTest[screenIndex]);
}

const ui = new UiManager('container', demoSwitchScreen);

Promise.all(fonts.map(f => f.load()))
  .then(loaded => {
    loaded.forEach(f => document.fonts.add(f));
    ui.displayScreen(screensToTest[0]);
  })
  .catch(err => console.error('Startup failed:', err));
