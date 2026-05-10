import type {ServerConflictPayload} from '../../src/api/messagesApi';
import {MessageConflictError} from '../../src/api/messagesApi';
import type {ServerMessageSnapshot} from '../../src/types/conflict';
import type {MessageRecord, QueueCandidate} from '../../src/types/message';

type ConflictResolverModule = typeof import('../../src/sync/conflictResolver');

const mockApplyServerAuthoritativeMessage = jest.fn<
  void,
  [ServerMessageSnapshot, number?]
>();
const mockMarkMessageConflicted = jest.fn<
  void,
  [
    {
      clientId: string;
      localBody: string;
      serverId: string;
      serverBody: string;
      serverCreatedAt: number;
      serverUpdatedAt: number;
      serverVersion: number;
      reason: string;
      now: number;
    },
  ]
>();

describe('conflictResolver', () => {
  let resolver: ConflictResolverModule;

  beforeEach(() => {
    jest.resetModules();
    mockApplyServerAuthoritativeMessage.mockReset();
    mockMarkMessageConflicted.mockReset();
    jest.doMock('../../src/queue/messageQueue', () => ({
      applyServerAuthoritativeMessage: mockApplyServerAuthoritativeMessage,
      markMessageConflicted: mockMarkMessageConflicted,
    }));
    resolver = require('../../src/sync/conflictResolver') as ConflictResolverModule;
  });

  it('chooses the newer server timestamp with server-authoritative LWW', () => {
    const local = createMessageRecord({
      body: 'local old value',
      updatedAtClient: 1_000,
      updatedAtServer: 1_000,
      serverVersion: 1,
    });
    const server = createServerSnapshot({
      serverBody: 'server newer value',
      serverUpdatedAt: 2_000,
      serverVersion: 2,
    });

    const resolution = resolver.resolveLastWriteWins(local, server);

    expect(resolution).toEqual({
      clientId: 'message-1',
      winner: 'server',
      localTimestamp: 1_000,
      serverTimestamp: 2_000,
      resolvedBody: 'server newer value',
      serverVersion: 2,
    });
  });

  it('updates an older local message from server state', () => {
    const local = createMessageRecord({
      body: 'local older',
      updatedAtClient: 1_000,
      updatedAtServer: 1_000,
    });
    const server = createServerSnapshot({
      serverBody: 'server wins',
      serverUpdatedAt: 3_000,
      serverVersion: 4,
    });

    const resolution = resolver.applyServerAuthoritativeResolution(
      local,
      server,
      4_000,
    );

    expect(resolution.winner).toBe('server');
    expect(mockApplyServerAuthoritativeMessage).toHaveBeenCalledWith(
      server,
      4_000,
    );
  });

  it('keeps a newer local message when LWW says local wins', () => {
    const local = createMessageRecord({
      body: 'local newer',
      updatedAtClient: 5_000,
      updatedAtServer: null,
    });
    const server = createServerSnapshot({
      serverBody: 'server older',
      serverUpdatedAt: 3_000,
      serverVersion: 2,
    });

    const resolution = resolver.applyServerAuthoritativeResolution(
      local,
      server,
      6_000,
    );

    expect(resolution).toMatchObject({
      winner: 'local',
      resolvedBody: 'local newer',
    });
    expect(mockApplyServerAuthoritativeMessage).not.toHaveBeenCalled();
  });

  it('marks a 409 send response as conflicted with local and server metadata', () => {
    const message = createQueueCandidate();
    const payload = createConflictPayload({
      serverBody: 'server body',
      serverUpdatedAt: 7_000,
      serverVersion: 5,
      reason: 'server-newer',
    });
    const error = new MessageConflictError(payload);

    const result = resolver.resolveServerAuthoritativeConflict(
      message,
      error,
      8_000,
    );

    expect(result).toEqual({
      clientId: 'message-1',
      status: 'conflicted',
      reason: 'server-newer',
      localBody: 'local body',
      serverBody: 'server body',
      serverUpdatedAt: 7_000,
      serverVersion: 5,
      resolvedAt: 8_000,
    });
    expect(mockMarkMessageConflicted).toHaveBeenCalledWith({
      clientId: 'message-1',
      localBody: 'local body',
      serverId: 'server-1',
      serverBody: 'server body',
      serverCreatedAt: 1_500,
      serverUpdatedAt: 7_000,
      serverVersion: 5,
      reason: 'server-newer',
      now: 8_000,
    });
  });

  it('recognizes plain HTTP 409 conflict-shaped errors', () => {
    expect(
      resolver.isMessageConflictError({
        status: 409,
        payload: createConflictPayload({}),
      }),
    ).toBe(true);
  });
});

function createMessageRecord(
  overrides: Partial<MessageRecord>,
): MessageRecord {
  return {
    clientId: 'message-1',
    serverId: 'server-1',
    sessionId: 'session-1',
    senderId: 'user-1',
    body: 'local body',
    direction: 'outgoing',
    status: 'sent',
    priority: 'normal',
    idempotencyKey: 'send:message-1',
    retryCount: 0,
    nextAttemptAt: 0,
    lastError: null,
    createdAtClient: 900,
    updatedAtClient: 1_000,
    createdAtServer: 950,
    updatedAtServer: 1_000,
    serverVersion: 1,
    conflictedAt: null,
    conflictReason: null,
    conflictLocalBody: null,
    conflictServerBody: null,
    conflictServerUpdatedAt: null,
    conflictServerVersion: null,
    ...overrides,
  };
}

function createServerSnapshot(
  overrides: Partial<ServerMessageSnapshot>,
): ServerMessageSnapshot {
  return {
    clientId: 'message-1',
    serverId: 'server-1',
    serverBody: 'server body',
    serverCreatedAt: 950,
    serverUpdatedAt: 2_000,
    serverVersion: 2,
    ...overrides,
  };
}

function createQueueCandidate(): QueueCandidate {
  return {
    clientId: 'message-1',
    sessionId: 'session-1',
    body: 'local body',
    priority: 'normal',
    idempotencyKey: 'send:message-1',
    retryCount: 0,
    nextAttemptAt: 0,
    createdAtClient: 900,
  };
}

function createConflictPayload(
  overrides: Partial<ServerConflictPayload>,
): ServerConflictPayload {
  return {
    clientId: 'message-1',
    serverId: 'server-1',
    serverBody: 'server body',
    serverCreatedAt: 1_500,
    serverUpdatedAt: 2_000,
    serverVersion: 2,
    reason: 'server-newer',
    ...overrides,
  };
}
