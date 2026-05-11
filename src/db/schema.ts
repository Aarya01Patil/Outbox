import type {DB} from '@op-engineering/op-sqlite';

export const DATABASE_NAME = 'offline_first_messaging.sqlite';
export const DATABASE_SCHEMA_VERSION = 2;
export const SQLITE_SYNCHRONOUS_FULL = 2;

export function applyDatabasePragmas(db: DB): void {
  db.executeSync('PRAGMA journal_mode = WAL;');
  db.executeSync('PRAGMA synchronous = FULL;');
  db.executeSync('PRAGMA foreign_keys = ON;');
}

export function migrateDatabase(db: DB): void {
  let userVersion = readUserVersion(db);

  if (userVersion < 1) {
    db.executeSync('BEGIN IMMEDIATE TRANSACTION;');
    try {
      createMessagesTable(db);
      createMessageIndexes(db);
      db.executeSync('PRAGMA user_version = 1;');
      db.executeSync('COMMIT;');
      userVersion = 1;
    } catch (error: unknown) {
      db.executeSync('ROLLBACK;');
      throw error;
    }
  }

  if (userVersion < 2) {
    db.executeSync('BEGIN IMMEDIATE TRANSACTION;');
    try {
      addConflictMetadataColumns(db);
      db.executeSync(`PRAGMA user_version = ${DATABASE_SCHEMA_VERSION};`);
      db.executeSync('COMMIT;');
    } catch (error: unknown) {
      db.executeSync('ROLLBACK;');
      throw error;
    }
  }
}

function readUserVersion(db: DB): number {
  const result = db.executeSync('PRAGMA user_version;');
  const row = result.rows[0];
  const value = row?.user_version;

  if (typeof value !== 'number') {
    return 0;
  }

  return value;
}

function createMessagesTable(db: DB): void {
  db.executeSync(`
    CREATE TABLE IF NOT EXISTS messages (
      client_id TEXT PRIMARY KEY NOT NULL,
      server_id TEXT UNIQUE,
      session_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      body TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
      status TEXT NOT NULL CHECK (
        status IN ('queued', 'sending', 'sent', 'delivered', 'failed', 'conflicted')
      ),
      priority TEXT NOT NULL CHECK (priority IN ('high', 'normal', 'low')),
      idempotency_key TEXT NOT NULL UNIQUE,
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at_client INTEGER NOT NULL,
      updated_at_client INTEGER NOT NULL,
      created_at_server INTEGER,
      updated_at_server INTEGER,
      server_version INTEGER,
      conflicted_at INTEGER
    );
  `);
}

function addConflictMetadataColumns(db: DB): void {
  // Read existing columns first so we can skip ones already present.
  // ALTER TABLE ADD COLUMN has no IF NOT EXISTS in SQLite; trying to add a
  // column that already exists throws inside our transaction and causes a
  // migration loop on subsequent app starts.
  const existing = new Set(
    db.executeSync('PRAGMA table_info(messages);').rows.map(r => r.name as string),
  );

  const columns: Array<{name: string; type: string}> = [
    {name: 'conflict_reason', type: 'TEXT'},
    {name: 'conflict_local_body', type: 'TEXT'},
    {name: 'conflict_server_body', type: 'TEXT'},
    {name: 'conflict_server_updated_at', type: 'INTEGER'},
    {name: 'conflict_server_version', type: 'INTEGER'},
  ];

  for (const col of columns) {
    if (!existing.has(col.name)) {
      db.executeSync(`ALTER TABLE messages ADD COLUMN ${col.name} ${col.type};`);
    }
  }
}

function createMessageIndexes(db: DB): void {
  db.executeSync(`
    CREATE INDEX IF NOT EXISTS idx_messages_session_created
    ON messages (session_id, created_at_client DESC);
  `);

  db.executeSync(`
    CREATE INDEX IF NOT EXISTS idx_messages_queue_pick
    ON messages (status, next_attempt_at, priority, created_at_client);
  `);

  db.executeSync(`
    CREATE INDEX IF NOT EXISTS idx_messages_status
    ON messages (status);
  `);
}
