import type {QueueCandidate, SentMessageReceipt} from './message';

export interface SyncCursor {
  value: string;
  issuedAt: number;
}

export interface SyncProcessorConfig {
  batchSize: number;
  maxBatchesPerRun: number;
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  stuckSendingTimeoutMs: number;
  circuitBreakerFailureThreshold: number;
  circuitBreakerCooldownMs: number;
}

export interface SyncSummary {
  started: boolean;
  skippedReason: 'already-syncing' | 'circuit-open' | null;
  processed: number;
  sent: number;
  retried: number;
  failed: number;
  conflicted: number;
  batches: number;
  circuitOpenUntil: number | null;
}

export interface SyncFailureDecision {
  retry: boolean;
  errorMessage: string;
}

export interface MessageSender {
  sendQueuedMessage(message: QueueCandidate): Promise<SentMessageReceipt>;
}
