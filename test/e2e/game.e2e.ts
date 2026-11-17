import {test, expect, type Page} from '@playwright/test';
import type Konva from 'konva';
import type {Planet, QuestionTask} from '@graphalaxy/shared';

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

/** Finds a visible, loaded planet image without depending on hover text. */
async function planetBounds(page: Page, planetId: number) {
  return page.evaluate(id => {
    const konva = (window as unknown as Partial<Record<'Konva', typeof Konva>>)
      .Konva;
    const planet = konva?.stages
      .flatMap(stage => stage.find('Image'))
      .find(node => {
        const image = (node as Konva.Image).image();
        return (
          node.isVisible() &&
          image instanceof HTMLImageElement &&
          new URL(image.src).pathname === `/assets/planet-${id}.png`
        );
      });
    return planet?.getClientRect() ?? null;
  }, planetId);
}

/** Confirms that the map is rendered rather than the old placeholder end screen. */
async function expectNavigation(page: Page): Promise<void> {
  await expect.poll(() => planetBounds(page, 0)).not.toBeNull();
  await expect.poll(() => planetBounds(page, 1)).not.toBeNull();
}

/** Follows Start, the demo planet, and the supported Go to lesson choice. */
async function enterLesson(page: Page, planet: Planet): Promise<void> {
  await clickLabel(page, 'Start');
  await expectNavigation(page);
  const box = await planetBounds(page, planet.planetId);
  if (!box) throw new Error(`Missing navigation planet ${planet.planetId}`);
  await waitForCanvas(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect
    .poll(() => screenTexts(page))
    .toEqual(
      expect.arrayContaining([
        'Do you want to play minigame?',
        'Asteroid Defense',
        'Radio Wave',
        'Go to lesson',
      ]),
    );
  await clickLabel(page, 'Go to lesson');
  await expect.poll(() => screenTexts(page)).toContain(planet.name);
}

/** Starts through the real login, API client, session, and screen bootstrap. */
async function openGame(page: Page): Promise<Planet> {
  const loaded = page.waitForResponse(
    response =>
      /\/api\/users\/\d+\/planets\/1$/.test(response.url()) &&
      response.status() === 200,
  );
  await page.goto('/');
  const response = await loaded;
  const planet: Planet = await response.json();
  await expect.poll(() => screenTexts(page)).toContain('Graphalaxy');
  await expect(page.locator('canvas').first()).toBeVisible();
  return planet;
}

/** Enters through navigation and moves through readings using real canvas buttons. */
async function reachFirstQuestion(
  page: Page,
  planet: Planet,
): Promise<QuestionTask> {
  await enterLesson(page, planet);
  for (const task of planet.tasks) {
    await clickLabel(page, 'Next');
    if (task.type === 'Question') {
      await expect
        .poll(() => screenTexts(page))
        .toContain(task.question.prompt);
      return task;
    }
    await expect.poll(() => screenTexts(page)).toContain(task.text);
  }
  throw new Error('Seed has no questions');
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
  await expect.poll(() => screenTexts(page)).toContain(planet.name);
  expect(errors).toEqual([]);
});

test('plays the complete seeded planet with real server grading and returns to navigation', async ({
  page,
}) => {
  const planet = await openGame(page);
  await reachFirstQuestion(page, planet);
  for (const task of planet.tasks) {
    if (task.type !== 'Question') continue;
    await expect.poll(() => screenTexts(page)).toContain(task.question.prompt);
    // Any selected option must agree with the server verdict shown on screen.
    const response = await answer(page, task, 0);
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.questionId).toBe(task.question.questionId);
    expect(result.correctOption.optionId).toBeGreaterThan(0);
    await expect
      .poll(() => screenTexts(page))
      .toContain(result.correct ? 'Correct' : 'Wrong');
    await clickLabel(page, 'Ok');
  }
  await expectNavigation(page);
});

test('shows wrong feedback, allows a retry, and reuses the account after reload', async ({
  page,
}) => {
  const planet = await openGame(page);
  const question = await reachFirstQuestion(page, planet);
  // The real API releases the correct option only after a valid submission.
  const firstResponse = await answer(page, question, 0);
  const first = await firstResponse.json();
  await expect
    .poll(() => screenTexts(page))
    .toContain(first.correct ? 'Correct' : 'Wrong');
  const account = await page.request.post('/api/users', {
    data: {username: 'demo'},
  });
  const originalPlayer = await account.json();
  const relogin = page.waitForResponse(
    response =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/users'),
  );
  await page.reload();
  expect((await (await relogin).json()).userId).toBe(originalPlayer.userId);
  await expect.poll(() => screenTexts(page)).toContain('Graphalaxy');
  await reachFirstQuestion(page, planet);
  const wrongIndex = question.question.options.findIndex(
    option => option.optionId !== first.correctOption.optionId,
  );
  await answer(page, question, wrongIndex);
  await expect.poll(() => screenTexts(page)).toContain('Wrong');
  await page.reload();
  await expect.poll(() => screenTexts(page)).toContain('Graphalaxy');
  await reachFirstQuestion(page, planet);
  const rightIndex = question.question.options.findIndex(
    option => option.optionId === first.correctOption.optionId,
  );
  const response = await answer(page, question, rightIndex);
  expect((await response.json()).correct).toBe(true);
  await expect.poll(() => screenTexts(page)).toContain('Correct');
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
          text => text === 'Correct' || text === 'Wrong',
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
    expect(await screenTexts(page)).not.toContain('Correct');
    expect(await screenTexts(page)).not.toContain('Wrong');
  } finally {
    release();
  }
});

test('shows a connection failure and recovers when Start is pressed', async ({
  page,
}) => {
  await page.route('**/api/users', route => route.abort('failed'));
  await page.goto('/');
  await expect
    .poll(() => screenTexts(page))
    .toContain('Server offline. Press Start to retry.');
  await page.unroute('**/api/users');
  await clickLabel(page, 'Start');
  await expect.poll(() => screenTexts(page)).toContain('Graphalaxy');
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
    .toContain("We couldn't confirm your answer.");
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
        text => text === 'Correct' || text === 'Wrong',
      ),
    )
    .toBe(true);
});
