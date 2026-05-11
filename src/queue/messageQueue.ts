import type {Scalar} from '@op-engineering/op-sqlite';

import {executeSync, queryOne, queryRows, runInImmediateTransaction} from '../db/database';
import type {QueueStatsRow} from '../types/database';
import type {
  ServerMessageSnapshot,
} from '../types/conflict';
import type {
  CreateQueuedMessageInput,
  MessagePriority,
  MessageRecord,
  MessageStatus,
  QueueCandidate,
  QueueStats,
  RetryMessageInput,
  SentMessageReceipt,
} from '../types/message';

const DEFAULT_MAX_MESSAGES_PER_SESSION = 10_000;
const DEFAULT_STUCK_SENDING_TIMEOUT_MS = 2 * 60 * 1000;
const PRIORITY_SCORE: Record<MessagePriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

export function enqueueMessage(input: CreateQueuedMessageInput): MessageRecord {
  const now = input.now ?? Date.now();
  const clientId = input.clientId ?? createClientMessageId(now);
  const idempotencyKey = input.idempotencyKey ?? `send:${clientId}`;
  const priority = input.priority ?? 'normal';

  runInImmediateTransaction(() => {
    executeSync(
      `
        INSERT INTO messages (
          client_id,
          server_id,
          session_id,
          sender_id,
          body,
          direction,
          status,
          priority,
          idempotency_key,
          retry_count,
          next_attempt_at,
          last_error,
          created_at_client,
          updated_at_client,
          created_at_server,
          updated_at_server,
          server_version,
          conflicted_at
        ) VALUES (?, NULL, ?, ?, ?, 'outgoing', 'queued', ?, ?, 0, 0, NULL, ?, ?, NULL, NULL, NULL, NULL);
      `,
      [
        clientId,
        input.sessionId,
        input.senderId,
        input.body,
        priority,
        idempotencyKey,
        now,
        now,
      ],
    );

    evictOverflowForSession(input.sessionId, DEFAULT_MAX_MESSAGES_PER_SESSION);
  });

  const message = getMessageByClientId(clientId);

  if (message === null) {
    throw new Error(`Failed to load queued message ${clientId}`);
  }

  return message;
}

export function getMessageByClientId(clientId: string): MessageRecord | null {
  return queryOne(
    'SELECT * FROM messages WHERE client_id = ? LIMIT 1;',
    [clientId],
    mapMessageRow,
  );
}

export function getMessagesForSession(
  sessionId: string,
  limit = 100,
  beforeClientTimestamp?: number,
): MessageRecord[] {
  const boundedLimit = Math.max(1, Math.min(limit, 250));
  const params: Scalar[] = [sessionId];
  let timePredicate = '';

  if (typeof beforeClientTimestamp === 'number') {
    timePredicate = 'AND created_at_client < ?';
    params.push(beforeClientTimestamp);
  }

  params.push(boundedLimit);

  return queryRows(
    `
      SELECT *
      FROM messages
      WHERE session_id = ?
      ${timePredicate}
      ORDER BY created_at_client DESC
      LIMIT ?;
    `,
    params,
    mapMessageRow,
  );
}

export function getAllMessagesForSession(
  sessionId: string,
  limit = DEFAULT_MAX_MESSAGES_PER_SESSION,
): MessageRecord[] {
  const boundedLimit = Math.max(1, Math.min(limit, DEFAULT_MAX_MESSAGES_PER_SESSION));

  return queryRows(
    `
      SELECT *
      FROM messages
      WHERE session_id = ?
      ORDER BY created_at_client DESC
      LIMIT ?;
    `,
    [sessionId, boundedLimit],
    mapMessageRow,
  );
}

export function getLastMessageForSession(sessionId: string): MessageRecord | null {
  return queryOne(
    `SELECT * FROM messages WHERE session_id = ? ORDER BY created_at_client DESC LIMIT 1;`,
    [sessionId],
    mapMessageRow,
  );
}

export function getSessionMessageCount(sessionId: string): number {
  const row = queryOne<{count: number}>(
    'SELECT COUNT(*) AS count FROM messages WHERE session_id = ?;',
    [sessionId],
  );

  return row?.count ?? 0;
}

export function getPendingBatch(limit: number, now = Date.now()): QueueCandidate[] {
  const boundedLimit = Math.max(1, Math.min(limit, 100));

  return queryRows(
    `
      SELECT *
      FROM messages
      WHERE status IN ('queued', 'failed')
        AND next_attempt_at <= ?
      ORDER BY
        CASE priority
          WHEN 'high' THEN 0
          WHEN 'normal' THEN 1
          ELSE 2
        END ASC,
        created_at_client ASC
      LIMIT ?;
    `,
    [now, boundedLimit],
    mapQueueCandidate,
  );
}

export function markMessageSending(clientId: string, now = Date.now()): void {
  executeSync(
    `
      UPDATE messages
      SET status = 'sending',
          updated_at_client = ?,
          last_error = NULL
      WHERE client_id = ?
        AND status IN ('queued', 'failed');
    `,
    [now, clientId],
  );
}

export function markMessageSent(receipt: SentMessageReceipt, now = Date.now()): void {
  executeSync(
    `
      UPDATE messages
      SET status = 'sent',
          server_id = ?,
          created_at_server = ?,
          updated_at_server = ?,
          server_version = ?,
          updated_at_client = ?,
          last_error = NULL,
          conflicted_at = NULL,
          conflict_reason = NULL,
          conflict_local_body = NULL,
          conflict_server_body = NULL,
          conflict_server_updated_at = NULL,
          conflict_server_version = NULL
      WHERE client_id = ?;
    `,
    [
      receipt.serverId,
      receipt.createdAtServer,
      receipt.updatedAtServer,
      receipt.serverVersion,
      now,
      receipt.clientId,
    ],
  );
}

export function markMessageForRetry(
  clientId: string,
  retryCount: number,
  nextAttemptAt: number,
  errorMessage: string,
  now = Date.now(),
): void {
  executeSync(
    `
      UPDATE messages
      SET status = 'failed',
          retry_count = ?,
          next_attempt_at = ?,
          last_error = ?,
          updated_at_client = ?
      WHERE client_id = ?;
    `,
    [retryCount, nextAttemptAt, errorMessage, now, clientId],
  );
}

export function markMessagePermanentlyFailed(
  clientId: string,
  retryCount: number,
  errorMessage: string,
  now = Date.now(),
): void {
  executeSync(
    `
      UPDATE messages
      SET status = 'failed',
          retry_count = ?,
          next_attempt_at = 0,
          last_error = ?,
          updated_at_client = ?
      WHERE client_id = ?;
    `,
    [retryCount, errorMessage, now, clientId],
  );
}

interface MarkMessageConflictedInput {
  clientId: string;
  localBody: string;
  serverId: string;
  serverBody: string;
  serverCreatedAt: number;
  serverUpdatedAt: number;
  serverVersion: number;
  reason: string;
  now: number;
}

export function markMessageConflicted(input: MarkMessageConflictedInput): void {
  executeSync(
    `
      UPDATE messages
      SET status = 'conflicted',
          server_id = ?,
          created_at_server = ?,
          updated_at_server = ?,
          server_version = ?,
          conflicted_at = ?,
          last_error = ?,
          conflict_reason = ?,
          conflict_local_body = ?,
          conflict_server_body = ?,
          conflict_server_updated_at = ?,
          conflict_server_version = ?,
          updated_at_client = ?
      WHERE client_id = ?;
    `,
    [
      input.serverId,
      input.serverCreatedAt,
      input.serverUpdatedAt,
      input.serverVersion,
      input.now,
      `409 conflict: ${input.reason}`,
      input.reason,
      input.localBody,
      input.serverBody,
      input.serverUpdatedAt,
      input.serverVersion,
      input.now,
      input.clientId,
    ],
  );
}

export function applyServerAuthoritativeMessage(
  snapshot: ServerMessageSnapshot,
  now = Date.now(),
): void {
  executeSync(
    `
      UPDATE messages
      SET status = 'sent',
          server_id = ?,
          body = ?,
          created_at_server = ?,
          updated_at_server = ?,
          server_version = ?,
          retry_count = 0,
          next_attempt_at = 0,
          last_error = NULL,
          conflicted_at = NULL,
          conflict_reason = NULL,
          conflict_local_body = NULL,
          conflict_server_body = NULL,
          conflict_server_updated_at = NULL,
          conflict_server_version = NULL,
          updated_at_client = ?
      WHERE client_id = ?;
    `,
    [
      snapshot.serverId,
      snapshot.serverBody,
      snapshot.serverCreatedAt,
      snapshot.serverUpdatedAt,
      snapshot.serverVersion,
      now,
      snapshot.clientId,
    ],
  );
}

export function resetStuckMessages(
  now = Date.now(),
  timeoutMs = DEFAULT_STUCK_SENDING_TIMEOUT_MS,
): number {
  const staleBefore = now - timeoutMs;
  const result = executeSync(
    `
      UPDATE messages
      SET status = 'queued',
          next_attempt_at = ?,
          last_error = 'Reset after app restart while message was sending',
          updated_at_client = ?
      WHERE status = 'sending'
        AND updated_at_client <= ?;
    `,
    [now, now, staleBefore],
  );

  return result.rowsAffected;
}

export function retryMessage(input: RetryMessageInput): void {
  const now = input.now ?? Date.now();
  executeSync(
    `
      UPDATE messages
      SET status = 'queued',
          next_attempt_at = ?,
          last_error = NULL,
          conflicted_at = NULL,
          conflict_reason = NULL,
          conflict_local_body = NULL,
          conflict_server_body = NULL,
          conflict_server_updated_at = NULL,
          conflict_server_version = NULL,
          updated_at_client = ?
      WHERE client_id = ?
        AND status IN ('failed', 'conflicted');
    `,
    [now, now, input.clientId],
  );
}

export interface SeedMessagesInput {
  sessionId: string;
  senderId: string;
  count: number;
  now?: number;
}

export function seedMessagesForSession(input: SeedMessagesInput): number {
  const now = input.now ?? Date.now();
  const count = Math.max(1, Math.min(input.count, DEFAULT_MAX_MESSAGES_PER_SESSION));

  runInImmediateTransaction(() => {
    for (let index = 0; index < count; index += 1) {
      const createdAt = now - (count - index) * 1_000;
      const clientId = `seed_${input.sessionId}_${createdAt}_${index}`;
      executeSync(
        `
          INSERT OR IGNORE INTO messages (
            client_id,
            server_id,
            session_id,
            sender_id,
            body,
            direction,
            status,
            priority,
            idempotency_key,
            retry_count,
            next_attempt_at,
            last_error,
            created_at_client,
            updated_at_client,
            created_at_server,
            updated_at_server,
            server_version,
            conflicted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'normal', ?, 0, 0, NULL, ?, ?, ?, ?, 1, NULL);
        `,
        [
          clientId,
          `srv_${clientId}`,
          input.sessionId,
          input.senderId,
          `Seed message ${index + 1}`,
          index % 5 === 0 ? 'incoming' : 'outgoing',
          'sent',
          `seed:${clientId}`,
          createdAt,
          createdAt,
          createdAt + 250,
          createdAt + 250,
        ],
      );
    }

    evictOverflowForSession(input.sessionId, DEFAULT_MAX_MESSAGES_PER_SESSION);
  });

  return count;
}

export function getQueueStats(): QueueStats {
  const rows = queryRows<QueueStatsRow>(
    `
      SELECT status, COUNT(*) AS count
      FROM messages
      WHERE status IN ('queued', 'sending', 'failed', 'conflicted')
      GROUP BY status;
    `,
  );

  return rows.reduce<QueueStats>(
    (stats, row) => ({
      ...stats,
      [row.status]: row.count,
    }),
    {
      queued: 0,
      sending: 0,
      failed: 0,
      conflicted: 0,
    },
  );
}

function evictOverflowForSession(sessionId: string, maxMessages: number): void {
  const countRow = queryOne<{count: number}>(
    'SELECT COUNT(*) AS count FROM messages WHERE session_id = ?;',
    [sessionId],
  );
  const overflow = Math.max((countRow?.count ?? 0) - maxMessages, 0);

  if (overflow === 0) {
    return;
  }

  const evictableRows = queryRows<{client_id: string}>(
    `
      SELECT client_id
      FROM messages
      WHERE session_id = ?
        AND status IN ('sent', 'delivered')
      ORDER BY created_at_client ASC
      LIMIT ?;
    `,
    [sessionId, overflow],
  );

  if (evictableRows.length === 0) {
    return;
  }

  const placeholders = evictableRows.map(() => '?').join(', ');
  const ids = evictableRows.map(row => row.client_id);
  executeSync(`DELETE FROM messages WHERE client_id IN (${placeholders});`, ids);
}

function generateUUID(): string {
  // Prefer Web Crypto (Hermes 0.11+ / RN 0.71+) for cryptographic randomness.
  // Fall back to Math.random so message IDs are still unique on devices where
  // globalThis.crypto is unavailable (e.g. certain Android system WebViews).
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function createClientMessageId(now: number): string {
  return `msg_${now}_${generateUUID()}`;
}

function mapQueueCandidate(row: Record<string, Scalar>): QueueCandidate {
  const message = mapMessageRow(row);

  return {
    clientId: message.clientId,
    sessionId: message.sessionId,
    body: message.body,
    priority: message.priority,
    idempotencyKey: message.idempotencyKey,
    retryCount: message.retryCount,
    nextAttemptAt: message.nextAttemptAt,
    createdAtClient: message.createdAtClient,
  };
}

function mapMessageRow(row: Record<string, Scalar>): MessageRecord {
  return {
    clientId: readString(row.client_id, 'client_id'),
    serverId: readNullableString(row.server_id, 'server_id'),
    sessionId: readString(row.session_id, 'session_id'),
    senderId: readString(row.sender_id, 'sender_id'),
    body: readString(row.body, 'body'),
    direction: readDirection(row.direction),
    status: readStatus(row.status),
    priority: readPriority(row.priority),
    idempotencyKey: readString(row.idempotency_key, 'idempotency_key'),
    retryCount: readNumber(row.retry_count, 'retry_count'),
    nextAttemptAt: readNumber(row.next_attempt_at, 'next_attempt_at'),
    lastError: readNullableString(row.last_error, 'last_error'),
    createdAtClient: readNumber(row.created_at_client, 'created_at_client'),
    updatedAtClient: readNumber(row.updated_at_client, 'updated_at_client'),
    createdAtServer: readNullableNumber(row.created_at_server, 'created_at_server'),
    updatedAtServer: readNullableNumber(row.updated_at_server, 'updated_at_server'),
    serverVersion: readNullableNumber(row.server_version, 'server_version'),
    conflictedAt: readNullableNumber(row.conflicted_at, 'conflicted_at'),
    conflictReason: readNullableString(row.conflict_reason, 'conflict_reason'),
    conflictLocalBody: readNullableString(row.conflict_local_body, 'conflict_local_body'),
    conflictServerBody: readNullableString(row.conflict_server_body, 'conflict_server_body'),
    conflictServerUpdatedAt: readNullableNumber(
      row.conflict_server_updated_at,
      'conflict_server_updated_at',
    ),
    conflictServerVersion: readNullableNumber(
      row.conflict_server_version,
      'conflict_server_version',
    ),
  };
}

function readStatus(value: Scalar): MessageStatus {
  if (
    value === 'queued' ||
    value === 'sending' ||
    value === 'sent' ||
    value === 'delivered' ||
    value === 'failed' ||
    value === 'conflicted'
  ) {
    return value;
  }

  throw new Error(`Unexpected message status ${String(value)}`);
}

function readPriority(value: Scalar): MessagePriority {
  if (value === 'high' || value === 'normal' || value === 'low') {
    return value;
  }

  throw new Error(`Unexpected message priority ${String(value)}`);
}

function readDirection(value: Scalar): 'outgoing' | 'incoming' {
  if (value === 'outgoing' || value === 'incoming') {
    return value;
  }

  throw new Error(`Unexpected message direction ${String(value)}`);
}

function readString(value: Scalar, field: string): string {
  if (typeof value === 'string') {
    return value;
  }

  throw new Error(`Expected string for ${field}`);
}

function readNullableString(value: Scalar, field: string): string | null {
  // op-sqlite may return undefined for NULL columns on Android; treat as null.
  if (value === null || value === undefined || typeof value === 'string') {
    return value ?? null;
  }

  throw new Error(`Expected nullable string for ${field}`);
}

function readNumber(value: Scalar, field: string): number {
  if (typeof value === 'number') {
    return value;
  }

  throw new Error(`Expected number for ${field}`);
}

function readNullableNumber(value: Scalar, field: string): number | null {
  // op-sqlite may return undefined for NULL columns on Android; treat as null.
  if (value === null || value === undefined || typeof value === 'number') {
    return value ?? null;
  }

  throw new Error(`Expected nullable number for ${field}`);
}

export function comparePriority(a: MessagePriority, b: MessagePriority): number {
  return PRIORITY_SCORE[a] - PRIORITY_SCORE[b];
}
