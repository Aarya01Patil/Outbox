import React from 'react';
import {render, screen, fireEvent, act} from '@testing-library/react-native';

import {ConversationsScreen} from '../../src/ui/screens/ConversationsScreen';

jest.mock('../../src/queue/messageQueue', () => ({
  getSessionMessageCount: jest.fn(() => 0),
  getLastMessageForSession: jest.fn(() => null),
  seedMessagesForSession: jest.fn(),
}));

jest.mock('../../src/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
}));

jest.mock('../../src/hooks/useSyncStatus', () => ({
  useSyncStatus: () => ({
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
  }),
}));

describe('ConversationsScreen', () => {
  it('shows skeleton loader initially then conversation cards', async () => {
    const onSelect = jest.fn<void, [string, string]>();

    render(<ConversationsScreen onSelectConversation={onSelect} />);

    // Initially shows skeleton
    expect(screen.getByLabelText('Loading conversations')).toBeTruthy();

    // Wait for loading to complete
    await act(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 700));
    });

    // Should show conversation names
    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText('Random')).toBeTruthy();
  });

  it('navigates to chat when a conversation is tapped', async () => {
    const onSelect = jest.fn<void, [string, string]>();

    render(<ConversationsScreen onSelectConversation={onSelect} />);

    await act(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 700));
    });

    fireEvent.press(
      screen.getByRole('button', {name: 'Open General conversation'}),
    );

    expect(onSelect).toHaveBeenCalledWith('general-chat', 'General');
  });

  it('displays the Conversations header', async () => {
    render(
      <ConversationsScreen onSelectConversation={jest.fn()} />,
    );

    expect(screen.getByText('Conversations')).toBeTruthy();
  });
});
