import Konva from 'konva';
import {GraphComponent} from '../../Graphing/GraphComponent';
import {Interval} from '../../Graphing/functions';
import {ButtonComponent} from '../components';
import {DESIGN_HEIGHT, DESIGN_WIDTH} from '../constants';
import {RadioWaveMinigameScreenModel, UiAction, View} from '../types';

const GRAPH_WIDTH = 600;
const GRAPH_HEIGHT = 275;
const GRAPH_X = (DESIGN_WIDTH - GRAPH_WIDTH) / 2;
const GRAPH_Y = 70;
const TIMER_Y = 45;
const TIMER_HEIGHT = 12;
const CONTROLS_Y = GRAPH_Y + GRAPH_HEIGHT + 18;
const CHECK_BUTTON_WIDTH = 180;
const CHECK_BUTTON_HEIGHT = 45;
const CHECK_BUTTON_X = (DESIGN_WIDTH - CHECK_BUTTON_WIDTH) / 2;
const CHECK_BUTTON_Y = 430;

const DEFAULT_AMPLITUDE = 1;
const DEFAULT_FREQUENCY = 2;
const DEFAULT_HORIZONTAL_SHIFT = 0;
const DEFAULT_VERTICAL_SHIFT = 0;

/**
 * Displays the visual foundation for the radio-wave minigame.
 */
export class RadioWaveMinigameView implements View {
  private group: Konva.Group;

  /**
   * Builds the minigame screen.
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: RadioWaveMinigameScreenModel,
  ) {
    void onAction;
    this.group = new Konva.Group();

    const instructions = new Konva.Text({
      x: GRAPH_X,
      y: 10,
      width: GRAPH_WIDTH,
      text: 'Match the radio wave',
      align: 'center',
      fontSize: 24,
      fill: 'white',
    });
    const timerTrack = new Konva.Rect({
      x: GRAPH_X,
      y: TIMER_Y,
      width: GRAPH_WIDTH,
      height: TIMER_HEIGHT,
      fill: '#7f1d2d',
      stroke: '#f97316',
      strokeWidth: 3,
      cornerRadius: TIMER_HEIGHT / 2,
    });
    const timerBar = new Konva.Rect({
      x: GRAPH_X + 3,
      y: TIMER_Y + 3,
      width: GRAPH_WIDTH - 6,
      height: TIMER_HEIGHT - 6,
      fill: '#84cc16',
      cornerRadius: (TIMER_HEIGHT - 6) / 2,
    });

    const graph = new GraphComponent(
      GRAPH_X,
      GRAPH_Y,
      GRAPH_WIDTH,
      GRAPH_HEIGHT,
      this.getXinterval(
        model.question.frequency,
        model.question.horizontalShift,
      ),
      this.getYinterval(model.question.amplitude, model.question.verticalShift),
    );
    graph.addFunction(
      this.playerEquation(
        model.question.amplitude,
        model.question.frequency,
        model.question.horizontalShift,
        model.question.verticalShift,
      ),
      'target-wave',
    );
    graph.addFunction(
      this.playerEquation(
        DEFAULT_AMPLITUDE,
        DEFAULT_FREQUENCY,
        DEFAULT_HORIZONTAL_SHIFT,
        DEFAULT_VERTICAL_SHIFT,
      ),
      'player-wave',
    );
    this.setWaveColor(graph, 'target-wave', '#ffffff');
    this.setWaveColor(graph, 'player-wave', '#38bdf8');

    this.group.add(instructions);
    this.group.add(timerTrack);
    this.group.add(timerBar);
    this.group.add(graph.getGroup());

    const controls = this.createControls(graph);
    this.group.on('destroy', () => controls.remove());
    const timer = this.startTimer(timerBar, model.config.timeLimitSeconds);
    this.group.on('destroy', () => window.clearInterval(timer));

    const checkButton = new ButtonComponent(
      CHECK_BUTTON_X,
      CHECK_BUTTON_Y,
      CHECK_BUTTON_WIDTH,
      CHECK_BUTTON_HEIGHT,
      'SUBMIT',
      () => undefined,
    );

    this.group.add(checkButton.getGroup());
  }

  /**
   * Gets the screen group.
   */
  getGroup(): Konva.Group {
    return this.group;
  }

  /**
   * Applies the minigame's colors without changing the shared graph component.
   */
  private setWaveColor(graph: GraphComponent, id: string, color: string): void {
    const wave = graph.getGroup().findOne(`#${id}`);
    if (wave instanceof Konva.Line) {
      wave.stroke(color);
    }
  }

  /**
   * Shrinks the timer bar for the duration of the round.
   */
  private startTimer(timerBar: Konva.Rect, timeLimitSeconds: number): number {
    const startTime = Date.now();
    const duration = Math.max(timeLimitSeconds, 1) * 1000;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1 - elapsed / duration);
      timerBar.width((GRAPH_WIDTH - 6) * remaining);

      if (remaining === 0) {
        window.clearInterval(timer);
      }
    }, 100);
    return timer;
  }

  /**
   * Creates an x-axis range that shows the target wave clearly.
   */
  private getXinterval(frequency: number, horizontalShift: number): Interval {
    const safeFrequency = Math.max(Math.abs(frequency), 0.25);
    const halfRange = Math.max(
      Math.PI * 2,
      Math.abs(horizontalShift) + (Math.PI * 2) / safeFrequency,
    );
    return new Interval(-halfRange, halfRange, Math.PI, true);
  }

  /**
   * Creates a y-axis range that contains the target wave.
   */
  private getYinterval(amplitude: number, verticalShift: number): Interval {
    const halfRange = Math.max(5, Math.abs(amplitude) + 1);
    return new Interval(
      verticalShift - halfRange,
      verticalShift + halfRange,
      1,
    );
  }

  /**
   * Creates the editable expression beneath the graph.
   */
  private createControls(graph: GraphComponent): HTMLDivElement {
    const amplitude = this.createInput('amplitude', String(DEFAULT_AMPLITUDE));
    const frequency = this.createInput('frequency', String(DEFAULT_FREQUENCY));
    const horizontalShift = this.createInput(
      'horizontal-shift',
      String(DEFAULT_HORIZONTAL_SHIFT),
    );
    const verticalShift = this.createInput(
      'vertical-shift',
      String(DEFAULT_VERTICAL_SHIFT),
    );
    const controls = document.createElement('div');
    controls.style.position = 'fixed';
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.gap = '12px';
    controls.style.color = 'white';
    controls.style.fontFamily = 'Conthrax';
    controls.style.fontSize = '18px';
    controls.style.whiteSpace = 'nowrap';
    controls.style.zIndex = '1';
    controls.style.transform = 'translateX(-50%)';
    controls.append(
      document.createTextNode('y ='),
      amplitude,
      document.createTextNode('sin('),
      frequency,
      document.createTextNode('(x -'),
      horizontalShift,
      document.createTextNode(') +'),
      verticalShift,
    );
    document.body.append(controls);
    const positionControls = (): void => {
      const scale = Math.min(
        window.innerWidth / DESIGN_WIDTH,
        window.innerHeight / DESIGN_HEIGHT,
      );
      const offsetX = (window.innerWidth - DESIGN_WIDTH * scale) / 2;
      const offsetY = (window.innerHeight - DESIGN_HEIGHT * scale) / 2;
      controls.style.left = `${offsetX + (DESIGN_WIDTH / 2) * scale}px`;
      controls.style.top = `${offsetY + CONTROLS_Y * scale}px`;
      controls.style.gap = `${12 * scale}px`;
      controls.style.fontSize = `${18 * scale}px`;
    };
    positionControls();
    window.addEventListener('resize', positionControls);

    const updateWave = (): void =>
      this.updatePlayerWave(
        graph,
        amplitude,
        frequency,
        horizontalShift,
        verticalShift,
      );
    amplitude.addEventListener('input', updateWave);
    frequency.addEventListener('input', updateWave);
    horizontalShift.addEventListener('input', updateWave);
    verticalShift.addEventListener('input', updateWave);
    this.group.on('destroy', () => {
      window.removeEventListener('resize', positionControls);
    });
    return controls;
  }

  /**
   * Creates one numeric input for the wave expression.
   */
  private createInput(name: string, value: string): HTMLInputElement {
    const input = document.createElement('input');
    input.name = name;
    input.type = 'number';
    input.step = '0.1';
    input.value = value;
    input.style.width = '75px';
    input.style.padding = '10px';
    input.style.border = '1px solid white';
    input.style.borderRadius = '4px';
    input.style.backgroundColor = '#0c22cbc3';
    input.style.color = 'white';
    input.style.fontFamily = 'Conthrax';
    input.style.fontSize = '18px';
    return input;
  }

  /**
   * Updates the player's wave from the input values.
   */
  private updatePlayerWave(
    graph: GraphComponent,
    amplitude: HTMLInputElement,
    frequency: HTMLInputElement,
    horizontalShift: HTMLInputElement,
    verticalShift: HTMLInputElement,
  ): void {
    const amplitudeValue = Number(amplitude.value);
    const frequencyValue = Number(frequency.value);
    const horizontalShiftValue = Number(horizontalShift.value);
    const verticalShiftValue = Number(verticalShift.value);
    if (
      !Number.isFinite(amplitudeValue) ||
      !Number.isFinite(frequencyValue) ||
      !Number.isFinite(horizontalShiftValue) ||
      !Number.isFinite(verticalShiftValue)
    ) {
      return;
    }

    graph.clearFunction('player-wave');
    graph.addFunction(
      this.playerEquation(
        amplitudeValue,
        frequencyValue,
        horizontalShiftValue,
        verticalShiftValue,
      ),
      'player-wave',
    );
    this.setWaveColor(graph, 'player-wave', '#38bdf8');
  }

  /**
   * Builds the player equation from the entered values.
   */
  private playerEquation(
    amplitude: number,
    frequency: number,
    horizontalShift: number,
    verticalShift: number,
  ): string {
    return `${amplitude} * Math.sin(${frequency} * (x - ${horizontalShift})) + ${verticalShift}`;
  }
}
