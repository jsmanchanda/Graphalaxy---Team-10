import Konva from 'konva';
import {GraphComponent} from '../../Graphing/GraphComponent';
import {Interval} from '../../Graphing/functions';
import {ButtonComponent} from '../components';
import {DESIGN_HEIGHT, DESIGN_WIDTH} from '../constants';
import {RadioWaveMinigameScreenModel, UiAction, View} from '../types';

const GRAPH_WIDTH = 600;
const GRAPH_HEIGHT = 330;
const GRAPH_X = (DESIGN_WIDTH - GRAPH_WIDTH) / 2;
const GRAPH_Y = 20;
const CONTROLS_Y = GRAPH_Y + GRAPH_HEIGHT + 18;
const CHECK_BUTTON_WIDTH = 180;
const CHECK_BUTTON_HEIGHT = 45;
const CHECK_BUTTON_X = (DESIGN_WIDTH - CHECK_BUTTON_WIDTH) / 2;
const CHECK_BUTTON_Y = 405;

const TARGET_EQUATION = '2 * Math.sin(x)';
const DEFAULT_AMPLITUDE = 1;
const DEFAULT_FREQUENCY = 2;

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
    void model;
    void onAction;
    this.group = new Konva.Group();

    const checkButton = new ButtonComponent(
      CHECK_BUTTON_X,
      CHECK_BUTTON_Y,
      CHECK_BUTTON_WIDTH,
      CHECK_BUTTON_HEIGHT,
      'Check Answer',
      () => undefined,
    );

    const graph = new GraphComponent(
      GRAPH_X,
      GRAPH_Y,
      GRAPH_WIDTH,
      GRAPH_HEIGHT,
      new Interval(-Math.PI * 2, Math.PI * 2, Math.PI, true),
      new Interval(-3, 3, 1),
    );
    graph.addFunction(TARGET_EQUATION, 'target-wave');
    graph.addFunction(
      this.playerEquation(DEFAULT_AMPLITUDE, DEFAULT_FREQUENCY),
      'player-wave',
    );
    this.setWaveColor(graph, 'target-wave', '#ffffff');
    this.setWaveColor(graph, 'player-wave', '#38bdf8');

    this.group.add(graph.getGroup());
    this.group.add(checkButton.getGroup());

    const controls = this.createControls(graph);
    this.group.on('destroy', () => controls.remove());
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
   * Creates the editable expression beneath the graph.
   */
  private createControls(graph: GraphComponent): HTMLDivElement {
    const amplitude = this.createInput('amplitude', String(DEFAULT_AMPLITUDE));
    const frequency = this.createInput('frequency', String(DEFAULT_FREQUENCY));
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
      document.createTextNode('Match the radio wave: '),
      document.createTextNode('y ='),
      amplitude,
      document.createTextNode('sin('),
      frequency,
      document.createTextNode('x)'),
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
      this.updatePlayerWave(graph, amplitude, frequency);
    amplitude.addEventListener('input', updateWave);
    frequency.addEventListener('input', updateWave);
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
  ): void {
    const amplitudeValue = Number(amplitude.value);
    const frequencyValue = Number(frequency.value);
    if (!Number.isFinite(amplitudeValue) || !Number.isFinite(frequencyValue)) {
      return;
    }

    graph.clearFunction('player-wave');
    graph.addFunction(
      this.playerEquation(amplitudeValue, frequencyValue),
      'player-wave',
    );
    this.setWaveColor(graph, 'player-wave', '#38bdf8');
  }

  /**
   * Builds the player equation from the entered values.
   */
  private playerEquation(amplitude: number, frequency: number): string {
    return `${amplitude} * Math.sin(${frequency} * x)`;
  }
}
