import {open, type DB, type QueryResult, type Scalar} from '@op-engineering/op-sqlite';

import {
  applyDatabasePragmas,
  DATABASE_NAME,
  migrateDatabase,
  SQLITE_SYNCHRONOUS_FULL,
} from './schema';
import type {
  DatabaseHealth,
  PragmaJournalModeRow,
  PragmaSynchronousRow,
} from '../types/database';

let database: DB | null = null;
let initialized = false;

export function getDatabase(): DB {
  if (database === null) {
    database = open({name: DATABASE_NAME});
  }

  return database;
}

export function initializeDatabase(): DB {
  const db = getDatabase();

  if (!initialized) {
    applyDatabasePragmas(db);
    migrateDatabase(db);
    initialized = true;
  }

  return db;
}

export function executeSync(query: string, params?: Scalar[]): QueryResult {
  return initializeDatabase().executeSync(query, params);
}

export function queryRows<TRecord>(
  query: string,
  params?: Scalar[],
  mapRow?: (row: Record<string, Scalar>) => TRecord,
): TRecord[] {
  const result = executeSync(query, params);

  if (mapRow) {
    return result.rows.map(mapRow);
  }

  return result.rows as TRecord[];
}

export function queryOne<TRecord>(
  query: string,
  params?: Scalar[],
  mapRow?: (row: Record<string, Scalar>) => TRecord,
): TRecord | null {
  const rows = queryRows(query, params, mapRow);
  return rows[0] ?? null;
}

export function runInImmediateTransaction(work: () => void): void {
  const db = initializeDatabase();
  db.executeSync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    work();
    db.executeSync('COMMIT;');
  } catch (error: unknown) {
    db.executeSync('ROLLBACK;');
    throw error;
  }
}

export function readDatabaseHealth(): DatabaseHealth {
  const journalRow = queryOne<PragmaJournalModeRow>('PRAGMA journal_mode;');
  const synchronousRow = queryOne<PragmaSynchronousRow>('PRAGMA synchronous;');

  return {
    journalMode: journalRow?.journal_mode ?? 'unknown',
    synchronous: synchronousRow?.synchronous ?? -1,
  };
}

export function assertDurabilityPragmas(): void {
  const health = readDatabaseHealth();

  if (health.journalMode.toLowerCase() !== 'wal') {
    throw new Error(`Expected SQLite journal_mode WAL, received ${health.journalMode}`);
  }

  if (health.synchronous !== SQLITE_SYNCHRONOUS_FULL) {
    throw new Error(
      `Expected SQLite synchronous FULL (${SQLITE_SYNCHRONOUS_FULL}), received ${health.synchronous}`,
    );
  }
}

export function resetDatabaseForTests(nextDatabase: DB | null): void {
  database = nextDatabase;
  initialized = false;
}
