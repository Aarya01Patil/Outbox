import React from 'react';
import {FlatList} from 'react-native';
import {NetInfoStateType} from '@react-native-community/netinfo';
import {fireEvent, render, screen} from '@testing-library/react-native';

import {ChatScreen} from '../../src/ui/screens/ChatScreen';
import type {UseMessagesResult} from '../../src/hooks/useMessages';
import type {NetworkStatus} from '../../src/hooks/useNetworkStatus';
import type {SyncStatusSnapshot} from '../../src/sync/syncStatusStore';
import type {MessageRecord} from '../../src/types/message';

const mockUseMessages = jest.fn<UseMessagesResult, []>();
const mockUseNetworkStatus = jest.fn<NetworkStatus, []>();
const mockUseSyncStatus = jest.fn<SyncStatusSnapshot, []>();

jest.mock('../../src/hooks/useMessages', () => ({
  useMessages: () => mockUseMessages(),
}));

jest.mock('../../src/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}));

jest.mock('../../src/hooks/useSyncStatus', () => ({
  useSyncStatus: () => mockUseSyncStatus(),
}));

describe('ChatScreen', () => {
  const sendMessage = jest.fn<Promise<void>, [string]>(async () => undefined);
  const retryQueuedMessage = jest.fn<Promise<void>, [string]>(
    async () => undefined,
  );
  const resolveConflict = jest.fn<void, [string, string]>();
  const syncNow = jest.fn<Promise<void>, []>(async () => undefined);
  const seedMessages = jest.fn<Promise<void>, [number]>(async () => undefined);
  const onBack = jest.fn<void, []>();

  beforeEach(() => {
    sendMessage.mockClear();
    retryQueuedMessage.mockClear();
    resolveConflict.mockClear();
    syncNow.mockClear();
    seedMessages.mockClear();
    onBack.mockClear();
    mockUseMessages.mockReturnValue({
      messages: [createMessage({status: 'failed'})],
      loading: false,
      busy: false,
      messageCount: 1,
      loadedCount: 1,
      sendMessage,
      retryQueuedMessage,
      resolveConflict,
      syncNow,
      seedMessages,
      refreshMessages: jest.fn(),
      loadMoreMessages: jest.fn(),
    });
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: NetInfoStateType.wifi,
    });
    mockUseSyncStatus.mockReturnValue(createSyncStatus({phase: 'idle'}));
  });

  it('sends, retries, syncs from visible controls', () => {
    render(
      <ChatScreen
        sessionId="test-session"
        sessionName="Test"
        onBack={onBack}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Message body'), 'hello');
    fireEvent.press(screen.getByRole('button', {name: 'Send message'}));
    fireEvent.press(screen.getByRole('button', {name: 'Retry message message-1'}));
    fireEvent.press(screen.getByRole('button', {name: 'Sync now'}));

    expect(sendMessage).toHaveBeenCalledWith('hello');
    expect(retryQueuedMessage).toHaveBeenCalledWith('message-1');
    expect(syncNow).toHaveBeenCalledTimes(1);
  });

  it('passes estimatedItemSize to FlashList for 10k performance', () => {
    render(
      <ChatScreen
        sessionId="test-session"
        sessionName="Test"
        onBack={onBack}
      />,
    );

    const flatList = screen.UNSAFE_getByType(FlatList);
    expect(flatList.props.estimatedItemSize).toBe(112);
    expect(flatList.props.inverted).toBe(true);
  });

  it('calls onBack when back button is pressed', () => {
    render(
      <ChatScreen
        sessionId="test-session"
        sessionName="Test"
        onBack={onBack}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', {name: 'Go back to conversations'}),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows session name in header', () => {
    render(
      <ChatScreen
        sessionId="test-session"
        sessionName="Work Chat"
        onBack={onBack}
      />,
    );

    expect(screen.getByText('Work Chat')).toBeTruthy();
  });
});

function createMessage(overrides: Partial<MessageRecord>): MessageRecord {
  return {
    clientId: 'message-1',
    serverId: null,
    sessionId: 'session-1',
    senderId: 'local-user',
    body: 'Needs retry',
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
