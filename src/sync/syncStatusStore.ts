import type {SyncSummary} from '../types/sync';

export type SyncRunSource =
  | 'background-fetch'
  | 'background-fetch-headless'
  | 'work-manager';

export type SyncStatusPhase = 'idle' | 'running' | 'succeeded' | 'failed' | 'timed-out';

export interface SyncStatusSnapshot {
  phase: SyncStatusPhase;
  source: SyncRunSource | null;
  taskId: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastTimeoutAt: number | null;
  lastErrorMessage: string | null;
  lastSummary: SyncSummary | null;
  runCount: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
}

export interface SyncStatusStartedInput {
  source: SyncRunSource;
  taskId: string;
  startedAt: number;
}

export interface SyncStatusSucceededInput {
  source: SyncRunSource;
  taskId: string;
  finishedAt: number;
  summary: SyncSummary;
}

export interface SyncStatusFailedInput {
  source: SyncRunSource;
  taskId: string;
  finishedAt: number;
  error: unknown;
}

export interface SyncStatusTimedOutInput {
  source: SyncRunSource;
  taskId: string;
  finishedAt: number;
}

export type SyncStatusListener = (snapshot: SyncStatusSnapshot) => void;

const initialSnapshot: SyncStatusSnapshot = {
  phase: 'idle',
  source: null,
  taskId: null,
  startedAt: null,
  finishedAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastTimeoutAt: null,
  lastErrorMessage: null,
  lastSummary: null,
  runCount: 0,
  successCount: 0,
  failureCount: 0,
  timeoutCount: 0,
};

let currentSnapshot: SyncStatusSnapshot = initialSnapshot;
const listeners: Set<SyncStatusListener> = new Set();

export function getSyncStatusSnapshot(): SyncStatusSnapshot {
  return copySnapshot(currentSnapshot);
}

export function subscribeSyncStatus(listener: SyncStatusListener): () => void {
  listeners.add(listener);
  listener(getSyncStatusSnapshot());

  return () => {
    listeners.delete(listener);
  };
}

export function markSyncStarted(input: SyncStatusStartedInput): SyncStatusSnapshot {
  currentSnapshot = {
    ...currentSnapshot,
    phase: 'running',
    source: input.source,
    taskId: input.taskId,
    startedAt: input.startedAt,
    finishedAt: null,
    lastErrorMessage: null,
    runCount: currentSnapshot.runCount + 1,
  };

  return publish();
}

export function markSyncSucceeded(input: SyncStatusSucceededInput): SyncStatusSnapshot {
  currentSnapshot = {
    ...currentSnapshot,
    phase: 'succeeded',
    source: input.source,
    taskId: input.taskId,
    finishedAt: input.finishedAt,
    lastSuccessAt: input.finishedAt,
    lastErrorMessage: null,
    lastSummary: input.summary,
    successCount: currentSnapshot.successCount + 1,
  };

  return publish();
}

export function markSyncFailed(input: SyncStatusFailedInput): SyncStatusSnapshot {
  currentSnapshot = {
    ...currentSnapshot,
    phase: 'failed',
    source: input.source,
    taskId: input.taskId,
    finishedAt: input.finishedAt,
    lastFailureAt: input.finishedAt,
    lastErrorMessage: readErrorMessage(input.error),
    failureCount: currentSnapshot.failureCount + 1,
  };

  return publish();
}

export function markSyncTimedOut(input: SyncStatusTimedOutInput): SyncStatusSnapshot {
  currentSnapshot = {
    ...currentSnapshot,
    phase: 'timed-out',
    source: input.source,
    taskId: input.taskId,
    finishedAt: input.finishedAt,
    lastTimeoutAt: input.finishedAt,
    lastErrorMessage: 'Background sync timed out',
    timeoutCount: currentSnapshot.timeoutCount + 1,
  };

  return publish();
}

export function resetSyncStatusStoreForTests(): void {
  currentSnapshot = initialSnapshot;
  listeners.clear();
}

function publish(): SyncStatusSnapshot {
  const snapshot = getSyncStatusSnapshot();

  listeners.forEach(listener => {
    listener(snapshot);
  });

  return snapshot;
}

function copySnapshot(snapshot: SyncStatusSnapshot): SyncStatusSnapshot {
  return {
    ...snapshot,
    lastSummary: snapshot.lastSummary === null ? null : {...snapshot.lastSummary},
  };
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return 'Background sync failed';
}
