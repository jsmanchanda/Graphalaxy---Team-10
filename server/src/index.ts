import {createApp} from './app';
import {createDataWriter} from './data-writer';
import {openDb} from './db/connection';
import {migrate} from './db/migrate';
import {seed} from './db/seed';
import {ProgressManager} from './progress-manager/ProgressManager';
import {QuestionManager} from './question-manager/QuestionManager';

const PORT = Number(process.env.PORT ?? 3000);

const db = openDb();
migrate(db);
seed(db);

const dataWriter = createDataWriter(db);
// Progress Manager subscribes to Question Manager's first-correct-answer event.
const progress = new ProgressManager(dataWriter);
const questions = new QuestionManager(dataWriter, progress);

createApp({questions, progress, dataWriter}).listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
