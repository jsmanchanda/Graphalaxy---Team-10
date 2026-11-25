import {createApp} from './app';
import {createDataWriter} from './data-writer';
import {openDb} from './db/connection';
import {migrate} from './db/migrate';
import {seed} from './db/seed';
import {ProgressManager} from './progress-manager/ProgressManager';
import shuffle from 'lodash/shuffle';
import {QuestionManager} from './question-manager/QuestionManager';
import {HintManager} from './hint-manager/hintmanager';

const PORT = Number(process.env.PORT ?? 3000);

const db = openDb();
migrate(db);
seed(db);

const dataWriter = createDataWriter(db);

// Each attempt at a planet asks this many of its questions, picked at random.
// Both managers need the same number.
const QUESTIONS_PER_ATTEMPT = 5;

// Progress Manager subscribes to Question Manager's first-correct-answer event.
const progress = new ProgressManager(dataWriter, QUESTIONS_PER_ATTEMPT);
const questions = new QuestionManager(
  dataWriter,
  progress,
  shuffle,
  QUESTIONS_PER_ATTEMPT,
);
const hints = new HintManager(dataWriter);

createApp({questions, progress, hints, dataWriter}).listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
