/**
 * GRAPH TEST
 * run with:
 *        npm run dev:graph -w client # starts Vite and opens http://localhost:5173/src/demos/graph.html
 */

import {FONT_CONTHRAX, FONT_PLANET_KOSMOS} from '../UI/constants';
import {UiManager} from '../UI/UIManager';
import {
  CubicFunction,
  LinearFunction,
  MathFunction,
  QuadraticFunction,
} from '../Graphing/functions';
import {VisualReadingScreenModel} from '../UI/types';

let text = 'this is reading text \n';
text += text;
text += text;
text += text;
text += text;

const linearFun = new LinearFunction(3, 4);
const quadFun = new QuadraticFunction(1, 0, 0);
const cubicFun = new CubicFunction(-1, 2, 10, 1);

let functionToGraph: MathFunction = linearFun;
functionToGraph = linearFun;
functionToGraph = quadFun;
functionToGraph = cubicFun;

const model: VisualReadingScreenModel = {
  type: 'visualReading',
  readingText: text,
  mathFunction: functionToGraph,
};

const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

Promise.all(fonts.map(f => f.load()))
  .then(loaded => {
    loaded.forEach(f => document.fonts.add(f));
    const ui = new UiManager('container', () => {});
    ui.displayScreen(model);
  })
  .catch(err => console.error('Startup failed:', err));
