type ComponentProvider = () => unknown;

const mockRegisterComponent = jest.fn<string, [string, ComponentProvider]>(
  () => 'OfflineFirstMessaging',
);
const mockRegisterBackgroundFetchHeadlessTask = jest.fn<void, []>();
const mockRegisterWorkManagerHeadlessTask = jest.fn<void, []>();

jest.mock('react-native', () => ({
  AppRegistry: {
    registerComponent: mockRegisterComponent,
  },
}));

jest.mock('../../src/sync/backgroundSync', () => ({
  registerBackgroundFetchHeadlessTask: mockRegisterBackgroundFetchHeadlessTask,
  registerWorkManagerHeadlessTask: mockRegisterWorkManagerHeadlessTask,
}));

jest.mock('../../App', () => ({
  __esModule: true,
  default: function MockApp(): null {
    return null;
  },
}));

describe('index background task registration', () => {
  beforeEach(() => {
    mockRegisterComponent.mockClear();
    mockRegisterBackgroundFetchHeadlessTask.mockClear();
    mockRegisterWorkManagerHeadlessTask.mockClear();
  });

  it('registers both JS headless task entrypoints before the app component', () => {
    jest.isolateModules(() => {
      require('../../index');
    });

    expect(mockRegisterBackgroundFetchHeadlessTask).toHaveBeenCalledTimes(1);
    expect(mockRegisterWorkManagerHeadlessTask).toHaveBeenCalledTimes(1);

    const appRegistration = mockRegisterComponent.mock.calls[0];

    if (appRegistration === undefined) {
      throw new Error('Expected app component registration');
    }

    expect(appRegistration[0]).toBe('OfflineFirstMessaging');
    expect(typeof appRegistration[1]).toBe('function');
  });
});
