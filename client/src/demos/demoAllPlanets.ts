import {PlanetSummary} from '@graphalaxy/shared/src/api';

export const allPlanets: PlanetSummary[] = [
  {
    planetId: 1,
    name: 'PLanet A',
    graphOrder: 1,
    prereqIds: [],
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
