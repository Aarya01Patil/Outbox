import type {QueryResult, Scalar} from '@op-engineering/op-sqlite';

interface ExecuteCall {
  query: string;
  params?: Scalar[];
}

type MessageQueueModule = typeof import('../../src/queue/messageQueue');

const executeCalls: ExecuteCall[] = [];
const mockExecuteSync = jest.fn<QueryResult, [string, Scalar[]?]>(
  (query: string, params?: Scalar[]): QueryResult => {
    executeCalls.push({query, params});
    return {rows: [], rowsAffected: 1};
  },
);

describe('messageQueue conflict metadata writes', () => {
  let queue: MessageQueueModule;

  beforeEach(() => {
    jest.resetModules();
    executeCalls.length = 0;
    mockExecuteSync.mockClear();
    jest.doMock('../../src/db/database', () => ({
      executeSync: mockExecuteSync,
      queryOne: jest.fn(),
      queryRows: jest.fn(),
      runInImmediateTransaction: jest.fn((work: () => void) => {
        work();
      }),
    }));
    queue = require('../../src/queue/messageQueue') as MessageQueueModule;
  });

  it('manual retry clears failure and conflict state before requeueing', () => {
    queue.retryMessage({clientId: 'message-1', now: 5_000});

    const update = readOnlyExecuteCall();

    expect(normalizeSql(update.query)).toContain("SET status = 'queued'");
    expect(normalizeSql(update.query)).toContain('last_error = NULL');
    expect(normalizeSql(update.query)).toContain('conflicted_at = NULL');
    expect(normalizeSql(update.query)).toContain('conflict_reason = NULL');
    expect(normalizeSql(update.query)).toContain('conflict_local_body = NULL');
    expect(normalizeSql(update.query)).toContain('conflict_server_body = NULL');
    expect(normalizeSql(update.query)).toContain(
      'conflict_server_updated_at = NULL',
    );
    expect(normalizeSql(update.query)).toContain(
      'conflict_server_version = NULL',
    );
    expect(update.params).toEqual([5_000, 5_000, 'message-1']);
  });

  it('server-authoritative update applies server state and clears conflict metadata', () => {
    queue.applyServerAuthoritativeMessage(
      {
        clientId: 'message-1',
        serverId: 'server-1',
        serverBody: 'server accepted body',
        serverCreatedAt: 1_000,
        serverUpdatedAt: 2_000,
        serverVersion: 3,
      },
      3_000,
    );

    const update = readOnlyExecuteCall();

    expect(normalizeSql(update.query)).toContain("SET status = 'sent'");
    expect(normalizeSql(update.query)).toContain('body = ?');
    expect(normalizeSql(update.query)).toContain('retry_count = 0');
    expect(normalizeSql(update.query)).toContain('conflicted_at = NULL');
    expect(normalizeSql(update.query)).toContain('conflict_reason = NULL');
    expect(update.params).toEqual([
      'server-1',
      'server accepted body',
      1_000,
      2_000,
      3,
      3_000,
      'message-1',
    ]);
  });
});

function readOnlyExecuteCall(): ExecuteCall {
  const call = executeCalls[0];

  if (call === undefined) {
    throw new Error('Expected one executeSync call');
  }

  return call;
}

function normalizeSql(query: string): string {
  return query.replace(/\s+/g, ' ').trim();
}
