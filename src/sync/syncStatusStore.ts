import type {SyncSummary} from '../types/sync';

export type SyncRunSource =
  | 'background-fetch'
  | 'background-fetch-headless'
  | 'work-manager'
  | 'foreground';

export type SyncStatusPhase = 'idle' | 'running' | 'succeeded' | 'failed' | 'timed-out';

export interface SyncStatusSnapshot {
  readonly phase: SyncStatusPhase;
  readonly source: SyncRunSource | null;
  readonly taskId: string | null;
  readonly startedAt: number | null;
  readonly finishedAt: number | null;
  readonly lastSuccessAt: number | null;
  readonly lastFailureAt: number | null;
  readonly lastTimeoutAt: number | null;
  readonly lastErrorMessage: string | null;
  readonly lastSummary: SyncSummary | null;
  readonly runCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly timeoutCount: number;
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
  return currentSnapshot;
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
  listeners.forEach(listener => {
    listener(currentSnapshot);
  });

  return currentSnapshot;
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
