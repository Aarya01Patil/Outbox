import {
  getPendingBatch,
  markMessageForRetry,
  markMessagePermanentlyFailed,
  markMessageSending,
  markMessageSent,
} from './messageQueue';
import {
  isMessageConflictError,
  resolveServerAuthoritativeConflict,
} from '../sync/conflictResolver';
import type {QueueCandidate} from '../types/message';
import type {
  MessageSender,
  SyncFailureDecision,
  SyncProcessorConfig,
  SyncSummary,
} from '../types/sync';

export const DEFAULT_SYNC_PROCESSOR_CONFIG: SyncProcessorConfig = {
  batchSize: 25,
  maxBatchesPerRun: 4,
  maxRetries: 5,
  baseBackoffMs: 1_000,
  maxBackoffMs: 60_000,
  stuckSendingTimeoutMs: 2 * 60 * 1000,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerCooldownMs: 30_000,
};

interface RunSyncOptions {
  sender: MessageSender;
  queue?: SyncQueuePort;
  config?: Partial<SyncProcessorConfig>;
  now?: () => number;
  shouldRetry?: (error: unknown, message: QueueCandidate) => SyncFailureDecision;
}

interface SyncQueuePort {
  getPendingBatch(limit: number, now: number): QueueCandidate[];
  markMessageSending(clientId: string, now?: number): void;
  markMessageSent(receipt: Parameters<typeof markMessageSent>[0], now?: number): void;
  markMessageForRetry(
    clientId: string,
    retryCount: number,
    nextAttemptAt: number,
    errorMessage: string,
    now?: number,
  ): void;
  markMessagePermanentlyFailed(
    clientId: string,
    retryCount: number,
    errorMessage: string,
    now?: number,
  ): void;
}

interface CircuitBreakerState {
  consecutiveFailures: number;
  openUntil: number;
}

let isSyncing = false;

const circuitBreaker: CircuitBreakerState = {
  consecutiveFailures: 0,
  openUntil: 0,
};

export async function runSyncProcessor(options: RunSyncOptions): Promise<SyncSummary> {
  const now = options.now ?? Date.now;
  const queue = options.queue ?? defaultQueuePort;
  const config = normalizeConfig(options.config);
  const startedAt = now();

  if (isSyncing) {
    return createEmptySummary('already-syncing');
  }

  if (circuitBreaker.openUntil > startedAt) {
    return createEmptySummary('circuit-open', circuitBreaker.openUntil);
  }

  isSyncing = true;

  const summary: SyncSummary = {
    started: true,
    skippedReason: null,
    processed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
    conflicted: 0,
    batches: 0,
    circuitOpenUntil: null,
  };

  try {
    for (let batchIndex = 0; batchIndex < config.maxBatchesPerRun; batchIndex += 1) {
      const batch = queue.getPendingBatch(config.batchSize, now());

      if (batch.length === 0) {
        break;
      }

      summary.batches += 1;

      for (const message of batch) {
        await processQueuedMessage(
          message,
          options.sender,
          queue,
          config,
          now,
          options.shouldRetry,
          summary,
        );
      }

      if (batch.length < config.batchSize || circuitBreaker.openUntil > now()) {
        break;
      }
    }

    summary.circuitOpenUntil =
      circuitBreaker.openUntil > now() ? circuitBreaker.openUntil : null;

    return summary;
  } finally {
    isSyncing = false;
  }
}

export function getIsSyncing(): boolean {
  return isSyncing;
}

export function resetSyncProcessorStateForTests(): void {
  isSyncing = false;
  circuitBreaker.consecutiveFailures = 0;
  circuitBreaker.openUntil = 0;
}

async function processQueuedMessage(
  message: QueueCandidate,
  sender: MessageSender,
  queue: SyncQueuePort,
  config: SyncProcessorConfig,
  now: () => number,
  shouldRetry: RunSyncOptions['shouldRetry'],
  summary: SyncSummary,
): Promise<void> {
  summary.processed += 1;
  queue.markMessageSending(message.clientId, now());

  try {
    const receipt = await sender.sendQueuedMessage(message);
    queue.markMessageSent(receipt, now());
    summary.sent += 1;
    circuitBreaker.consecutiveFailures = 0;
    circuitBreaker.openUntil = 0;
  } catch (error: unknown) {
    handleSyncFailure(message, error, queue, config, now, shouldRetry, summary);
  }
}

function handleSyncFailure(
  message: QueueCandidate,
  error: unknown,
  queue: SyncQueuePort,
  config: SyncProcessorConfig,
  now: () => number,
  shouldRetry: RunSyncOptions['shouldRetry'],
  summary: SyncSummary,
): void {
  if (isMessageConflictError(error)) {
    resolveServerAuthoritativeConflict(message, error, now());
    summary.conflicted += 1;
    circuitBreaker.consecutiveFailures = 0;
    return;
  }

  circuitBreaker.consecutiveFailures += 1;

  const decision = shouldRetry?.(error, message) ?? defaultShouldRetry(error);
  const retryCount = message.retryCount + 1;
  const canRetry = decision.retry && retryCount < config.maxRetries;

  if (canRetry) {
    const nextAttemptAt = now() + calculateBackoffMs(retryCount, config);
    queue.markMessageForRetry(
      message.clientId,
      retryCount,
      nextAttemptAt,
      decision.errorMessage,
      now(),
    );
    summary.retried += 1;
  } else {
    queue.markMessagePermanentlyFailed(
      message.clientId,
      retryCount,
      decision.errorMessage,
      now(),
    );
    summary.failed += 1;
  }

  if (circuitBreaker.consecutiveFailures >= config.circuitBreakerFailureThreshold) {
    circuitBreaker.openUntil = now() + config.circuitBreakerCooldownMs;
    summary.circuitOpenUntil = circuitBreaker.openUntil;
  }
}

const defaultQueuePort: SyncQueuePort = {
  getPendingBatch,
  markMessageSending,
  markMessageSent,
  markMessageForRetry,
  markMessagePermanentlyFailed,
};

function defaultShouldRetry(error: unknown): SyncFailureDecision {
  return {
    retry: true,
    errorMessage: readErrorMessage(error),
  };
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return 'Message sync failed';
}

function calculateBackoffMs(retryCount: number, config: SyncProcessorConfig): number {
  const exponent = Math.max(0, retryCount - 1);
  const delay = config.baseBackoffMs * 2 ** exponent;
  return Math.min(delay, config.maxBackoffMs);
}

function normalizeConfig(config?: Partial<SyncProcessorConfig>): SyncProcessorConfig {
  return {
    ...DEFAULT_SYNC_PROCESSOR_CONFIG,
    ...config,
    batchSize: positiveInteger(config?.batchSize, DEFAULT_SYNC_PROCESSOR_CONFIG.batchSize),
    maxBatchesPerRun: positiveInteger(
      config?.maxBatchesPerRun,
      DEFAULT_SYNC_PROCESSOR_CONFIG.maxBatchesPerRun,
    ),
    maxRetries: positiveInteger(config?.maxRetries, DEFAULT_SYNC_PROCESSOR_CONFIG.maxRetries),
    baseBackoffMs: positiveInteger(
      config?.baseBackoffMs,
      DEFAULT_SYNC_PROCESSOR_CONFIG.baseBackoffMs,
    ),
    maxBackoffMs: positiveInteger(
      config?.maxBackoffMs,
      DEFAULT_SYNC_PROCESSOR_CONFIG.maxBackoffMs,
    ),
    stuckSendingTimeoutMs: positiveInteger(
      config?.stuckSendingTimeoutMs,
      DEFAULT_SYNC_PROCESSOR_CONFIG.stuckSendingTimeoutMs,
    ),
    circuitBreakerFailureThreshold: positiveInteger(
      config?.circuitBreakerFailureThreshold,
      DEFAULT_SYNC_PROCESSOR_CONFIG.circuitBreakerFailureThreshold,
    ),
    circuitBreakerCooldownMs: positiveInteger(
      config?.circuitBreakerCooldownMs,
      DEFAULT_SYNC_PROCESSOR_CONFIG.circuitBreakerCooldownMs,
    ),
  };
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
}

function createEmptySummary(
  skippedReason: SyncSummary['skippedReason'],
  circuitOpenUntil: number | null = null,
): SyncSummary {
  return {
    started: false,
    skippedReason,
    processed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
    conflicted: 0,
    batches: 0,
    circuitOpenUntil,
  };
}
