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
    super('Device is offline - message queued for retry');
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

const MIN_LATENCY_MS = 200;
const MAX_LATENCY_MS = 800;
const CONFLICT_PROBABILITY = 0.05;
const TRANSIENT_ERROR_PROBABILITY = 0.03;

function randomLatency(): number {
  return MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// NetInfo is checked once in the sync processor, not here: a second check
// races against MIUI/Android transient "disconnected" states and would falsely
// trip the circuit breaker.
export const localAssignmentMessageSender: MessageSender = {
  async sendQueuedMessage(message: QueueCandidate): Promise<SentMessageReceipt> {
    await sleep(randomLatency());

    if (Math.random() < TRANSIENT_ERROR_PROBABILITY) {
      const codes = [500, 502, 503];
      const status = codes[Math.floor(Math.random() * codes.length)] ?? 500;
      throw new TransientServerError(
        status,
        `Server returned ${status} - transient failure`,
      );
    }

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
