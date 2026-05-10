import type {
  ISODateTimeString,
  Message,
  MessageId,
  UserId,
} from './message';

export type ConflictReason =
  | 'versionMismatch'
  | 'deletedRemotely'
  | 'editedInBothPlaces'
  | 'missingBaseVersion';

export type ConflictResolutionStrategy = 'keepLocal' | 'keepRemote' | 'merge';

export type MessageConflictField =
  | 'body'
  | 'status'
  | 'deletedAt'
  | 'version'
  | 'serverVersion';

export interface ConflictEnvelope {
  id: string;
  messageId: MessageId;
  reason: ConflictReason;
  local: Message;
  remote: Message;
  base?: Message;
  detectedAt: ISODateTimeString;
}

export interface ConflictMergePreview {
  conflictId: string;
  body: string;
  localChangedFields: MessageConflictField[];
  remoteChangedFields: MessageConflictField[];
}

export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedMessage: Message;
  resolvedBy: UserId;
  resolvedAt: ISODateTimeString;
  note?: string;
}

export interface ServerMessageSnapshot {
  clientId: string;
  serverId: string;
  serverBody: string;
  serverCreatedAt: number;
  serverUpdatedAt: number;
  serverVersion: number;
}

export type LastWriteWinsWinner = 'server' | 'local';

export interface LastWriteWinsResolution {
  clientId: string;
  winner: LastWriteWinsWinner;
  localTimestamp: number;
  serverTimestamp: number;
  resolvedBody: string;
  serverVersion: number;
}
