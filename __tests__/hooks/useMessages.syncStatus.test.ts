/**
 * Verifies that calling syncNow() from useMessages updates the SyncStatusSnapshot
 * phase to 'running' then 'succeeded', so SyncIndicator reflects foreground sync.
 */

import {renderHook, act} from '@testing-library/react-native';

// Mock database before importing any module that opens it
const mockExecuteSync = jest.fn((query: string) => {
  const q = query.trim().toLowerCase();
  if (q.startsWith('pragma journal_mode')) return {rows: [{journal_mode: 'wal'}], rowsAffected: 0};
  if (q.startsWith('pragma synchronous'))  return {rows: [{synchronous: 2}], rowsAffected: 0};
  if (q.startsWith('pragma user_version')) return {rows: [{user_version: 1}], rowsAffected: 0};
  return {rows: [], rowsAffected: 0};
});

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    executeSync: mockExecuteSync,
    close: jest.fn(),
    closeAsync: jest.fn(async () => undefined),
    delete: jest.fn(),
  })),
}));

import {useMessages} from '../../src/hooks/useMessages';
import {
  getSyncStatusSnapshot,
  resetSyncStatusStoreForTests,
  subscribeSyncStatus,
  type SyncStatusPhase,
} from '../../src/sync/syncStatusStore';
import {resetSyncProcessorStateForTests} from '../../src/queue/syncProcessor';

describe('useMessages — foreground syncNow updates SyncStatusStore', () => {
  beforeEach(() => {
    resetSyncStatusStoreForTests();
    resetSyncProcessorStateForTests();
    mockExecuteSync.mockClear();
  });

  it('transitions idle → running → succeeded when syncNow resolves', async () => {
    const phases: SyncStatusPhase[] = [];

    const unsubscribe = subscribeSyncStatus(snapshot => {
      phases.push(snapshot.phase);
    });

    const {result} = renderHook(() =>
      useMessages({sessionId: 'test-session', senderId: 'test-user'}),
    );

    await act(async () => {
      await result.current.syncNow();
    });

    unsubscribe();

    // Must have transitioned through 'running'
    expect(phases).toContain('running');
    // Final phase must be 'succeeded'
    expect(phases[phases.length - 1]).toBe('succeeded');
    // Store snapshot reflects success
    expect(getSyncStatusSnapshot().phase).toBe('succeeded');
    expect(getSyncStatusSnapshot().source).toBe('foreground');
  });

  it('leaves phase as succeeded after multiple syncNow calls', async () => {
    const {result} = renderHook(() =>
      useMessages({sessionId: 'test-session', senderId: 'test-user'}),
    );

    await act(async () => {
      await result.current.syncNow();
      await result.current.syncNow();
    });

    expect(getSyncStatusSnapshot().phase).toBe('succeeded');
    expect(getSyncStatusSnapshot().successCount).toBeGreaterThanOrEqual(2);
  });
});
