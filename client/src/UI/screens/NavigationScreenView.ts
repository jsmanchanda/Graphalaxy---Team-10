import {Group} from 'konva/lib/Group';
import {NavigationScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {Component, ImageComponent, TextBoxComponent} from '../components';
import {
  DEFAULT_ALIEN_IMAGE,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  NAV_ALIEN_WIDTH,
  NAV_ALIEN_X,
  NAV_ALIEN_Y,
  NAV_FRAME_IMAGE,
  NAV_PROGRESS_HEIGHT,
  NAV_PROGRESS_WIDTH,
  NAV_PROGRESS_X,
  NAV_PROGRESS_Y,
  PLANET_DIAMETER,
  PLANET_HOVER_TEXT_COLOR,
  PLANET_HOVER_TEXT_FONT_SIZE,
  PLANET_HOVER_TEXT_HEIGHT,
  PLANET_HOVER_TEXT_WIDTH,
  PLANET_PATH_COLOR_COMPLETE,
  PLANET_PATH_COLOR_IN_PROGRESS,
  PLANET_PATH_COLOR_REACHABLE,
  PLANET_PATH_COLOR_UNREACHABLE,
  PLANET_PATH_STROKE_WIDTH,
  PLANET_POSITIONS,
} from '../constants';
import {PlanetSummary} from '@graphalaxy/shared';

const HOME_PLANET: PlanetSummary = {
  planetId: 0,
  name: 'Home',
  graphOrder: 0,
  prereqIds: [],
  unlocked: true,
  status: 'peaceful',
  completionPct: 1,
  correctCount: 0,
  questionCount: 0,
};

/**
 * Planet Component Factory
 */
export class PlanetComponent extends Component {
  /**
   * constructs planet of right color and display text
   */
  constructor(planet: PlanetSummary, onClick: (() => void) | null) {
    const positionX = PLANET_POSITIONS[planet.planetId].x;
    const positionY = PLANET_POSITIONS[planet.planetId].y;
    super(positionX, positionY);

    // hover text
    const hoverText = planet.unlocked
      ? `${planet.name}\nProgress: ${String(Math.round(planet.completionPct * 100))}%`
      : `${planet.name}\nLocked`;
    const planetNameText = new TextBoxComponent(
      (-1 * (PLANET_HOVER_TEXT_WIDTH - PLANET_DIAMETER)) / 2,
      (-1 * PLANET_DIAMETER) / 2,
      PLANET_HOVER_TEXT_WIDTH,
      PLANET_HOVER_TEXT_HEIGHT,
      hoverText,
    );
    planetNameText.setFontSize(PLANET_HOVER_TEXT_FONT_SIZE);
    planetNameText.setTextColor(PLANET_HOVER_TEXT_COLOR);
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
      if (stage && onClick) {
        stage.container().style.cursor = planet.unlocked
          ? 'pointer'
          : 'not-allowed';
      }

      planetNameText.getGroup().show();
      this.group.getLayer()?.batchDraw();
    });
    planetImage.on('mouseleave', e => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'default';
      planetNameText.getGroup().hide();
      this.group.getLayer()?.batchDraw();
    });

    if (onClick) {
      this.group.on('click tap', e => {
        if (!planet.unlocked) return; // locked planets ignore clicks
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'default';
        onClick();
      });
    }
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

    // Draw Alien Buddy
    const alien = new ImageComponent(
      NAV_ALIEN_X,
      NAV_ALIEN_Y,
      NAV_ALIEN_WIDTH,
      NAV_ALIEN_WIDTH,
      DEFAULT_ALIEN_IMAGE,
    );
    this.group.add(alien.getGroup());

    // Draw border image
    const borderImage = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      NAV_FRAME_IMAGE,
    );
    this.group.add(borderImage.getGroup());
    borderImage.getGroup().moveToBottom();

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
          strokeWidth: PLANET_PATH_STROKE_WIDTH,
          lineCap: 'round',
          lineJoin: 'round',
        });
        this.group.add(planetPath);
        planetPath.moveToBottom();
      }

      // draw planets
      const newPlanet = new PlanetComponent(planet, () =>
        onAction({type: 'selectPlanet', planetId: planet.planetId}),
      );
      this.group.add(newPlanet.getGroup());
    }

    // draw Home planet and path
    const homePath = new Konva.Line({
      points: [
        PLANET_POSITIONS[0].x + PLANET_DIAMETER / 2,
        PLANET_POSITIONS[0].y + PLANET_DIAMETER / 2,
        PLANET_POSITIONS[1].x + PLANET_DIAMETER / 2,
        PLANET_POSITIONS[1].y + PLANET_DIAMETER / 2,
      ],
      stroke: PLANET_PATH_COLOR_COMPLETE,
      strokeWidth: PLANET_PATH_STROKE_WIDTH,
      lineCap: 'round',
      lineJoin: 'round',
    });
    this.group.add(homePath);
    homePath.moveToBottom();

    // draw home planet
    const homePlanet = new PlanetComponent(HOME_PLANET, null);
    this.group.add(homePlanet.getGroup());

    // Draw Total Progress
    const roundedProgress = Math.round(model.overallStatus * 100);
    const progressString =
      'Intergalactic Peace: ' + String(roundedProgress) + '%';
    const totalProgress = new TextBoxComponent(
      NAV_PROGRESS_X,
      NAV_PROGRESS_Y,
      NAV_PROGRESS_WIDTH,
      NAV_PROGRESS_HEIGHT,
      progressString,
    );
    this.group.add(totalProgress.getGroup());
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
    // Written as !(in range) so NaN is rejected too
    const c = Math.min(1, Math.max(0, completion));
    if (c === 0) return PLANET_PATH_COLOR_UNREACHABLE;
    if (c <= 0.4) return PLANET_PATH_COLOR_REACHABLE;
    if (c <= 0.7) return PLANET_PATH_COLOR_IN_PROGRESS;
    return PLANET_PATH_COLOR_COMPLETE;
  }

  /**
   * debug
   */
  debugPoint() {
    const debugPoint = new Konva.Circle({
      x: DESIGN_WIDTH / 2, // X coordinate of the center
      y: DESIGN_HEIGHT / 2, // Y coordinate of the center
      radius: 25 / 2, // Circle radius
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
