import type {QueueCandidate, SentMessageReceipt} from '../../src/types/message';

const mockGetPendingBatch = jest.fn<QueueCandidate[], [number, number]>();
const mockMarkMessageSending = jest.fn<void, [string, number?]>();
const mockMarkMessageSent = jest.fn<void, [SentMessageReceipt, number?]>();
const mockMarkMessageForRetry = jest.fn<
  void,
  [string, number, number, string, number?]
>();
const mockMarkMessagePermanentlyFailed = jest.fn<
  void,
  [string, number, string, number?]
>();

import {
  getIsSyncing,
  resetSyncProcessorStateForTests,
  runSyncProcessor,
} from '../../src/queue/syncProcessor';
import type {MessageSender} from '../../src/types/sync';

const queueMessage: QueueCandidate = {
  clientId: 'message-1',
  sessionId: 'session-1',
  body: 'hello',
  priority: 'normal',
  idempotencyKey: 'send:message-1',
  retryCount: 0,
  nextAttemptAt: 0,
  createdAtClient: 100,
};

const queue = {
  getPendingBatch: mockGetPendingBatch,
  markMessageSending: mockMarkMessageSending,
  markMessageSent: mockMarkMessageSent,
  markMessageForRetry: mockMarkMessageForRetry,
  markMessagePermanentlyFailed: mockMarkMessagePermanentlyFailed,
};

describe('runSyncProcessor', () => {
  beforeEach(() => {
    mockGetPendingBatch.mockReset();
    mockMarkMessageSending.mockReset();
    mockMarkMessageSent.mockReset();
    mockMarkMessageForRetry.mockReset();
    mockMarkMessagePermanentlyFailed.mockReset();
    resetSyncProcessorStateForTests();
  });

  it('skips a concurrent run while the mutex is held', async () => {
    let resolveSend: (receipt: SentMessageReceipt) => void = () => undefined;
    const sendPromise = new Promise<SentMessageReceipt>(resolve => {
      resolveSend = resolve;
    });
    const sender: MessageSender = {
      sendQueuedMessage: jest.fn(() => sendPromise),
    };

    mockGetPendingBatch
      .mockReturnValueOnce([queueMessage])
      .mockReturnValueOnce([]);

    const firstRun = runSyncProcessor({sender, queue, now: () => 1_000});
    await Promise.resolve();

    expect(getIsSyncing()).toBe(true);

    const secondRun = await runSyncProcessor({sender, queue, now: () => 1_000});
    expect(secondRun).toMatchObject({
      started: false,
      skippedReason: 'already-syncing',
    });

    resolveSend({
      clientId: 'message-1',
      serverId: 'server-1',
      createdAtServer: 2_000,
      updatedAtServer: 2_000,
      serverVersion: 1,
    });

    await firstRun;
    expect(getIsSyncing()).toBe(false);
  });

  it('releases the mutex in finally after a send failure', async () => {
    const sender: MessageSender = {
      sendQueuedMessage: jest.fn(async () => {
        throw new Error('network down');
      }),
    };

    mockGetPendingBatch
      .mockReturnValueOnce([queueMessage])
      .mockReturnValueOnce([]);

    const summary = await runSyncProcessor({sender, queue, now: () => 1_000});

    expect(summary.retried).toBe(1);
    expect(mockMarkMessageForRetry).toHaveBeenCalledWith(
      'message-1',
      1,
      2_000,
      'network down',
      1_000,
    );
    expect(getIsSyncing()).toBe(false);
  });
});
