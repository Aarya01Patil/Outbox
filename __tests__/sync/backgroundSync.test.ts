import type {
  BackgroundFetchConfig,
  BackgroundFetchStatus,
  HeadlessEvent,
  TaskConfig,
} from 'react-native-background-fetch';
import type {MessageSender} from '../../src/types/sync';
import type {SyncProcessorConfig, SyncSummary} from '../../src/types/sync';
import type {WorkManagerHeadlessTaskData} from '../../src/sync/backgroundSync';

interface RunSyncProcessorOptions {
  sender: MessageSender;
  config?: Partial<SyncProcessorConfig>;
}

type BackgroundFetchTaskHandler = (taskId: string) => Promise<void> | void;
type BackgroundFetchHeadlessHandler = (event: HeadlessEvent) => Promise<void>;
type WorkManagerHeadlessTask = (
  data?: WorkManagerHeadlessTaskData,
) => Promise<void>;
type WorkManagerTaskProvider = () => WorkManagerHeadlessTask;

interface BackgroundFetchMock {
  STATUS_AVAILABLE: BackgroundFetchStatus;
  NETWORK_TYPE_ANY: number;
  configure: jest.Mock<
    Promise<BackgroundFetchStatus>,
    [BackgroundFetchConfig, BackgroundFetchTaskHandler, BackgroundFetchTaskHandler]
  >;
  scheduleTask: jest.Mock<Promise<boolean>, [TaskConfig]>;
  status: jest.Mock<Promise<BackgroundFetchStatus>, []>;
  finish: jest.Mock<void, [string]>;
  registerHeadlessTask: jest.Mock<void, [BackgroundFetchHeadlessHandler]>;
}

jest.mock('react-native', () => ({
  AppRegistry: {
    registerHeadlessTask: jest.fn(),
  },
}));

jest.mock('../../src/queue/syncProcessor', () => ({
  runSyncProcessor: jest.fn(),
}));

import {AppRegistry} from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import {runSyncProcessor} from '../../src/queue/syncProcessor';
import {
  backgroundFetchHeadlessTask,
  handleBackgroundFetchTimeout,
  handleBackgroundSyncTask,
  registerBackgroundFetchHeadlessTask,
  registerBackgroundSync,
  registerWorkManagerHeadlessTask,
  resetBackgroundSyncRegistrationForTests,
  workManagerHeadlessTask,
} from '../../src/sync/backgroundSync';
import {ANDROID_WORK_MANAGER_TASK_ID} from '../../src/sync/taskIds';
import {
  getSyncStatusSnapshot,
  resetSyncStatusStoreForTests,
  subscribeSyncStatus,
  type SyncStatusSnapshot,
} from '../../src/sync/syncStatusStore';

const backgroundFetchMock = BackgroundFetch as unknown as BackgroundFetchMock;
const mockRunSyncProcessor = runSyncProcessor as unknown as jest.Mock<
  Promise<SyncSummary>,
  [RunSyncProcessorOptions]
>;
const mockRegisterHeadlessTask =
  AppRegistry.registerHeadlessTask as unknown as jest.Mock<
    void,
    [string, WorkManagerTaskProvider]
  >;

describe('background sync JS tasks', () => {
  beforeEach(() => {
    backgroundFetchMock.configure.mockReset();
    backgroundFetchMock.configure.mockResolvedValue(
      backgroundFetchMock.STATUS_AVAILABLE,
    );
    backgroundFetchMock.scheduleTask.mockReset();
    backgroundFetchMock.scheduleTask.mockResolvedValue(true);
    backgroundFetchMock.status.mockReset();
    backgroundFetchMock.status.mockResolvedValue(
      backgroundFetchMock.STATUS_AVAILABLE,
    );
    backgroundFetchMock.finish.mockReset();
    backgroundFetchMock.registerHeadlessTask.mockReset();
    mockRegisterHeadlessTask.mockReset();
    mockRunSyncProcessor.mockReset();
    mockRunSyncProcessor.mockResolvedValue(createSyncSummary());
    resetBackgroundSyncRegistrationForTests();
    resetSyncStatusStoreForTests();
  });

  it('registers bounded BackgroundFetch and WorkManager headless handlers', async () => {
    const registration = await registerBackgroundSync();

    expect(registration).toEqual({
      status: backgroundFetchMock.STATUS_AVAILABLE,
      customTaskScheduled: true,
    });

    const configureConfig = readConfigureConfig();
    expect(configureConfig).toMatchObject({
      minimumFetchInterval: 15,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: backgroundFetchMock.NETWORK_TYPE_ANY,
      requiresBatteryNotLow: true,
    });

    const taskConfig = readScheduledTaskConfig();
    expect(taskConfig).toMatchObject({
      delay: 15 * 60 * 1000,
      periodic: true,
      requiresNetworkConnectivity: true,
      requiredNetworkType: backgroundFetchMock.NETWORK_TYPE_ANY,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    registerBackgroundFetchHeadlessTask();
    expect(backgroundFetchMock.registerHeadlessTask).toHaveBeenCalledWith(
      backgroundFetchHeadlessTask,
    );

    registerWorkManagerHeadlessTask();
    const workManagerRegistration = mockRegisterHeadlessTask.mock.calls[0];

    if (workManagerRegistration === undefined) {
      throw new Error('Expected WorkManager headless task registration');
    }

    expect(workManagerRegistration[0]).toBe(ANDROID_WORK_MANAGER_TASK_ID);
    expect(typeof workManagerRegistration[1]).toBe('function');
  });

  it('runs the processor for configured, headless, and WorkManager work paths', async () => {
    await registerBackgroundSync();

    await readConfiguredOnEvent()('configured-task');
    await backgroundFetchHeadlessTask({
      taskId: 'headless-task',
      timeout: false,
    });
    await workManagerHeadlessTask({taskId: 'work-manager-task'});

    expect(mockRunSyncProcessor).toHaveBeenCalledTimes(3);
    expect(mockRunSyncProcessor.mock.calls[0]?.[0].config).toEqual({
      batchSize: 10,
      maxBatchesPerRun: 1,
    });
    expect(backgroundFetchMock.finish).toHaveBeenCalledWith('configured-task');
    expect(backgroundFetchMock.finish).toHaveBeenCalledWith('headless-task');
    expect(backgroundFetchMock.finish).not.toHaveBeenCalledWith(
      'work-manager-task',
    );
  });

  it('finishes a timeout BackgroundFetch path in finally', async () => {
    const unsubscribe = subscribeSyncStatus(snapshot => {
      if (snapshot.phase === 'timed-out') {
        throw new Error('status listener failed');
      }
    });

    await expect(
      handleBackgroundFetchTimeout('timeout-task'),
    ).rejects.toThrow('status listener failed');

    expect(mockRunSyncProcessor).not.toHaveBeenCalled();
    expect(backgroundFetchMock.finish).toHaveBeenCalledWith('timeout-task');

    unsubscribe();
  });

  it('finishes a BackgroundFetch path when the processor fails', async () => {
    mockRunSyncProcessor.mockRejectedValueOnce(new Error('processor down'));

    await expect(handleBackgroundSyncTask('failed-task')).rejects.toThrow(
      'processor down',
    );

    expect(backgroundFetchMock.finish).toHaveBeenCalledWith('failed-task');
    expect(getSyncStatusSnapshot()).toMatchObject({
      phase: 'failed',
      taskId: 'failed-task',
      lastErrorMessage: 'processor down',
      failureCount: 1,
    });
  });

  it('records sync status transitions across success, failure, and timeout', async () => {
    const snapshots: SyncStatusSnapshot[] = [];
    const unsubscribe = subscribeSyncStatus(snapshot => {
      snapshots.push(snapshot);
    });

    await workManagerHeadlessTask({taskId: 'status-success'});

    mockRunSyncProcessor.mockRejectedValueOnce(new Error('status failure'));
    await expect(workManagerHeadlessTask({taskId: 'status-failure'})).rejects.toThrow(
      'status failure',
    );

    await handleBackgroundFetchTimeout('status-timeout');

    expect(snapshots.map(snapshot => snapshot.phase)).toEqual([
      'idle',
      'running',
      'succeeded',
      'running',
      'failed',
      'timed-out',
    ]);
    expect(getSyncStatusSnapshot()).toMatchObject({
      phase: 'timed-out',
      taskId: 'status-timeout',
      runCount: 2,
      successCount: 1,
      failureCount: 1,
      timeoutCount: 1,
    });

    unsubscribe();
  });
});

function createSyncSummary(): SyncSummary {
  return {
    started: true,
    skippedReason: null,
    processed: 1,
    sent: 1,
    retried: 0,
    failed: 0,
    conflicted: 0,
    batches: 1,
    circuitOpenUntil: null,
  };
}

function readConfigureConfig(): BackgroundFetchConfig {
  const configureCall = backgroundFetchMock.configure.mock.calls[0];

  if (configureCall === undefined) {
    throw new Error('Expected BackgroundFetch.configure to be called');
  }

  return configureCall[0];
}

function readConfiguredOnEvent(): BackgroundFetchTaskHandler {
  const configureCall = backgroundFetchMock.configure.mock.calls[0];

  if (configureCall === undefined) {
    throw new Error('Expected BackgroundFetch.configure to be called');
  }

  return configureCall[1];
}

function readScheduledTaskConfig(): TaskConfig {
  const scheduleTaskCall = backgroundFetchMock.scheduleTask.mock.calls[0];

  if (scheduleTaskCall === undefined) {
    throw new Error('Expected BackgroundFetch.scheduleTask to be called');
  }

  return scheduleTaskCall[0];
}
