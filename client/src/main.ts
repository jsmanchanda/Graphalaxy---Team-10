/**
 * Main entry point for the client-side demo application.
 * @file Read-only demo wiring: backend -> SessionCache -> screens.
 *
 * Needs the API running on :3000 (`npm run dev -w server`) and Vite on :5173
 * (`npm run dev -w client`). Vite proxies /api to the server.
 *
 * Writes are not supported: answers are graded in the browser from the
 * `correct` index the server sends, and nothing is saved. The only POST is
 * login, which gets or creates the demo user to obtain a userId.
 */
import {SessionCache} from './Frontend/SessionCache';
import {QuestionTask} from './Frontend/SessionCacheModels';
import type {Planet} from './Frontend/SessionCacheModels';
import * as screenModelMaker from './Frontend/screenModelMaker';
import {FONT_CONTHRAX, FONT_PLANET_KOSMOS} from './UI/constants';
import type {ScreenModel, UiAction} from './UI/types';
import {UiManager} from './UI/UIManager';

const DEMO_USERNAME = 'demo';
const DEMO_PLANET_ID = 1;
const INTRO = -1; // taskIndex value while the lesson intro is showing

type Phase = 'title' | 'intro' | 'task' | 'questionResult' | 'lessonResult';

/** Drives the title -> intro -> tasks -> results flow from backend data. */
class DemoFlow {
  private readonly ui = new UiManager('container', action => {
    void this.handleAction(action);
  });
  private readonly session = new SessionCache();
  private phase: Phase = 'title';
  private taskIndex = INTRO;
  // taskIndex -> whether the latest answer was right (local only, not saved)
  private readonly results = new Map<number, boolean>();

  /** Shows the title screen. */
  start(): void {
    this.showTitle('Graphalaxy');
  }

  private showTitle(title: string): void {
    this.phase = 'title';
    this.ui.displayScreen({type: 'title', title});
  }

  private get planet(): Planet {
    if (!this.session.currentPlanet) throw new Error('Planet not loaded');
    return this.session.currentPlanet;
  }

  private async handleAction(action: UiAction): Promise<void> {
    switch (action.type) {
      case 'start':
        await this.begin();
        break;
      case 'answer':
        this.answer(action.option);
        break;
      case 'next':
        this.next();
        break;
      case 'back':
        this.back();
        break;
    }
  }

  /** Logs in, loads the planet from the API, and shows the lesson intro. */
  private async begin(): Promise<void> {
    try {
      await this.session.login(DEMO_USERNAME);
      await this.session.loadPlanet(DEMO_PLANET_ID);
    } catch (error) {
      console.error(error);
      this.showTitle('Server offline'); // Start retries the load
      return;
    }
    this.results.clear();
    this.showIntro();
  }

  private showIntro(): void {
    this.phase = 'intro';
    this.taskIndex = INTRO;
    this.ui.displayScreen(
      screenModelMaker.makeLessonIntroScreen(
        this.planet.name,
        this.planet.introText,
      ),
    );
  }

  /** Shows the current task, or the lesson result once tasks run out. */
  private showTask(): void {
    const {tasks} = this.planet;
    if (this.taskIndex >= tasks.length) {
      this.phase = 'lessonResult';
      this.ui.displayScreen(this.lessonResultScreen());
      return;
    }
    this.phase = 'task';
    const task = tasks[this.taskIndex];
    let screen: ScreenModel;
    if (task instanceof QuestionTask) {
      // Built here because screenModelMaker.questionTaskToQuestionScreen emits
      // option1..option4, while QuestionScreenView reads question.options[i].
      screen = {type: 'question', question: task.toType()};
    } else {
      screen = screenModelMaker.taskToScreen(task);
    }
    this.ui.displayScreen(screen);
  }

  private answer(option: number): void {
    const task = this.planet.tasks[this.taskIndex];
    if (this.phase !== 'task' || !(task instanceof QuestionTask)) return;
    const correct = option === task.correct;
    this.results.set(this.taskIndex, correct);
    this.phase = 'questionResult';
    this.ui.displayScreen(screenModelMaker.makeQuestionResultScreen(correct));
  }

  private next(): void {
    switch (this.phase) {
      case 'intro':
        this.taskIndex = 0;
        this.showTask();
        break;
      case 'task':
      case 'questionResult':
        this.taskIndex++;
        this.showTask();
        break;
      case 'lessonResult':
        this.showTitle('Graphalaxy');
        break;
    }
  }

  private back(): void {
    if (this.phase === 'intro') {
      this.showTitle('Graphalaxy');
    } else if (this.phase === 'task') {
      this.taskIndex--;
      if (this.taskIndex < 0) this.showIntro();
      else this.showTask();
    }
  }

  private lessonResultScreen(): ScreenModel {
    const total = this.planet.tasks.filter(
      t => t instanceof QuestionTask,
    ).length;
    const right = [...this.results.values()].filter(Boolean).length;
    return {
      type: 'lessonResult',
      result: `${this.planet.name}: you got ${right}/${total} questions right.`,
    };
  }
}

// Load fonts before drawing anything, since Konva won't redraw when they arrive
const fonts = [
  new FontFace(FONT_PLANET_KOSMOS, 'url(/assets/fonts/Planet-Kosmos.ttf)'),
  new FontFace(FONT_CONTHRAX, 'url(/assets/fonts/Conthrax.otf)'),
];

Promise.all(fonts.map(f => f.load()))
  .then(loaded => {
    loaded.forEach(f => document.fonts.add(f));
    new DemoFlow().start();
  })
  .catch(err => console.error('Font failed to load:', err));
