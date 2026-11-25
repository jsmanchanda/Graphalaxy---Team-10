import {Group} from 'konva/lib/Group';
import {NavigationScreenModel, UiAction, View} from '../types';
import Konva from 'konva';
import {
  AlienDialogue,
  Component,
  ImageComponent,
  SettingsIconComponent,
  TextBoxComponent,
} from '../components';
import {
  DEFAULT_ALIEN_IMAGE,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  NAV_ALIEN_WIDTH,
  NAV_ALIEN_X,
  NAV_ALIEN_Y,
  NAV_FRAME_IMAGE,
  NAV_HELP_BUBBLE_FONT_SIZE,
  NAV_HELP_BUBBLE_HEIGHT,
  NAV_HELP_BUBBLE_PADDING,
  NAV_HELP_BUBBLE_WIDTH,
  NAV_HELP_BUBBLE_X,
  NAV_HELP_BUBBLE_Y,
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
import {NAV_ALIEN_HELP_TEXT} from '../instructions';
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
    let hoverText = planet.unlocked
      ? `${planet.name}\nProgress: ${String(Math.round(planet.completionPct * 100))}%`
      : `${planet.name}\nLocked`;

    if (planet.name === 'Home') {
      hoverText = planet.name;
    }
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
 * Navigation map: the planets, the paths between them, the player's overall
 * progress, and the alien co-pilot, who repeats the instructions when clicked.
 */
export class NavigationScreenView implements View {
  private group: Konva.Group;
  // The alien's speech bubble with the instructions; hidden until it is clicked.
  private helpDialogue: AlienDialogue;

  /**
   * Constructs Screen View
   * @param onAction user action function
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: NavigationScreenModel,
  ) {
    this.group = new Konva.Group();

    // Draw Alien Buddy. Clicking it shows or hides the instructions.
    const alien = new ImageComponent(
      NAV_ALIEN_X,
      NAV_ALIEN_Y,
      NAV_ALIEN_WIDTH,
      NAV_ALIEN_WIDTH,
      DEFAULT_ALIEN_IMAGE,
    );
    alien.getGroup().name('navAlien');
    alien.on('mouseenter', e => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'pointer';
    });
    alien.on('mouseleave', e => {
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'default';
    });
    alien.getGroup().on('click tap', () => this.toggleHelp());
    this.group.add(alien.getGroup());

    // The instructions, in a bubble whose tail points down at the alien.
    // Clicking the bubble closes it too.
    this.helpDialogue = new AlienDialogue(
      NAV_HELP_BUBBLE_X,
      NAV_HELP_BUBBLE_Y,
      NAV_HELP_BUBBLE_WIDTH,
      NAV_HELP_BUBBLE_HEIGHT,
      NAV_ALIEN_HELP_TEXT,
      'right',
    )
      .setFontSize(NAV_HELP_BUBBLE_FONT_SIZE)
      .setTextLayout({align: 'left', padding: NAV_HELP_BUBBLE_PADDING});
    const helpGroup = this.helpDialogue.getGroup();
    helpGroup.name('navHelpDialogue');
    helpGroup.hide();
    helpGroup.on('click tap', () => this.toggleHelp(false));

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

    // Draw settings icon
    const settingsIcon = new SettingsIconComponent(() =>
      onAction({type: 'openSettings'}),
    );
    this.group.add(settingsIcon.getGroup());

    // Last, so the bubble covers the planets while it is open.
    this.group.add(helpGroup);
  }

  /**
   * Shows or hides the alien's instructions bubble.
   * @param show true to show it, false to hide it; toggles when left out
   */
  toggleHelp(show?: boolean): void {
    const helpGroup = this.helpDialogue.getGroup();
    const visible = show ?? !helpGroup.visible();
    if (visible) {
      helpGroup.show();
      helpGroup.moveToTop();
    } else {
      helpGroup.hide();
    }
    this.group.getLayer()?.batchDraw();
  }

  /**
   * Says whether the alien's instructions bubble is showing.
   * @returns true while the bubble is open
   */
  isHelpOpen(): boolean {
    return this.helpDialogue.getGroup().visible();
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
