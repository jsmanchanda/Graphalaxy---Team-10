import {FONT_CONTHRAX, FONT_PLANET_KOSMOS} from '../UI/constants';
import {NavigationScreenModel} from '../UI/types';
import {UiManager} from '../UI/UIManager';

/**
 * Planet display data
 */
export interface PlanetSummary {
  planetId: number;
  name: string;
  graphOrder: number;
  prereqIds: number[] | null; // Planet id (OR relation)
  unlocked: boolean; // true if any prereq is unlocked
  status: 'friendly' | 'hostile';
  completionPct: number; // percentage 0-1
}

export const allPlanets: PlanetSummary[] = [
  {
    planetId: 0,
    name: 'Home',
    graphOrder: 0,
    prereqIds: null,
    unlocked: true,
    status: 'friendly',
    completionPct: 1,
  },
  {
    planetId: 1,
    name: 'PLanet A',
    graphOrder: 1,
    prereqIds: [0],
    unlocked: true,
    status: 'friendly',
    completionPct: 1,
  },
  {
    planetId: 2,
    name: 'Planet B',
    graphOrder: 2,
    prereqIds: [1],
    unlocked: true,
    status: 'friendly',
    completionPct: 0.2,
  },
  {
    planetId: 3,
    name: 'Planet C',
    graphOrder: 2,
    prereqIds: [1],
    unlocked: true,
    status: 'friendly',
    completionPct: 0.7,
  },
  {
    planetId: 4,
    name: 'PLANET D',
    graphOrder: 3,
    prereqIds: [2, 3],
    unlocked: false,
    status: 'hostile',
    completionPct: 0,
  },
];

const model: NavigationScreenModel = {
  type: 'navigation',
  planets: allPlanets,
  overallStatus: 0.2,
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
