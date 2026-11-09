import {Group} from 'konva/lib/Group';
import {NavigationScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {PlanetDisplay} from '../../demos/NavigationDemo';
import {Component, ImageComponent, TextBoxComponent} from '../components';
import {DESIGN_HEIGHT, DESIGN_WIDTH} from '../constants';

const PLANET_DIAMETER = 75;
// matches number of planet images
const planetPositions = [
  {x: 75, y: 350},
  {x: 205, y: 240},
  {x: 360, y: 150},
  {x: 515, y: 145},
  {x: 680, y: 190},
  {x: 515, y: 145},
  {x: 515, y: 145},
];

/**
 * Planet Component Factory
 */
export class PlanetComponent extends Component {
  /**
   * constructs planet of right color and display text
   */
  constructor(planet: PlanetDisplay, onClick: () => void) {
    const positionX = planetPositions[planet.position].x;
    const positionY = planetPositions[planet.position].y;
    super(positionX, positionY);

    const planetNameText = new TextBoxComponent(
      0,
      (-1 * PLANET_DIAMETER) / 2,
      75,
      35,
      planet.name,
    );
    planetNameText.setFontSize(12);
    planetNameText.setTextColor('white');
    planetNameText.getGroup().hide();
    this.group.add(planetNameText.getGroup());

    const planetImage = new ImageComponent(
      0,
      0,
      PLANET_DIAMETER,
      PLANET_DIAMETER,
      '/assets/planet-' + String(planet.position) + '.png',
      planet.status === 'grey',
    );
    // planetImage.setOpacity(1 - 0.3 * planet.status);

    this.group.on('click tap', onClick);
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
    this.group.add(planetImage.getGroup());
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
    // this.debugPoint();

    for (let i = 0; i < model.planets.length; ++i) {
      // Draw planet paths
      if (i !== 0) {
        const planetPath = new Konva.Line({
          points: [
            planetPositions[i - 1].x + PLANET_DIAMETER / 2,
            planetPositions[i - 1].y + PLANET_DIAMETER / 2,
            planetPositions[i].x + PLANET_DIAMETER / 2,
            planetPositions[i].y + PLANET_DIAMETER / 2,
          ],
          stroke: model.planets[i].status,
          strokeWidth: 2,
          lineCap: 'round',
          lineJoin: 'round',
        });
        this.group.add(planetPath);
        planetPath.moveToBottom();
      }
      // Draw Planet Object
      const newPlanet = new PlanetComponent(model.planets[i], () =>
        onAction({type: 'enterPlanet', planetId: model.planets[i].position}),
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
    this.group.add(debugPoint);
    debugPoint.on('dragend', e => {
      console.log(
        `Current position:\nx: ${e.target.x() - 75 / 2}\ny: ${e.target.y() - 75 / 2}`,
      );
    });
  }
}
