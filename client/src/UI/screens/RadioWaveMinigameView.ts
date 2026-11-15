import Konva from 'konva';
import {GraphComponent} from '../../Graphing/GraphComponent';
import {Interval} from '../../Graphing/functions';
import {ButtonComponent} from '../components';
import {DESIGN_HEIGHT, DESIGN_WIDTH} from '../constants';
import {
  RadioWaveMinigameScreenModel,
  RadioWaveQuestion,
  UiAction,
  View,
} from '../types';

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
const ANSWER_TOLERANCE = 0.05;

/**
 * Displays the instructions, timed round, and results for the minigame.
 */
export class RadioWaveMinigameView implements View {
  private group: Konva.Group;
  private timer?: number;
  private roundEndsAt = 0;
  private currentQuestion: RadioWaveQuestion;
  private graph?: GraphComponent;
  private inputs?: {
    amplitude: HTMLInputElement;
    frequency: HTMLInputElement;
    horizontalShift: HTMLInputElement;
    verticalShift: HTMLInputElement;
  };
  private removeControls?: () => void;
  private correctAnswers = 0;
  private screen: 'instructions' | 'gameplay' | 'results' = 'instructions';

  /**
   * Builds the minigame screen.
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: RadioWaveMinigameScreenModel,
  ) {
    void onAction;
    this.currentQuestion = model.question;
    this.group = new Konva.Group();
    // UIManager destroys this group when it switches to another view.
    this.group.on('destroy', () => this.clearRound());
    this.showInstructions(model);
  }

  /**
   * Explains the round before the player starts the timer.
   */
  private showInstructions(model: RadioWaveMinigameScreenModel): void {
    this.group.add(
      new Konva.Text({
        x: GRAPH_X,
        y: 65,
        width: GRAPH_WIDTH,
        text: 'Match the radio wave',
        align: 'center',
        fontSize: 28,
        fill: 'white',
      }),
    );
    this.group.add(
      new Konva.Text({
        x: GRAPH_X,
        y: 135,
        width: GRAPH_WIDTH,
        text:
          'Change the equation values to match your blue wave to the white wave.\n\n' +
          'Use y = A sin(B(x - h)) + k, then submit your answer.\n\n' +
          `You have ${model.config.timeLimitSeconds} seconds. There are no skips.\n\n` +
          `Goal: ${model.config.correctAnswersForHint} correct answers for a hint.`,
        align: 'center',
        fontSize: 20,
        lineHeight: 1.3,
        fill: 'white',
      }),
    );
    const startButton = new ButtonComponent(
      CHECK_BUTTON_X,
      CHECK_BUTTON_Y,
      CHECK_BUTTON_WIDTH,
      CHECK_BUTTON_HEIGHT,
      'START',
      () => this.startRound(model),
    );
    this.group.add(startButton.getGroup());
  }

  /**
   * Builds the graph and inputs, then starts the round timer.
   */
  private startRound(model: RadioWaveMinigameScreenModel): void {
    if (this.screen !== 'instructions') return;
    this.screen = 'gameplay';
    this.group.destroyChildren();
    this.correctAnswers = 0;

    const instructions = new Konva.Text({
      x: GRAPH_X,
      y: 10,
      width: GRAPH_WIDTH,
      text: 'SIGNAL: SEARCHING',
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

    this.group.add(instructions);
    this.group.add(timerTrack);
    this.group.add(timerBar);
    this.nextQuestion();
    this.createControls();
    this.startTimer(timerBar, model.config.timeLimitSeconds);

    const checkButton = new ButtonComponent(
      CHECK_BUTTON_X,
      CHECK_BUTTON_Y,
      CHECK_BUTTON_WIDTH,
      CHECK_BUTTON_HEIGHT,
      'SUBMIT',
      () => this.checkAnswer(),
    );

    this.group.add(checkButton.getGroup());
  }

  /**
   * Chooses small whole-number values for the sine equation.
   */
  private generateQuestion(): RadioWaveQuestion {
    return {
      amplitude: Math.floor(Math.random() * 4) + 1,
      frequency: Math.floor(Math.random() * 3) + 1,
      horizontalShift: Math.floor(Math.random() * 5) - 2,
      verticalShift: Math.floor(Math.random() * 5) - 2,
    };
  }

  /**
   * Replaces the target graph and resets the player wave for a new question.
   */
  private nextQuestion(): void {
    const question = this.generateQuestion();
    // Avoid giving the player the exact same question twice in a row.
    if (
      question.amplitude === this.currentQuestion.amplitude &&
      question.frequency === this.currentQuestion.frequency &&
      question.horizontalShift === this.currentQuestion.horizontalShift &&
      question.verticalShift === this.currentQuestion.verticalShift
    ) {
      question.amplitude = (question.amplitude % 4) + 1;
    }
    this.currentQuestion = question;
    this.graph?.getGroup().destroy();
    const graph = new GraphComponent(
      GRAPH_X,
      GRAPH_Y,
      GRAPH_WIDTH,
      GRAPH_HEIGHT,
      this.getXinterval(
        this.currentQuestion.frequency,
        this.currentQuestion.horizontalShift,
      ),
      this.getYinterval(
        this.currentQuestion.amplitude,
        this.currentQuestion.verticalShift,
      ),
    );
    graph.addFunction(
      this.playerEquation(
        this.currentQuestion.amplitude,
        this.currentQuestion.frequency,
        this.currentQuestion.horizontalShift,
        this.currentQuestion.verticalShift,
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

    this.graph = graph;
    this.group.add(graph.getGroup());
    if (this.inputs) {
      this.inputs.amplitude.value = String(DEFAULT_AMPLITUDE);
      this.inputs.frequency.value = String(DEFAULT_FREQUENCY);
      this.inputs.horizontalShift.value = String(DEFAULT_HORIZONTAL_SHIFT);
      this.inputs.verticalShift.value = String(DEFAULT_VERTICAL_SHIFT);
    }
  }

  /**
   * Counts a matching answer and advances without restarting the timer.
   */
  private checkAnswer(): void {
    if (this.screen !== 'gameplay' || !this.inputs) return;
    if (Date.now() >= this.roundEndsAt) {
      this.showResults();
      return;
    }
    const {amplitude, frequency, horizontalShift, verticalShift} = this.inputs;
    const matches =
      Math.abs(amplitude.valueAsNumber - this.currentQuestion.amplitude) <=
        ANSWER_TOLERANCE &&
      Math.abs(frequency.valueAsNumber - this.currentQuestion.frequency) <=
        ANSWER_TOLERANCE &&
      this.matchesHorizontalShift(horizontalShift.valueAsNumber) &&
      Math.abs(
        verticalShift.valueAsNumber - this.currentQuestion.verticalShift,
      ) <= ANSWER_TOLERANCE;
    // Empty or invalid number inputs produce NaN, so they cannot match.
    if (!matches) return;
    this.correctAnswers += 1;
    this.nextQuestion();
  }

  /**
   * Accepts shifts that differ by a whole number of wave periods.
   */
  private matchesHorizontalShift(horizontalShift: number): boolean {
    if (!Number.isFinite(horizontalShift)) return false;
    const period = (2 * Math.PI) / Math.abs(this.currentQuestion.frequency);
    const difference = horizontalShift - this.currentQuestion.horizontalShift;
    const wholePeriods = Math.round(difference / period);
    const remainingShift = difference - wholePeriods * period;
    return Math.abs(remainingShift) <= ANSWER_TOLERANCE;
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
  private startTimer(timerBar: Konva.Rect, timeLimitSeconds: number): void {
    const startTime = Date.now();
    const duration = Math.max(timeLimitSeconds, 1) * 1000;
    this.roundEndsAt = startTime + duration;
    this.timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1 - elapsed / duration);
      timerBar.width((GRAPH_WIDTH - 6) * remaining);

      if (remaining === 0) {
        this.showResults();
      }
    }, 100);
  }

  /**
   * Stops gameplay and displays the final score when time runs out.
   */
  private showResults(): void {
    if (this.screen !== 'gameplay') return;
    this.screen = 'results';
    this.clearRound();
    this.group.destroyChildren();
    this.group.add(
      new Konva.Text({
        x: GRAPH_X,
        y: 150,
        width: GRAPH_WIDTH,
        text: "Time's up!",
        align: 'center',
        fontSize: 32,
        fill: 'white',
      }),
    );
    this.group.add(
      new Konva.Text({
        x: GRAPH_X,
        y: 230,
        width: GRAPH_WIDTH,
        text: `Correct answers: ${this.correctAnswers}`,
        align: 'center',
        fontSize: 24,
        fill: 'white',
      }),
    );
  }

  /**
   * Removes the HTML controls and timer on timeout or view destruction.
   */
  private clearRound(): void {
    window.clearInterval(this.timer);
    this.timer = undefined;
    this.removeControls?.();
    this.removeControls = undefined;
    this.inputs = undefined;
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
    return new Interval(-halfRange, halfRange, 1);
  }

  /**
   * Creates a y-axis range that contains the target wave.
   */
  private getYinterval(amplitude: number, verticalShift: number): Interval {
    // Keep zero in the center so the graph's axis labels line up correctly.
    const halfRange = Math.max(
      5,
      Math.abs(amplitude) + Math.abs(verticalShift) + 1,
    );
    return new Interval(-halfRange, halfRange, 1);
  }

  /**
   * Creates the editable expression beneath the graph.
   */
  private createControls(): void {
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
    this.inputs = {amplitude, frequency, horizontalShift, verticalShift};
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

    const updateWave = (): void => {
      if (!this.graph || this.screen !== 'gameplay') return;
      this.updatePlayerWave(
        this.graph,
        amplitude,
        frequency,
        horizontalShift,
        verticalShift,
      );
    };
    amplitude.addEventListener('input', updateWave);
    frequency.addEventListener('input', updateWave);
    horizontalShift.addEventListener('input', updateWave);
    verticalShift.addEventListener('input', updateWave);
    this.removeControls = () => {
      controls.remove();
      window.removeEventListener('resize', positionControls);
    };
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
    const amplitudeValue = amplitude.valueAsNumber;
    const frequencyValue = frequency.valueAsNumber;
    const horizontalShiftValue = horizontalShift.valueAsNumber;
    const verticalShiftValue = verticalShift.valueAsNumber;
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
    return `${amplitude} * Math.sin(${frequency} * (x - (${horizontalShift}))) + ${verticalShift}`;
  }
}
