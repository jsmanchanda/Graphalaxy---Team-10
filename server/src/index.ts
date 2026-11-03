import {createApp} from './app';
import {createDataWriter} from './data-writer';
import {openDb} from './db/connection';
import {migrate} from './db/migrate';
import {seed} from './db/seed';
import {QuestionManager} from './question-manager/QuestionManager';

//MOCK INDEX 4 DEMO. TEST IN SPRINT 2.

const PORT = Number(process.env.PORT ?? 3000);

const db = openDb();
migrate(db);
seed(db);

const dataWriter = createDataWriter(db);
const questions = new QuestionManager(dataWriter, {
  // TODO: replace with a ProgressManager that updates planet_progress.
  onAnswer: () => undefined,
});

createApp({questions, dataWriter}).listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
