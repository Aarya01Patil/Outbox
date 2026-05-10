import type {MessagePriority, MessageStatus} from './message';

export type DatabaseScalar = string | number | boolean | null;

export interface MessageRow {
  client_id: string;
  server_id: string | null;
  session_id: string;
  sender_id: string;
  body: string;
  direction: string;
  status: MessageStatus;
  priority: MessagePriority;
  idempotency_key: string;
  retry_count: number;
  next_attempt_at: number;
  last_error: string | null;
  created_at_client: number;
  updated_at_client: number;
  created_at_server: number | null;
  updated_at_server: number | null;
  server_version: number | null;
  conflicted_at: number | null;
  conflict_reason: string | null;
  conflict_local_body: string | null;
  conflict_server_body: string | null;
  conflict_server_updated_at: number | null;
  conflict_server_version: number | null;
}

export interface CountRow {
  count: number;
}

export interface PragmaJournalModeRow {
  journal_mode: string;
}

export interface PragmaSynchronousRow {
  synchronous: number;
}

export interface QueueStatsRow {
  status: MessageStatus;
  count: number;
}

export interface DatabaseHealth {
  journalMode: string;
  synchronous: number;
}
