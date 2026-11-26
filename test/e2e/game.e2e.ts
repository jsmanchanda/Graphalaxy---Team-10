import {test, expect, type Page} from '@playwright/test';
import type Konva from 'konva';
import {randomUUID} from 'node:crypto';
import type {
  NextQuestion,
  Planet,
  PlanetSummary,
  QuestionTask,
} from '@graphalaxy/shared';
import {PLANETS} from '../../server/src/db/seed';
import {
  DEFAULT_ALIEN_IMAGE,
  PRELOAD_IMAGES,
  SETTINGS_ICON_IMAGE,
} from '../../client/src/UI/constants';
import {
  INSTRUCTIONS_TEXT,
  NAV_ALIEN_HELP_TEXT,
} from '../../client/src/UI/instructions';

interface TestPlanet extends Planet {
  username: string;
  userId: number;
  questionCount: number;
}

/** Reads the real Konva scene because canvas text is not a DOM locator. */
async function screenTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const konva = (window as unknown as Partial<Record<'Konva', typeof Konva>>)
      .Konva;
    return (
      konva?.stages.flatMap(stage =>
        stage
          .find('Text')
          .filter(node => node.isVisible())
          .map(node => (node as Konva.Text).text()),
      ) ?? []
    );
  });
}

/** Clicks a rendered label using its actual scaled canvas position. */
async function clickLabel(page: Page, label: string): Promise<void> {
  await expect.poll(() => screenTexts(page)).toContain(label);
  const center = await page.evaluate(text => {
    const konva = (window as unknown as Record<'Konva', typeof Konva>).Konva;
    const node = konva.stages
      .flatMap(stage => stage.find('Text'))
      .find(
        item =>
          item.isVisible() &&
          (item as Konva.Text).text() === text &&
          !!item.getParent()?.eventListeners.click?.length,
      );
    if (!node) throw new Error(`Missing clickable canvas label: ${text}`);
    const box = node.getClientRect();
    return {x: box.x + box.width / 2, y: box.y + box.height / 2};
  }, label);
  await waitForCanvas(page);
  await page.mouse.click(center.x, center.y);
}

/** Waits for Konva's scheduled hit-canvas draw before a real pointer event. */
async function waitForCanvas(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

/** Finds a visible, loaded image drawn from the given asset path. */
async function imageBounds(page: Page, path: string) {
  return page.evaluate(pathname => {
    const konva = (window as unknown as Partial<Record<'Konva', typeof Konva>>)
      .Konva;
    const found = konva?.stages
      .flatMap(stage => stage.find('Image'))
      .find(node => {
        const image = (node as Konva.Image).image();
        return (
          node.isVisible() &&
          image instanceof HTMLImageElement &&
          new URL(image.src).pathname === pathname
        );
      });
    return found?.getClientRect() ?? null;
  }, path);
}

/** Finds a visible, loaded planet image without depending on hover text. */
async function planetBounds(page: Page, planetId: number) {
  return imageBounds(page, `/assets/planet-${planetId}.png`);
}

/** Clicks the middle of a visible image drawn from the given asset path. */
async function clickImage(page: Page, path: string): Promise<void> {
  await expect.poll(() => imageBounds(page, path)).not.toBeNull();
  const box = await imageBounds(page, path);
  if (!box) throw new Error(`Missing image: ${path}`);
  await waitForCanvas(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Confirms that the map is rendered rather than the old placeholder end screen. */
async function expectNavigation(page: Page): Promise<void> {
  await expect.poll(() => planetBounds(page, 0)).not.toBeNull();
  await expect.poll(() => planetBounds(page, 1)).not.toBeNull();
}

/**
 * Presses Start on the title, reads past the instructions that come before
 * the map after every login, and waits for the map.
 */
async function startGame(page: Page): Promise<void> {
  await clickLabel(page, 'Start');
  await expect.poll(() => screenTexts(page)).toContain(INSTRUCTIONS_TEXT);
  await clickLabel(page, "Let's go!");
  await expectNavigation(page);
}

/** Logs in with real keyboard input and chooses an unlocked planet on the map. */
async function openGame(
  page: Page,
  username = `e2e-${randomUUID().slice(0, 16)}`,
): Promise<TestPlanet> {
  await page.goto('/');
  await expect.poll(() => screenTexts(page)).toContain('Type your username');
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.keyboard.type(username);
  const login = page.waitForResponse(
    response =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/users'),
  );
  const summaries = page.waitForResponse(
    response =>
      /\/api\/users\/\d+\/planets$/.test(response.url()) &&
      response.status() === 200,
  );
  await clickLabel(page, 'Log In');
  const loginResponse = await login;
  expect(loginResponse.status()).toBe(200);
  const player = await loginResponse.json();
  const planets: PlanetSummary[] = await (await summaries).json();
  const summary = planets.find(
    planet => planet.unlocked && planet.questionCount > 0,
  );
  if (!summary) throw new Error('No unlocked seeded planet with questions');
  await startGame(page);
  await expect.poll(() => planetBounds(page, summary.planetId)).not.toBeNull();
  const box = await planetBounds(page, summary.planetId);
  if (!box) throw new Error('Selected planet not rendered');
  const loaded = page.waitForResponse(response =>
    response
      .url()
      .endsWith(`/users/${player.userId}/planets/${summary.planetId}`),
  );
  await waitForCanvas(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const response = await loaded;
  expect(response.status()).toBe(200);
  const planet: Planet = await response.json();
  expect(planet.planetId).toBe(summary.planetId);
  expect(planet.tasks.length).toBeGreaterThan(0);
  expect(planet.tasks.every(task => task.type === 'Reading')).toBe(true);
  return {
    ...planet,
    username,
    userId: player.userId,
    questionCount: summary.questionCount,
  };
}

/** The skip buttons on the asteroid and radio minigame select screens. */
const MINIGAME_SKIP_LABELS = ['Go around', 'Skip'];

/** Enters the selected planet by skipping whichever minigame it offers. */
async function enterLesson(page: Page, planet: Planet): Promise<void> {
  // GameManager offers the asteroid or the radio minigame at random
  let skip: string | undefined;
  await expect
    .poll(async () => {
      const texts = await screenTexts(page);
      skip = MINIGAME_SKIP_LABELS.find(label => texts.includes(label));
      return skip;
    })
    .toBeDefined();
  if (!skip) throw new Error('Missing minigame skip button');
  await clickLabel(page, skip);
  await expect
    .poll(() => screenTexts(page))
    .toContain(`Welcome to ${planet.name}!`);
}

/** Waits for the real next-question response caused by a visible button. */
async function nextQuestion(page: Page, label: string): Promise<NextQuestion> {
  const loaded = page.waitForResponse(
    response =>
      response.url().endsWith('/questions/next') &&
      response.request().method() === 'GET',
  );
  await clickLabel(page, label);
  const response = await loaded;
  expect(response.status()).toBe(200);
  return response.json();
}

/** Moves through readings, then observes the first dynamically loaded question. */
async function reachFirstQuestion(
  page: Page,
  planet: Planet,
): Promise<QuestionTask> {
  await enterLesson(page, planet);
  for (const task of planet.tasks) {
    expect(task.type).toBe('Reading');
    if (task.type !== 'Reading') throw new Error('Expected readings only');
    await clickLabel(page, 'Next');
    await expect.poll(() => screenTexts(page)).toContain(task.text);
  }
  const next = await nextQuestion(page, 'Next');
  if (!next.question) throw new Error('Seed has no unanswered questions');
  const question = next.question;
  await expect.poll(() => screenTexts(page)).toContain(question.prompt);
  return {type: 'Question', question};
}

/** Uses the production seed as expected data; every answer is graded by the server. */
function correctIndex(planet: Planet, task: QuestionTask): number {
  const seed = PLANETS.find(item => item.name === planet.name)?.questions.find(
    question => question.prompt === task.question.prompt,
  );
  if (!seed) throw new Error('Question missing from production seed');
  // Options arrive shuffled, so find the correct one by its text.
  const texts = task.question.options.map(option => option.text);
  expect([...texts].sort()).toEqual([...seed.options].sort());
  return texts.indexOf(seed.options[seed.correct]);
}

/** Completes the remaining real questions and verifies the final persisted score. */
async function finishPlanet(
  page: Page,
  planet: TestPlanet,
  first: QuestionTask,
  correctBefore = 0,
  answeredBefore = 0,
): Promise<void> {
  let task: QuestionTask | null = first;
  let correct = correctBefore;
  let answered = answeredBefore;
  const ids = new Set<number>();
  while (task) {
    const current = task;
    expect(ids.has(current.question.questionId)).toBe(false);
    ids.add(current.question.questionId);
    await expect
      .poll(() => screenTexts(page))
      .toContain(current.question.prompt);
    const response = await answer(page, current, correctIndex(planet, current));
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.questionId).toBe(current.question.questionId);
    expect(result.correct).toBe(true);
    expect(result.correctOption.optionId).toBe(
      current.question.options[correctIndex(planet, current)].optionId,
    );
    correct++;
    answered++;
    await expect.poll(() => screenTexts(page)).toContain('Correct!');
    const next = await nextQuestion(page, 'Ok');
    expect(next.progress).toMatchObject({
      planetId: planet.planetId,
      correctCount: correct,
      questionCount: planet.questionCount,
      completionPct: correct / planet.questionCount,
      status: correct === planet.questionCount ? 'peaceful' : 'hostile',
    });
    task = next.question ? {type: 'Question', question: next.question} : null;
  }
  expect(answered).toBe(planet.questionCount);
  await expect.poll(() => screenTexts(page)).toContain('Redo Planet');
  await expect
    .poll(() => screenTexts(page))
    .toContain(
      `You answered ${correct} of ${planet.questionCount} questions correctly.\n ` +
        (correct === planet.questionCount
          ? `${planet.name} is now peaceful!`
          : `${planet.name} is still hostile. Redo the planet to try again.`),
    );
}

/** Selects and confirms an option, then reads the real grading response. */
async function answer(page: Page, question: QuestionTask, optionIndex: number) {
  await clickLabel(page, question.question.options[optionIndex].text);
  const response = page.waitForResponse(
    result =>
      result.request().method() === 'POST' &&
      result
        .url()
        .endsWith(`/questions/${question.question.questionId}/answer`),
  );
  await clickLabel(page, 'Confirm');
  return response;
}

test('loads the real game and supports reading navigation in both directions', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const planet = await openGame(page);
  await enterLesson(page, planet);
  await clickLabel(page, 'Next');
  const reading = planet.tasks[0];
  expect(reading.type).toBe('Reading');
  if (reading.type !== 'Reading') throw new Error('Expected a reading');
  await expect.poll(() => screenTexts(page)).toContain(reading.text);
  await clickLabel(page, 'back');
  await expect
    .poll(() => screenTexts(page))
    .toContain(`Welcome to ${planet.name}!`);
  expect(errors).toEqual([]);
});

test('shows the instructions before the map, repeats them from the alien, and logs out from settings', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect.poll(() => screenTexts(page)).toContain('Type your username');
  await page.keyboard.type(`help-${randomUUID().slice(0, 16)}`);
  await clickLabel(page, 'Log In');

  // Start shows the instructions first; the map comes after
  await clickLabel(page, 'Start');
  await expect.poll(() => screenTexts(page)).toContain(INSTRUCTIONS_TEXT);
  expect(await planetBounds(page, 0)).toBeNull();
  await clickLabel(page, "Let's go!");
  await expectNavigation(page);

  // The alien's bubble is closed until the alien is clicked, and toggles
  expect(await screenTexts(page)).not.toContain(NAV_ALIEN_HELP_TEXT);
  await clickImage(page, DEFAULT_ALIEN_IMAGE);
  await expect.poll(() => screenTexts(page)).toContain(NAV_ALIEN_HELP_TEXT);
  await clickImage(page, DEFAULT_ALIEN_IMAGE);
  await expect.poll(() => screenTexts(page)).not.toContain(NAV_ALIEN_HELP_TEXT);

  // The gear opens the settings, and Back returns to the map
  await clickImage(page, SETTINGS_ICON_IMAGE);
  await expect.poll(() => screenTexts(page)).toContain('Log Out');
  await clickLabel(page, 'Back');
  await expectNavigation(page);

  // Logging out returns to the login screen
  await clickImage(page, SETTINGS_ICON_IMAGE);
  await clickLabel(page, 'Log Out');
  await expect
    .poll(() => screenTexts(page))
    .toEqual(expect.arrayContaining(['Type your username', 'Logged out.']));
  expect(errors).toEqual([]);
});

test('plays the complete seeded planet with real server grading and returns to navigation', async ({
  page,
}) => {
  const planet = await openGame(page);
  // An attempt asks 5 questions, fewer than the planet has.
  const seeded = PLANETS.find(item => item.name === planet.name);
  expect(planet.questionCount).toBe(5);
  expect(seeded?.questions.length).toBeGreaterThan(planet.questionCount);
  const first = await reachFirstQuestion(page, planet);
  await finishPlanet(page, planet, first);
  await clickLabel(page, 'Ok');
  await expectNavigation(page);
  const summaries = await page.request.get(
    `/api/users/${planet.userId}/planets`,
  );
  expect(summaries.status()).toBe(200);
  const persisted: PlanetSummary[] = await summaries.json();
  expect(
    persisted.find(item => item.planetId === planet.planetId),
  ).toMatchObject({
    status: 'peaceful',
    correctCount: planet.questionCount,
    completionPct: 1,
  });
});

test('shows wrong feedback, resumes after explicit login, and retries through confirmed planet reset', async ({
  page,
}) => {
  const planet = await openGame(page);
  const question = await reachFirstQuestion(page, planet);
  const response = await answer(
    page,
    question,
    (correctIndex(planet, question) + 1) % question.question.options.length,
  );
  expect(response.status()).toBe(200);
  expect((await response.json()).correct).toBe(false);
  await expect.poll(() => screenTexts(page)).toContain('Incorrect, nice try');
  const again = await openGame(page, planet.username);
  expect(again.userId).toBe(planet.userId);
  const second = await reachFirstQuestion(page, again);
  // Questions are shuffled; the one answered wrong is not asked again.
  expect(second.question.questionId).not.toBe(question.question.questionId);
  await finishPlanet(page, again, second, 0, 1);
  const resets: string[] = [];
  page.on('request', request => {
    if (request.method() === 'DELETE' && request.url().endsWith('/progress')) {
      resets.push(request.url());
    }
  });
  await clickLabel(page, 'Redo Planet');
  await clickLabel(page, 'Cancel');
  await expect.poll(() => screenTexts(page)).toContain('Redo Planet');
  expect(resets).toEqual([]);
  await clickLabel(page, 'Redo Planet');
  const reset = page.waitForResponse(
    result =>
      result.request().method() === 'DELETE' &&
      result.url().endsWith('/progress'),
  );
  const next = page.waitForResponse(result =>
    result.url().endsWith('/questions/next'),
  );
  await clickLabel(page, 'Confirm');
  expect((await reset).status()).toBe(200);
  expect(await (await reset).json()).toMatchObject({
    correctCount: 0,
    completionPct: 0,
    status: 'hostile',
  });
  const restarted: NextQuestion = await (await next).json();
  // After a reset every question can be asked again, in a new shuffled order.
  if (!restarted.question) throw new Error('Reset planet has no question');
  const first: QuestionTask = {type: 'Question', question: restarted.question};
  expect(resets).toHaveLength(1);
  await expect.poll(() => screenTexts(page)).toContain(first.question.prompt);
  const right = await answer(page, first, correctIndex(planet, first));
  expect(right.status()).toBe(200);
  expect((await right.json()).correct).toBe(true);
  await expect.poll(() => screenTexts(page)).toContain('Correct!');
});

test('shows the same question and option order after logging in again', async ({
  page,
}) => {
  const planet = await openGame(page);
  const before = await reachFirstQuestion(page, planet);
  const again = await openGame(page, planet.username);
  const after = await reachFirstQuestion(page, again);
  // Same question ID, prompt, and options in the same order.
  expect(after.question).toEqual(before.question);
});

test('gives different players different first questions', async ({request}) => {
  const firstQuestionIds = new Set<number>();
  for (let i = 0; i < 10; i++) {
    const login = await request.post('/api/users', {
      data: {username: `e2e-${randomUUID().slice(0, 16)}`},
    });
    expect(login.status()).toBe(200);
    const player = await login.json();
    const next = await request.get(
      `/api/users/${player.userId}/planets/1/questions/next`,
    );
    expect(next.status()).toBe(200);
    const body: NextQuestion = await next.json();
    if (!body.question) throw new Error('Planet 1 has no questions');
    firstQuestionIds.add(body.question.questionId);
  }
  // With 12 questions, 10 players all getting the same first one is about
  // 1 in 10^10, so this does not fail by chance.
  expect(firstQuestionIds.size).toBeGreaterThan(1);
});

test('selection alone never submits and changing selection submits the final option', async ({
  page,
}) => {
  const planet = await openGame(page);
  const question = await reachFirstQuestion(page, planet);
  const submissions: string[] = [];
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().endsWith('/answer')) {
      submissions.push(req.postData() ?? '');
    }
  });
  await clickLabel(page, 'Confirm');
  await clickLabel(page, question.question.options[0].text);
  await expect
    .poll(() => screenTexts(page))
    .toContain(question.question.prompt);
  expect(submissions).toEqual([]);
  const response = await answer(page, question, 1);
  expect(response.status()).toBe(200);
  expect(submissions).toEqual([
    JSON.stringify({optionId: question.question.options[1].optionId}),
  ]);
});

test('ignores a second confirmation while the real answer request is pending', async ({
  page,
}) => {
  const planet = await openGame(page);
  const question = await reachFirstQuestion(page, planet);
  let release = () => {};
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let requests = 0;
  await page.route('**/questions/*/answer', async route => {
    requests++;
    await gate;
    await route.continue();
  });
  try {
    await clickLabel(page, question.question.options[0].text);
    await clickLabel(page, 'Confirm');
    await expect.poll(() => requests).toBe(1);
    await clickLabel(page, 'Confirm');
    const response = page.waitForResponse(result =>
      result.url().endsWith('/answer'),
    );
    release();
    expect((await response).status()).toBe(200);
    await expect
      .poll(async () =>
        (await screenTexts(page)).some(
          text => text === 'Correct!' || text === 'Incorrect, nice try',
        ),
      )
      .toBe(true);
    expect(requests).toBe(1);
  } finally {
    release();
  }
});

test('does not replace the current reading with a late answer response', async ({
  page,
}) => {
  const planet = await openGame(page);
  const question = await reachFirstQuestion(page, planet);
  let release = () => {};
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let pending = false;
  await page.route('**/questions/*/answer', async route => {
    pending = true;
    await gate;
    await route.continue();
  });
  try {
    await clickLabel(page, question.question.options[0].text);
    await clickLabel(page, 'Confirm');
    await expect.poll(() => pending).toBe(true);
    await clickLabel(page, 'Back To Lesson');
    const reading = planet.tasks.filter(task => task.type === 'Reading').at(-1);
    if (!reading || reading.type !== 'Reading') {
      throw new Error('Missing reading');
    }
    await expect.poll(() => screenTexts(page)).toContain(reading.text);
    const response = page.waitForResponse(result =>
      result.url().endsWith('/answer'),
    );
    release();
    expect((await response).status()).toBe(200);
    // Consume the body and allow the application's fetch promise to settle.
    await (await response).finished();
    await page.evaluate(
      () =>
        new Promise<void>(resolve => requestAnimationFrame(() => resolve())),
    );
    await expect.poll(() => screenTexts(page)).toContain(reading.text);
    expect(await screenTexts(page)).not.toContain('Correct!');
    expect(await screenTexts(page)).not.toContain('Incorrect, nice try');
  } finally {
    release();
  }
});

test('shows a connection failure and recovers when login is retried', async ({
  page,
}) => {
  await page.route('**/api/users', route => route.abort('failed'));
  await page.goto('/');
  await expect.poll(() => screenTexts(page)).toContain('Type your username');
  const username = `offline-${randomUUID().slice(0, 16)}`;
  await page.keyboard.type(username);
  await clickLabel(page, 'Log In');
  await expect
    .poll(() => screenTexts(page))
    .toContain('Server offline. Try again.');
  await page.unroute('**/api/users');
  const login = page.waitForResponse(
    result =>
      result.request().method() === 'POST' &&
      result.url().endsWith('/api/users'),
  );
  await clickLabel(page, 'Log In');
  expect((await login).status()).toBe(200);
  await expect.poll(() => screenTexts(page)).toContain('Start');
  await startGame(page);
});

test('shows submission failure instead of claiming success when the request fails', async ({
  page,
}) => {
  const planet = await openGame(page);
  const question = await reachFirstQuestion(page, planet);
  await page.route('**/questions/*/answer', route => route.abort('failed'));
  await clickLabel(page, question.question.options[0].text);
  await clickLabel(page, 'Confirm');
  await expect
    .poll(() => screenTexts(page))
    .toContain('Server offline. Press Ok to try again.');
});

test('keeps canvas controls usable after resizing to a smaller viewport', async ({
  page,
}) => {
  await page.setViewportSize({width: 640, height: 480});
  const planet = await openGame(page);
  const question = await reachFirstQuestion(page, planet);
  const response = await answer(page, question, 0);
  expect(response.status()).toBe(200);
  await expect
    .poll(async () =>
      (await screenTexts(page)).some(
        text => text === 'Correct!' || text === 'Incorrect, nice try',
      ),
    )
    .toBe(true);
});

test('preloads every image once at startup', async ({page}) => {
  // Image paths and API calls, in the order the browser requested them
  const requests: string[] = [];
  const failedImages: string[] = [];
  page.on('request', request => {
    const {pathname} = new URL(request.url());
    if (pathname.startsWith('/assets/') && request.resourceType() === 'image') {
      requests.push(pathname);
    } else if (pathname.startsWith('/api/')) {
      requests.push('api');
    }
  });
  page.on('response', response => {
    if (response.request().resourceType() === 'image' && !response.ok()) {
      failedImages.push(response.url());
    }
  });

  // Visit screens that draw the background, planets, and an alien
  const planet = await openGame(page);
  await reachFirstQuestion(page, planet);

  const images = requests.filter(entry => entry !== 'api');
  // Every listed image was downloaded exactly once, and nothing else was
  expect([...images].sort()).toEqual([...PRELOAD_IMAGES].sort());
  // ...and all of them before the first API call (logging in), so no screen
  // had to wait for an image
  expect(requests.lastIndexOf(images[images.length - 1])).toBeLessThan(
    requests.indexOf('api'),
  );
  expect(failedImages).toEqual([]);
});
