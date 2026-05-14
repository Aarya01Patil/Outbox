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
  readonly clientId: string;
  readonly serverId: string | null;
  readonly sessionId: string;
  readonly senderId: string;
  readonly body: string;
  readonly direction: MessageDirection;
  readonly status: MessageStatus;
  readonly priority: MessagePriority;
  readonly idempotencyKey: string;
  readonly retryCount: number;
  readonly nextAttemptAt: number;
  readonly lastError: string | null;
  readonly createdAtClient: number;
  readonly updatedAtClient: number;
  readonly createdAtServer: number | null;
  readonly updatedAtServer: number | null;
  readonly serverVersion: number | null;
  readonly conflictedAt: number | null;
  readonly conflictReason: string | null;
  readonly conflictLocalBody: string | null;
  readonly conflictServerBody: string | null;
  readonly conflictServerUpdatedAt: number | null;
  readonly conflictServerVersion: number | null;
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
  readonly clientId: string;
  readonly sessionId: string;
  readonly body: string;
  readonly priority: MessagePriority;
  readonly idempotencyKey: string;
  readonly retryCount: number;
  readonly nextAttemptAt: number;
  readonly createdAtClient: number;
}

export interface SentMessageReceipt {
  readonly clientId: string;
  readonly serverId: string;
  readonly createdAtServer: number;
  readonly updatedAtServer: number;
  readonly serverVersion: number;
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
