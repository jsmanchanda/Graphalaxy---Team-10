import {Group} from 'konva/lib/Group';
import {NavigationScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {Component, ImageComponent, TextBoxComponent} from '../components';
import {DESIGN_HEIGHT, DESIGN_WIDTH} from '../constants';
import {PlanetSummary} from '../../demos/NavigationDemo';
import {UiError} from '../UIError';

// Planet Path Colors
const COLOR_COMPLETE = '#00FF19';
const COLOR_IN_PROGRESS = '#EEF20D';
const COLOR_REACHABLE = '#F20D0D';
const COLOR_UNREACHABLE = '#434242';

const PLANET_DIAMETER = 75;
// correponds with planet id
const PLANET_POSITIONS = [
  {x: 75, y: 350},
  {x: 210, y: 260},
  {x: 315, y: 130},
  {x: 385, y: 280},
  {x: 490, y: 125},
  {x: 515, y: 145},
  {x: 515, y: 145},
];

const HOVER_TEXT_WIDTH = 150;
const HOVER_TEXT_HEIGHT = 35;

/**
 * Planet Component Factory
 */
export class PlanetComponent extends Component {
  /**
   * constructs planet of right color and display text
   */
  constructor(planet: PlanetSummary, onClick: () => void) {
    const positionX = PLANET_POSITIONS[planet.planetId].x;
    const positionY = PLANET_POSITIONS[planet.planetId].y;
    super(positionX, positionY);

    // hover text
    const hoverText = `${planet.name}\nProgress: ${String(Math.round(planet.completionPct * 100))}%`;
    const planetNameText = new TextBoxComponent(
      (-1 * (HOVER_TEXT_WIDTH - PLANET_DIAMETER)) / 2,
      (-1 * PLANET_DIAMETER) / 2,
      HOVER_TEXT_WIDTH,
      HOVER_TEXT_HEIGHT,
      hoverText,
    );
    planetNameText.setFontSize(12);
    planetNameText.setTextColor('white');
    planetNameText.getGroup().hide();
    this.group.add(planetNameText.getGroup());

    // planet Image
    const planetImage = new ImageComponent(
      0,
      0,
      PLANET_DIAMETER,
      PLANET_DIAMETER,
      '/assets/planet-' + String(planet.planetId) + '.png',
      !planet.unlocked, // grey scale if not unlocked
    );
    this.group.add(planetImage.getGroup());

    // Handle actions
    planetImage.on('mouseenter', e => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'pointer';

      planetNameText.getGroup().show();
      this.group.getLayer()?.batchDraw();
    });
    planetImage.on('mouseleave', e => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'default';
      planetNameText.getGroup().hide();
      this.group.getLayer()?.batchDraw();
    });
    this.group.on('click tap', e => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'default';
      onClick();
    });
  }
}

/**
 * Reading task View
 */
export class NavigationScreenView implements View {
  private group: Konva.Group;

  /**
   * Constructs Screen View
   * @param onAction user action function
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: NavigationScreenModel,
  ) {
    this.group = new Konva.Group();

    for (const planet of model.planets) {
      // draw planet path
      for (const planetId of planet.prereqIds ?? []) {
        const planetPath = new Konva.Line({
          points: [
            PLANET_POSITIONS[planet.planetId].x + PLANET_DIAMETER / 2,
            PLANET_POSITIONS[planet.planetId].y + PLANET_DIAMETER / 2,
            PLANET_POSITIONS[planetId].x + PLANET_DIAMETER / 2,
            PLANET_POSITIONS[planetId].y + PLANET_DIAMETER / 2,
          ],
          stroke: this.completionToColor(planet.completionPct),
          strokeWidth: 2,
          lineCap: 'round',
          lineJoin: 'round',
        });
        this.group.add(planetPath);
        planetPath.moveToBottom();
      }
      // draw planets
      const newPlanet = new PlanetComponent(planet, () =>
        onAction({type: 'enterPlanet', planetId: planet.planetId}),
      );
      this.group.add(newPlanet.getGroup());
    }
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Group {
    return this.group;
  }

  /**
   * Helper Converts planet completion to color string
   * @param completion planet completion 0-1
   * @returns string corresponding path color based on range
   */
  completionToColor(completion: number): string {
    if (completion < 0 || completion > 1) {
      throw new UiError(
        'InvalidInput',
        `Invalid Planet Completion value. Expects 0-1, received :${completion}`,
      );
    }
    if (completion === 0) return COLOR_UNREACHABLE;
    if (completion <= 0.4) return COLOR_REACHABLE;
    if (completion <= 0.7) return COLOR_IN_PROGRESS;
    return COLOR_COMPLETE;
  }

  /**
   * debug
   */
  debugPoint() {
    const debugPoint = new Konva.Circle({
      x: DESIGN_WIDTH / 2, // X coordinate of the center
      y: DESIGN_HEIGHT / 2, // Y coordinate of the center
      radius: 75 / 2, // Circle radius
      fill: 'red', // Fill color
      draggable: true, // Enables drag and drop
    });
    debugPoint.moveToTop();
    this.group.add(debugPoint);
    debugPoint.on('dragend', e => {
      console.log(
        `Current position:\nx: ${e.target.x() - 75 / 2}\ny: ${e.target.y() - 75 / 2}`,
      );
    });
  }
}
