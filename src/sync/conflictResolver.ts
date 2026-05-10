import {MessageConflictError, type ServerConflictPayload} from '../api/messagesApi';
import {
  applyServerAuthoritativeMessage,
  markMessageConflicted,
} from '../queue/messageQueue';
import type {
  LastWriteWinsResolution,
  ServerMessageSnapshot,
} from '../types/conflict';
import type {MessageRecord, QueueCandidate} from '../types/message';

export interface ConflictResolutionResult {
  clientId: string;
  status: 'conflicted';
  reason: ServerConflictPayload['reason'];
  localBody: string;
  serverBody: string;
  serverUpdatedAt: number;
  serverVersion: number;
  resolvedAt: number;
}

export function isMessageConflictError(error: unknown): error is MessageConflictError {
  return error instanceof MessageConflictError || hasConflictShape(error);
}

export function resolveServerAuthoritativeConflict(
  message: QueueCandidate,
  error: MessageConflictError,
  now = Date.now(),
): ConflictResolutionResult {
  markMessageConflicted({
    clientId: message.clientId,
    localBody: message.body,
    serverId: error.payload.serverId,
    serverBody: error.payload.serverBody,
    serverCreatedAt: error.payload.serverCreatedAt,
    serverUpdatedAt: error.payload.serverUpdatedAt,
    serverVersion: error.payload.serverVersion,
    reason: error.payload.reason,
    now,
  });

  return {
    clientId: message.clientId,
    status: 'conflicted',
    reason: error.payload.reason,
    localBody: message.body,
    serverBody: error.payload.serverBody,
    serverUpdatedAt: error.payload.serverUpdatedAt,
    serverVersion: error.payload.serverVersion,
    resolvedAt: now,
  };
}

export function resolveLastWriteWins(
  local: MessageRecord,
  server: ServerMessageSnapshot,
): LastWriteWinsResolution {
  const localTimestamp = local.updatedAtServer ?? local.updatedAtClient;
  const serverTimestamp = server.serverUpdatedAt;
  const serverWins = serverTimestamp >= localTimestamp;

  return {
    clientId: local.clientId,
    winner: serverWins ? 'server' : 'local',
    localTimestamp,
    serverTimestamp,
    resolvedBody: serverWins ? server.serverBody : local.body,
    serverVersion: server.serverVersion,
  };
}

export function applyServerAuthoritativeResolution(
  local: MessageRecord,
  server: ServerMessageSnapshot,
  now = Date.now(),
): LastWriteWinsResolution {
  const resolution = resolveLastWriteWins(local, server);

  if (resolution.winner === 'server') {
    applyServerAuthoritativeMessage(server, now);
  }

  return resolution;
}

function hasConflictShape(error: unknown): error is MessageConflictError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {
    status?: unknown;
    payload?: unknown;
  };

  return candidate.status === 409 && hasConflictPayload(candidate.payload);
}

function hasConflictPayload(payload: unknown): payload is ServerConflictPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const candidate = payload as Partial<Record<keyof ServerConflictPayload, unknown>>;

  return (
    typeof candidate.clientId === 'string' &&
    typeof candidate.serverId === 'string' &&
    typeof candidate.serverBody === 'string' &&
    typeof candidate.serverCreatedAt === 'number' &&
    typeof candidate.serverUpdatedAt === 'number' &&
    typeof candidate.serverVersion === 'number' &&
    (candidate.reason === 'server-newer' ||
      candidate.reason === 'duplicate-idempotency-key')
  );
}
