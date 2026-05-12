export type MessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'conflicted';

export type MessagePriority = 'high' | 'normal' | 'low';

export type MessageDirection = 'outgoing' | 'incoming';

export interface MessageRecord {
  clientId: string;
  serverId: string | null;
  sessionId: string;
  senderId: string;
  body: string;
  direction: MessageDirection;
  status: MessageStatus;
  priority: MessagePriority;
  idempotencyKey: string;
  retryCount: number;
  nextAttemptAt: number;
  lastError: string | null;
  createdAtClient: number;
  updatedAtClient: number;
  createdAtServer: number | null;
  updatedAtServer: number | null;
  serverVersion: number | null;
  conflictedAt: number | null;
  conflictReason: string | null;
  conflictLocalBody: string | null;
  conflictServerBody: string | null;
  conflictServerUpdatedAt: number | null;
  conflictServerVersion: number | null;
}

export interface CreateQueuedMessageInput {
  sessionId: string;
  senderId: string;
  body: string;
  priority?: MessagePriority;
  now?: number;
  clientId?: string;
  idempotencyKey?: string;
}

export interface QueueCandidate {
  clientId: string;
  sessionId: string;
  body: string;
  priority: MessagePriority;
  idempotencyKey: string;
  retryCount: number;
  nextAttemptAt: number;
  createdAtClient: number;
}

export interface SentMessageReceipt {
  clientId: string;
  serverId: string;
  createdAtServer: number;
  updatedAtServer: number;
  serverVersion: number;
}

export interface RetryMessageInput {
  clientId: string;
  now?: number;
}

export interface QueueStats {
  queued: number;
  sending: number;
  failed: number;
  conflicted: number;
}
