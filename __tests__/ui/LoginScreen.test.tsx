import React from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {act} from 'react-test-renderer';

import {LoginScreen} from '../../src/ui/screens/LoginScreen';

describe('LoginScreen', () => {
  it('enters chat from the video handoff screen', () => {
    const onEnter = jest.fn<void, []>();

    render(<LoginScreen onEnter={onEnter} />);

    expect(screen.getByText('Offline-first messaging')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {name: 'Enter chat'}));
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('pauses video when the app backgrounds and resumes when active', () => {
    let appStateHandler: (state: AppStateStatus) => void = () => undefined;
    const addEventListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, handler) => {
        appStateHandler = handler;
        return {remove: jest.fn()};
      });

    render(<LoginScreen onEnter={jest.fn()} />);

    fireEvent(screen.getByTestId('login-video'), 'readyForDisplay');
    act(() => {
      appStateHandler('background');
    });
    expect(screen.getByTestId('login-video').props.paused).toBe(true);

    act(() => {
      appStateHandler('active');
    });
    expect(screen.getByTestId('login-video').props.paused).toBe(false);

    addEventListener.mockRestore();
  });
});
