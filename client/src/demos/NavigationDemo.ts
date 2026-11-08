import {FONT_CONTHRAX, FONT_PLANET_KOSMOS} from '../UI/constants';
import {NavigationScreenModel} from '../UI/types';
import {UiManager} from '../UI/UIManager';

// export interface NavigationScreenModel {
//   type: 'navigation';
// }

// /**
//  *
//  */
// export interface PlanetProgress {
//   progress: number;
// }

/**
 * Represents plants status
 */
export enum PlanetStatus {
  COMPLETE,
  IN_PROGRESS,
  REACHABLE,
  UNREACHABLE,
}

/**
 * Planet display data
 */
export interface PlanetDisplay {
  name: string;
  status: PlanetStatus;
  position: number;
}

const displayPlanets: PlanetDisplay[] = [
  {
    name: 'planet1',
    status: PlanetStatus.COMPLETE,
    position: 1,
  },
  {
    name: 'planet2',
    status: PlanetStatus.IN_PROGRESS,
    position: 2,
  },
  {
    name: 'planet3',
    status: PlanetStatus.REACHABLE,
    position: 3,
  },
  {
    name: 'planet4',
    status: PlanetStatus.UNREACHABLE,
    position: 4,
  },
];

const model: NavigationScreenModel = {
  type: 'navigation',
  planets: displayPlanets,
  overallStatus: '90',
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
