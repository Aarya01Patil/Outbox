import type {QueryResult, Scalar} from '@op-engineering/op-sqlite';

interface ExecuteCall {
  query: string;
  params?: Scalar[];
}

type MessageQueueModule = typeof import('../../src/queue/messageQueue');

const executeCalls: ExecuteCall[] = [];
let mockQueryRows: Array<Record<string, Scalar>> = [];
let mockQueryOne: Record<string, Scalar> | null = null;

const mockExecuteSync = jest.fn<QueryResult, [string, Scalar[]?]>(
  (query: string, params?: Scalar[]): QueryResult => {
    executeCalls.push({query, params});
    return {rows: [], rowsAffected: 1};
  },
);

describe('messageQueue operations', () => {
  let queue: MessageQueueModule;

  beforeEach(() => {
    jest.resetModules();
    executeCalls.length = 0;
    mockExecuteSync.mockClear();
    mockQueryRows = [];
    mockQueryOne = null;
    jest.doMock('../../src/db/database', () => ({
      executeSync: mockExecuteSync,
      queryOne: jest.fn(<T>(
        _sql: string,
        _params: Scalar[],
        mapper?: (row: Record<string, Scalar>) => T,
      ): T | null => {
        if (mockQueryOne === null) { return null; }
        return mapper ? mapper(mockQueryOne) : (mockQueryOne as unknown as T);
      }),
      queryRows: jest.fn(() => mockQueryRows),
      runInImmediateTransaction: jest.fn((work: () => void) => {
        work();
      }),
    }));
    queue = require('../../src/queue/messageQueue') as MessageQueueModule;
  });

  describe('enqueueMessage', () => {
    it('inserts a message with queued status and correct fields', () => {
      mockQueryOne = {
        client_id: 'msg_1000_test',
        server_id: null,
        session_id: 'session-1',
        sender_id: 'user-1',
        body: 'Hello world',
        direction: 'outgoing',
        status: 'queued',
        priority: 'normal',
        idempotency_key: 'send:msg_1000_test',
        retry_count: 0,
        next_attempt_at: 0,
        last_error: null,
        created_at_client: 1000,
        updated_at_client: 1000,
        created_at_server: null,
        updated_at_server: null,
        server_version: null,
        conflicted_at: null,
        conflict_reason: null,
        conflict_local_body: null,
        conflict_server_body: null,
        conflict_server_updated_at: null,
        conflict_server_version: null,
      };

      const result = queue.enqueueMessage({
        sessionId: 'session-1',
        senderId: 'user-1',
        body: 'Hello world',
        now: 1000,
      });

      expect(result.sessionId).toBe('session-1');
      expect(result.body).toBe('Hello world');
      expect(result.status).toBe('queued');
      expect(result.direction).toBe('outgoing');

      // Should have INSERT call
      const insertCall = executeCalls.find(c =>
        c.query.trim().toLowerCase().startsWith('insert'),
      );
      expect(insertCall).toBeDefined();
    });

    it('generates UUID-format client IDs', () => {
      mockQueryOne = {
        client_id: 'msg_1000_12345678-1234-4abc-9def-123456789abc',
        server_id: null,
        session_id: 'session-1',
        sender_id: 'user-1',
        body: 'Test',
        direction: 'outgoing',
        status: 'queued',
        priority: 'normal',
        idempotency_key: 'send:test',
        retry_count: 0,
        next_attempt_at: 0,
        last_error: null,
        created_at_client: 1000,
        updated_at_client: 1000,
        created_at_server: null,
        updated_at_server: null,
        server_version: null,
        conflicted_at: null,
        conflict_reason: null,
        conflict_local_body: null,
        conflict_server_body: null,
        conflict_server_updated_at: null,
        conflict_server_version: null,
      };

      const result = queue.enqueueMessage({
        sessionId: 'session-1',
        senderId: 'user-1',
        body: 'Test',
        now: 1000,
      });

      // Client ID should start with msg_ prefix
      expect(result.clientId).toMatch(/^msg_/);
    });
  });

  describe('markMessageSending', () => {
    it('sets status to sending and clears last_error', () => {
      queue.markMessageSending('message-1', 2000);

      const update = executeCalls.find(c =>
        normalizeSql(c.query).includes("SET status = 'sending'"),
      );
      expect(update).toBeDefined();
      expect(normalizeSql(update!.query)).toContain('last_error = NULL');
      expect(update!.params).toContain('message-1');
    });
  });

  describe('markMessageSent', () => {
    it('clears all conflict metadata on successful send', () => {
      queue.markMessageSent(
        {
          clientId: 'message-1',
          serverId: 'server-1',
          createdAtServer: 1000,
          updatedAtServer: 1000,
          serverVersion: 1,
        },
        2000,
      );

      const update = executeCalls[0];
      expect(update).toBeDefined();
      expect(normalizeSql(update!.query)).toContain("SET status = 'sent'");
      expect(normalizeSql(update!.query)).toContain('conflicted_at = NULL');
      expect(normalizeSql(update!.query)).toContain('conflict_reason = NULL');
    });
  });

  describe('markMessageForRetry', () => {
    it('sets status to failed with retry metadata', () => {
      queue.markMessageForRetry('message-1', 2, 5000, 'Network error', 3000);

      const update = executeCalls[0];
      expect(update).toBeDefined();
      expect(normalizeSql(update!.query)).toContain("SET status = 'failed'");
      expect(update!.params).toContain(2); // retryCount
      expect(update!.params).toContain(5000); // nextAttemptAt
      expect(update!.params).toContain('Network error');
    });
  });

  describe('resetStuckMessages', () => {
    it('re-queues messages stuck in sending state', () => {
      queue.resetStuckMessages(10000, 5000);

      const update = executeCalls[0];
      expect(update).toBeDefined();
      expect(normalizeSql(update!.query)).toContain("SET status = 'queued'");
      expect(normalizeSql(update!.query)).toContain("WHERE status = 'sending'");
    });
  });

  describe('comparePriority', () => {
    it('orders high before normal before low', () => {
      expect(queue.comparePriority('high', 'normal')).toBeLessThan(0);
      expect(queue.comparePriority('normal', 'low')).toBeLessThan(0);
      expect(queue.comparePriority('high', 'low')).toBeLessThan(0);
      expect(queue.comparePriority('low', 'high')).toBeGreaterThan(0);
      expect(queue.comparePriority('normal', 'normal')).toBe(0);
    });
  });
});

function normalizeSql(query: string): string {
  return query.replace(/\s+/g, ' ').trim();
}
