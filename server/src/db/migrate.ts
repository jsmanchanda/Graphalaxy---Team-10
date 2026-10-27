import fs from 'fs';
import path from 'path';
import type {Database} from 'better-sqlite3';
import {openDb} from './connection';

/**
 * Applies unapplied SQL migration files to the database.
 */
export function migrate(db: Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const dir = path.join(__dirname, '../../migrations');
  const applied = new Set(
    db
      .prepare('SELECT filename FROM schema_migrations')
      .pluck()
      .all() as string[],
  );

  for (const file of fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(
        file,
      );
    })();
    console.log(`applied ${file}`);
  }
}

if (require.main === module) migrate(openDb());
