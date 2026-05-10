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

export const localAssignmentMessageSender: MessageSender = {
  async sendQueuedMessage(message: QueueCandidate): Promise<SentMessageReceipt> {
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
