import type {QueueCandidate, SentMessageReceipt} from '../types/message';
import type {MessageSender} from '../types/sync';

export interface ServerConflictPayload {
  clientId: string;
  serverId: string;
  serverBody: string;
  serverCreatedAt: number;
  serverUpdatedAt: number;
  serverVersion: number;
  reason: 'server-newer' | 'duplicate-idempotency-key';
}

export class MessageConflictError extends Error {
  readonly status = 409;
  readonly payload: ServerConflictPayload;

  constructor(payload: ServerConflictPayload) {
    super(`Message ${payload.clientId} conflicted with server state`);
    this.name = 'MessageConflictError';
    this.payload = payload;
  }
}

export class NetworkOfflineError extends Error {
  constructor() {
    super('Device is offline — message queued for retry');
    this.name = 'NetworkOfflineError';
  }
}

export class TransientServerError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'TransientServerError';
    this.status = status;
  }
}

/**
 * Simulated latency range in milliseconds.
 * Kept deliberately short to stay within the assignment's performance budgets
 * while still proving the async retry / status-transition pipeline works.
 */
const MIN_LATENCY_MS = 200;
const MAX_LATENCY_MS = 800;

/** Probability (0-1) of returning a 409 conflict for a given send. */
const CONFLICT_PROBABILITY = 0.05;

/** Probability (0-1) of returning a transient 5xx server error. */
const TRANSIENT_ERROR_PROBABILITY = 0.03;

function randomLatency(): number {
  return MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * A realistic local mock sender that simulates:
 * - Variable server latency (200-800 ms)
 * - ~5 % 409 conflict responses with full payloads
 * - ~3 % transient 5xx server errors
 * - Server-authoritative timestamps
 *
 * Network connectivity is gated at the sync-processor level (runSyncProcessor
 * calls NetInfo.fetch before dispatching any batch). Checking NetInfo a second
 * time here creates a race condition on Android/MIUI where the state can
 * transiently show "disconnected" even while online, which would spuriously
 * increment the circuit-breaker failure counter and eventually block all sends.
 *
 * Replace this module with a real HTTP client for production.
 */
export const localAssignmentMessageSender: MessageSender = {
  async sendQueuedMessage(message: QueueCandidate): Promise<SentMessageReceipt> {
    // 1. Simulate server round-trip latency
    await sleep(randomLatency());

    // 3. Random transient 5xx errors (~3 %)
    if (Math.random() < TRANSIENT_ERROR_PROBABILITY) {
      const codes = [500, 502, 503];
      const status = codes[Math.floor(Math.random() * codes.length)] ?? 500;
      throw new TransientServerError(
        status,
        `Server returned ${status} — transient failure`,
      );
    }

    // 4. Random 409 conflict (~5 %)
    if (Math.random() < CONFLICT_PROBABILITY) {
      const serverTime = Date.now();
      throw new MessageConflictError({
        clientId: message.clientId,
        serverId: `srv_${message.clientId}`,
        serverBody: `[Server-edited] ${message.body}`,
        serverCreatedAt: serverTime - 500,
        serverUpdatedAt: serverTime,
        serverVersion: 2,
        reason: 'server-newer',
      });
    }

    // 5. Normal success — return server-authoritative receipt
    const serverTime = Date.now();

    return {
      clientId: message.clientId,
      serverId: `srv_${message.clientId}`,
      createdAtServer: serverTime,
      updatedAtServer: serverTime,
      serverVersion: 1,
    };
  },
};
