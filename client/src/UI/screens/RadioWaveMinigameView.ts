import Konva from 'konva';
import {GraphComponent} from '../../Graphing/GraphComponent';
import {Interval} from '../../Graphing/functions';
import {ButtonComponent, ImageComponent, TextBoxComponent} from '../components';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  FONT_CONTHRAX,
  RADIO_WAVE_IMAGES,
  TEXT_BOX_BORDER_COLOR,
  TEXT_BOX_FILL_COLOR,
  TEXT_COLOR,
} from '../constants';
import {
  RadioWaveMinigameScreenModel,
  RadioWaveQuestion,
  UiAction,
  View,
} from '../types';

// Keep the header beside the portrait window and the graph below it.
const HEADER_X = 180;
const HEADER_WIDTH = 550;
const HEADER_Y = 45;
const HEADER_HEIGHT = 40;
const GRAPH_WIDTH = 660;
const GRAPH_HEIGHT = 215;
const GRAPH_X = (DESIGN_WIDTH - GRAPH_WIDTH) / 2;
const GRAPH_Y = 143;
const TIMER_Y = 102;
const TIMER_HEIGHT = 12;
// The cockpit console begins around y = 377 in the 800 × 500 layout.
const CONTROLS_Y = 386;
const CHECK_BUTTON_WIDTH = 180;
const CHECK_BUTTON_HEIGHT = 36;
const CHECK_BUTTON_X = (DESIGN_WIDTH - CHECK_BUTTON_WIDTH) / 2;
const CHECK_BUTTON_Y = 432;
const START_BUTTON_Y = 410;

const DEFAULT_AMPLITUDE = 1;
const DEFAULT_FREQUENCY = 2;
const DEFAULT_HORIZONTAL_SHIFT = 0;
const DEFAULT_VERTICAL_SHIFT = 0;
const ANSWER_TOLERANCE = 0.05;

/**
 * Displays the instructions, timed round, and results for the minigame.
 */
export class RadioWaveMinigameView implements View {
  private readonly group = new Konva.Group();
  private readonly content = new Konva.Group();
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
  private resultReported = false;
  private readonly correctAnswersForHint: number;
  private screen: 'instructions' | 'gameplay' | 'results' = 'instructions';

  /**
   * Builds the minigame screen.
   */
  constructor(
    private readonly onAction: (action: UiAction) => void,
    model: RadioWaveMinigameScreenModel,
  ) {
    this.correctAnswersForHint = model.config.correctAnswersForHint;
    this.currentQuestion = model.question;
    const frame = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      '/assets/general-nav.png',
    );
    frame.getGroup().listening(false);
    const dishWindow = new Konva.Group({
      x: 49,
      y: 39,
      clip: {x: 0, y: 0, width: 100, height: 80},
      listening: false,
    });
    const dish = new ImageComponent(-14, -5, 128, 96, RADIO_WAVE_IMAGES.dish);
    dishWindow.add(dish.getGroup());
    this.group.add(dishWindow, frame.getGroup(), this.content);
    // UIManager destroys this group when it switches to another view.
    this.group.on('destroy', () => this.clearRound());
    this.showInstructions(model);
  }

  /**
   * Explains the round before the player starts the timer.
   */
  private showInstructions(model: RadioWaveMinigameScreenModel): void {
    const title = new TextBoxComponent(
      HEADER_X,
      HEADER_Y,
      HEADER_WIDTH,
      HEADER_HEIGHT,
      'Match the radio wave',
    ).setFontSize(22);
    const instructions = new TextBoxComponent(
      GRAPH_X,
      145,
      GRAPH_WIDTH,
      178,
      "We're losing our ship signal! Adjust the blue wave to match the white wave.\n\n" +
        'Use y = A sin(B(x - h)) + k, then submit your answer.\n\n' +
        `Match ${model.config.correctAnswersForHint} waves in ${model.config.timeLimitSeconds} seconds to earn a hint.`,
    );
    this.content.add(title.getGroup(), instructions.getGroup());
    const startButton = new ButtonComponent(
      CHECK_BUTTON_X,
      START_BUTTON_Y,
      CHECK_BUTTON_WIDTH,
      CHECK_BUTTON_HEIGHT,
      'START',
      () => this.startRound(model),
    );
    this.content.add(startButton.getGroup());
  }

  /**
   * Builds the graph and inputs, then starts the round timer.
   */
  private startRound(model: RadioWaveMinigameScreenModel): void {
    if (this.screen !== 'instructions') return;
    this.screen = 'gameplay';
    this.content.destroyChildren();
    this.correctAnswers = 0;

    const status = new TextBoxComponent(
      HEADER_X,
      HEADER_Y,
      HEADER_WIDTH,
      HEADER_HEIGHT,
      'SIGNAL: SEARCHING',
    ).setFontSize(20);
    const timerTrack = new Konva.Rect({
      x: HEADER_X,
      y: TIMER_Y,
      width: HEADER_WIDTH,
      height: TIMER_HEIGHT,
      fill: '#7f1d2d',
      stroke: '#f97316',
      strokeWidth: 3,
      cornerRadius: TIMER_HEIGHT / 2,
    });
    const timerBar = new Konva.Rect({
      x: HEADER_X + 3,
      y: TIMER_Y + 3,
      width: HEADER_WIDTH - 6,
      height: TIMER_HEIGHT - 6,
      fill: '#84cc16',
      cornerRadius: (TIMER_HEIGHT - 6) / 2,
    });

    this.content.add(status.getGroup(), timerTrack, timerBar);
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

    this.content.add(checkButton.getGroup());
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
    this.content.add(graph.getGroup());
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
    if (
      !Number.isInteger(horizontalShift.valueAsNumber) ||
      !Number.isInteger(verticalShift.valueAsNumber)
    ) {
      return;
    }
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
      timerBar.width((HEADER_WIDTH - 6) * remaining);

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
    this.content.destroyChildren();
    const addHint = this.correctAnswers >= this.correctAnswersForHint;
    const title = new TextBoxComponent(
      HEADER_X,
      HEADER_Y,
      HEADER_WIDTH,
      HEADER_HEIGHT,
      "Time's up!",
    ).setFontSize(22);
    const score = new TextBoxComponent(
      GRAPH_X,
      156,
      GRAPH_WIDTH,
      68,
      `Correct answers: ${this.correctAnswers}`,
    ).setFontSize(24);
    const outcome = new TextBoxComponent(
      GRAPH_X,
      238,
      GRAPH_WIDTH,
      62,
      addHint
        ? 'Signal restored! Hint reward earned.'
        : 'No hint earned this round.',
    );
    this.content.add(title.getGroup(), score.getGroup(), outcome.getGroup());
    const continueButton = new ButtonComponent(
      CHECK_BUTTON_X,
      CHECK_BUTTON_Y,
      CHECK_BUTTON_WIDTH,
      CHECK_BUTTON_HEIGHT,
      'Go to lesson',
      () => {
        if (this.resultReported) return;
        this.resultReported = true;
        this.onAction({type: 'endMiniGame', addHint});
      },
    );
    this.content.add(continueButton.getGroup());
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
      '1',
    );
    const verticalShift = this.createInput(
      'vertical-shift',
      String(DEFAULT_VERTICAL_SHIFT),
      '1',
    );
    this.inputs = {amplitude, frequency, horizontalShift, verticalShift};
    const controls = document.createElement('div');
    controls.style.position = 'fixed';
    controls.style.display = 'flex';
    controls.style.width = 'max-content';
    controls.style.alignItems = 'center';
    controls.style.gap = '8px';
    controls.style.zIndex = '1';
    controls.style.transformOrigin = 'top center';
    controls.append(
      this.createEquationSymbol(RADIO_WAVE_IMAGES.yEquals, 'y ='),
      amplitude,
      this.createEquationSymbol(RADIO_WAVE_IMAGES.sine, 'sin('),
      frequency,
      this.createEquationSymbol(RADIO_WAVE_IMAGES.xMinus, '(x -'),
      horizontalShift,
      this.createEquationSymbol(RADIO_WAVE_IMAGES.closePlus, ')) +'),
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
      controls.style.transform = `translateX(-50%) scale(${scale})`;
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
    for (const shift of [horizontalShift, verticalShift]) {
      shift.addEventListener('beforeinput', event => {
        if (event.data && !/^-?\d*$/.test(event.data)) {
          event.preventDefault();
        }
      });
      shift.addEventListener('paste', event => {
        const text = event.clipboardData?.getData('text').trim();
        if (text && !/^-?\d+$/.test(text)) {
          event.preventDefault();
        }
      });
      shift.addEventListener('input', updateWave);
    }
    this.removeControls = () => {
      controls.remove();
      window.removeEventListener('resize', positionControls);
    };
  }

  /** Places the artwork in a compact slot, cropping its transparent margins. */
  private createEquationSymbol(url: string, text: string): HTMLElement {
    const slot = document.createElement('span');
    slot.style.position = 'relative';
    slot.style.width = '66px';
    slot.style.height = '36px';
    slot.style.overflow = 'hidden';

    const image = document.createElement('img');
    image.src = url;
    image.alt = text;
    image.style.position = 'absolute';
    image.style.left = '50%';
    image.style.top = '50%';
    image.style.width = '116px';
    image.style.transform = 'translate(-50%, -50%)';
    slot.append(image);
    return slot;
  }

  /**
   * Creates one numeric input for the wave expression.
   */
  private createInput(
    name: string,
    value: string,
    step = '0.1',
  ): HTMLInputElement {
    const input = document.createElement('input');
    input.name = name;
    input.ariaLabel = name.replaceAll('-', ' ');
    input.type = 'number';
    input.step = step;
    input.value = value;
    input.style.width = '65px';
    input.style.padding = '6px 8px';
    input.style.border = `1px solid ${TEXT_BOX_BORDER_COLOR}`;
    input.style.borderRadius = '4px';
    input.style.backgroundColor = TEXT_BOX_FILL_COLOR;
    input.style.color = TEXT_COLOR;
    input.style.fontFamily = FONT_CONTHRAX;
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
      !Number.isInteger(horizontalShiftValue) ||
      !Number.isInteger(verticalShiftValue)
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
