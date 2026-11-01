import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DEFAULT_PATH = path.join(__dirname, '../../var/game.db');

/**
 * Opens a SQLite database, creating its parent directory if needed, and enables
 * foreign-key constraint enforcement.
 *
 * Uses the provided file path, or `DB_PATH` / the default path when omitted.
 * Pass `':memory:'` to open an in-memory database.
 * @param file - Database file path, or `':memory:'` for an in-memory database.
 * @returns The open SQLite database connection.
 */
export function openDb(
  file: string = process.env.DB_PATH ?? DEFAULT_PATH,
): Database.Database {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), {recursive: true});
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  return db;
}
