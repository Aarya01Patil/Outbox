import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';

import {MessageRow} from '../../src/ui/components/MessageRow';
import {OfflineBanner} from '../../src/ui/components/OfflineBanner';
import {SyncIndicator} from '../../src/ui/components/SyncIndicator';
import type {MessageRecord} from '../../src/types/message';
import type {SyncStatusSnapshot} from '../../src/sync/syncStatusStore';

describe('Part D UI components', () => {
  it('renders message status and exposes retry action accessibly', () => {
    const onRetry = jest.fn<void, [string]>();

    render(<MessageRow message={createMessage({status: 'failed'})} onRetry={onRetry} />);

    expect(screen.getByText('Failed')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {name: 'Retry message message-1'}));
    expect(onRetry).toHaveBeenCalledWith('message-1');
  });

  it('shows conflict metadata without relying on color alone', () => {
    render(
      <MessageRow
        message={createMessage({
          status: 'conflicted',
          conflictServerBody: 'Server copy wins',
          lastError: '409 conflict: server-newer',
        })}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('Conflict')).toBeTruthy();
    expect(screen.getByText('Server version')).toBeTruthy();
    expect(screen.getByText('Server copy wins')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Retry message message-1'})).toBeTruthy();
  });

  it('renders offline and online network states', () => {
    const {rerender} = render(<OfflineBanner isConnected={false} />);

    expect(screen.getByText('Offline. Messages stay in the queue.')).toBeTruthy();

    rerender(<OfflineBanner isConnected />);
    expect(screen.getByText('Online')).toBeTruthy();
  });

  it('summarizes running and conflicted sync state', () => {
    const {rerender} = render(
      <SyncIndicator status={createSyncStatus({phase: 'running'})} />,
    );

    expect(screen.getByText('Syncing queue')).toBeTruthy();

    rerender(
      <SyncIndicator
        status={createSyncStatus({
          phase: 'succeeded',
          lastSummary: {
            started: true,
            skippedReason: null,
            processed: 1,
            sent: 0,
            retried: 0,
            failed: 0,
            conflicted: 1,
            batches: 1,
            circuitOpenUntil: null,
          },
        })}
      />,
    );

    expect(screen.getByText('1 conflict')).toBeTruthy();
  });
});

function createMessage(overrides: Partial<MessageRecord>): MessageRecord {
  return {
    clientId: 'message-1',
    serverId: null,
    sessionId: 'session-1',
    senderId: 'local-user',
    body: 'Hello from Outbox',
    direction: 'outgoing',
    status: 'sent',
    priority: 'normal',
    idempotencyKey: 'send:message-1',
    retryCount: 0,
    nextAttemptAt: 0,
    lastError: null,
    createdAtClient: 1_000,
    updatedAtClient: 1_000,
    createdAtServer: null,
    updatedAtServer: null,
    serverVersion: null,
    conflictedAt: null,
    conflictReason: null,
    conflictLocalBody: null,
    conflictServerBody: null,
    conflictServerUpdatedAt: null,
    conflictServerVersion: null,
    ...overrides,
  };
}

function createSyncStatus(
  overrides: Partial<SyncStatusSnapshot>,
): SyncStatusSnapshot {
  return {
    phase: 'idle',
    source: null,
    taskId: null,
    startedAt: null,
    finishedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastTimeoutAt: null,
    lastErrorMessage: null,
    lastSummary: null,
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    timeoutCount: 0,
    ...overrides,
  };
}
