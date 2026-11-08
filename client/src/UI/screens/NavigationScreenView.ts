import {Group} from 'konva/lib/Group';
import {NavigationScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {PlanetDisplay} from '../../demos/NavigationDemo';
import {Component, ImageComponent, TextBoxComponent} from '../components';

const PLANET_OFFSET = 0;
/**
 * Planet Component Factory
 */
export class PlanetComponent extends Component {
  /**
   * constructs planet of right color and display text
   */
  constructor(planet: PlanetDisplay, onClick: () => void) {
    const positionX = PLANET_OFFSET + planet.position * 150;
    const positionY = 400;
    super(positionX, positionY);

    const planetNameText = new TextBoxComponent(0, -25, 75, 35, planet.name);
    planetNameText.setFontSize(12);
    planetNameText.getGroup().hide();
    this.group.add(planetNameText.getGroup());

    const planetImage = new ImageComponent(
      0,
      0,
      75,
      75,
      '/assets/planet-' + String(planet.position) + '.png',
      planet.status === 3,
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
    const allPlanets: PlanetComponent[] = [];
    for (const planet of model.planets) {
      const newPlanet = new PlanetComponent(planet, () =>
        onAction({type: 'enterPlanet', planetId: planet.position}),
      );
      allPlanets.push(newPlanet);
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
}
