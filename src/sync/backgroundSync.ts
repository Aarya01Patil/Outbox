import {AppRegistry} from 'react-native';
import BackgroundFetch, {
  type BackgroundFetchConfig,
  type BackgroundFetchStatus,
  type HeadlessEvent,
  type TaskConfig,
} from 'react-native-background-fetch';

import {localAssignmentMessageSender} from '../api/messagesApi';
import {runSyncProcessor} from '../queue/syncProcessor';
import type {SyncProcessorConfig, SyncSummary} from '../types/sync';
import {
  ANDROID_WORK_MANAGER_TASK_ID,
  BACKGROUND_FETCH_TASK_ID,
  IOS_BG_PROCESSING_TASK_ID,
} from './taskIds';
import {
  markSyncFailed,
  markSyncStarted,
  markSyncSucceeded,
  markSyncTimedOut,
  type SyncRunSource,
} from './syncStatusStore';

type BackgroundFetchRunSource = 'background-fetch' | 'background-fetch-headless';

interface BackgroundSyncWorkInput {
  source: SyncRunSource;
  taskId: string;
  now?: () => number;
}

export interface WorkManagerHeadlessTaskData {
  taskId?: string;
}

const BACKGROUND_FETCH_MINIMUM_INTERVAL_MINUTES = 15;
const BACKGROUND_SYNC_TASK_DELAY_MS =
  BACKGROUND_FETCH_MINIMUM_INTERVAL_MINUTES * 60 * 1000;

// Background runners receive short OS windows, so each wake-up handles one small page.
const BACKGROUND_SYNC_PROCESSOR_CONFIG: Partial<SyncProcessorConfig> = {
  batchSize: 10,
  maxBatchesPerRun: 1,
};

let registered = false;
let lastCustomTaskScheduled = false;

export interface BackgroundSyncRegistration {
  status: BackgroundFetchStatus;
  customTaskScheduled: boolean;
}

export async function registerBackgroundSync(): Promise<BackgroundSyncRegistration> {
  if (registered) {
    const status = await BackgroundFetch.status();
    return {status, customTaskScheduled: lastCustomTaskScheduled};
  }

  const backgroundFetchConfig: BackgroundFetchConfig = {
    minimumFetchInterval: BACKGROUND_FETCH_MINIMUM_INTERVAL_MINUTES,
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,
    requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    requiresBatteryNotLow: true,
  };

  // iOS does not run background fetch or BGTaskScheduler tasks after the user
  // force-quits the app. Background work resumes only after the user opens it.
  // Android-only stopOnTerminate/startOnBoot flags do not change that iOS limit.
  const status = await BackgroundFetch.configure(
    backgroundFetchConfig,
    async taskId => {
      await handleBackgroundSyncTask(taskId, 'background-fetch');
    },
    async taskId => {
      await handleBackgroundFetchTimeout(taskId, 'background-fetch');
    },
  );

  // On iOS, BGProcessingTask scheduling via the library requires AppDelegate
  // wiring that conflicts with our native BackgroundSyncScheduler.swift, which
  // already registers com.offlinefirstmessaging.sync.processing directly via
  // BGTaskScheduler. Swallow the library error so the registration succeeds and
  // the BGAppRefreshTask (legacy fetch path) remains active.
  const taskConfig: TaskConfig = {
    taskId: IOS_BG_PROCESSING_TASK_ID,
    delay: BACKGROUND_SYNC_TASK_DELAY_MS,
    periodic: true,
    requiresNetworkConnectivity: true,
    requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    stopOnTerminate: false,
    startOnBoot: true,
  };

  let customTaskScheduled = false;
  try {
    customTaskScheduled = await BackgroundFetch.scheduleTask(taskConfig);
  } catch {
    // Expected on iOS: the library's BGProcessingTask path requires AppDelegate
    // registration. Our native Swift scheduler handles this task independently.
  }

  registered = true;
  lastCustomTaskScheduled = customTaskScheduled;

  return {status, customTaskScheduled};
}

export async function handleBackgroundSyncTask(
  taskId: string,
  source: BackgroundFetchRunSource = 'background-fetch',
): Promise<void> {
  try {
    await runBackgroundSyncWork({source, taskId});
  } finally {
    BackgroundFetch.finish(taskId);
  }
}

export async function handleBackgroundFetchTimeout(
  taskId: string,
  source: BackgroundFetchRunSource = 'background-fetch',
): Promise<void> {
  try {
    markSyncTimedOut({
      source,
      taskId,
      finishedAt: Date.now(),
    });
  } finally {
    BackgroundFetch.finish(taskId);
  }
}

export async function backgroundFetchHeadlessTask(event: HeadlessEvent): Promise<void> {
  if (event.timeout) {
    await handleBackgroundFetchTimeout(event.taskId, 'background-fetch-headless');
    return;
  }

  await handleBackgroundSyncTask(event.taskId, 'background-fetch-headless');
}

export function registerBackgroundFetchHeadlessTask(): void {
  BackgroundFetch.registerHeadlessTask(backgroundFetchHeadlessTask);
}

export async function workManagerHeadlessTask(
  data: WorkManagerHeadlessTaskData = {},
): Promise<void> {
  await runBackgroundSyncWork({
    source: 'work-manager',
    taskId: data.taskId ?? ANDROID_WORK_MANAGER_TASK_ID,
  });
}

export function registerWorkManagerHeadlessTask(): void {
  AppRegistry.registerHeadlessTask(
    ANDROID_WORK_MANAGER_TASK_ID,
    () => workManagerHeadlessTask,
  );
}

export function isKnownBackgroundTask(taskId: string): boolean {
  return (
    taskId === BACKGROUND_FETCH_TASK_ID ||
    taskId === IOS_BG_PROCESSING_TASK_ID ||
    taskId === ANDROID_WORK_MANAGER_TASK_ID ||
    taskId === 'react-native-background-fetch'
  );
}

export function resetBackgroundSyncRegistrationForTests(): void {
  registered = false;
  lastCustomTaskScheduled = false;
}

async function runBackgroundSyncWork(
  input: BackgroundSyncWorkInput,
): Promise<SyncSummary> {
  const now = input.now ?? Date.now;

  markSyncStarted({
    source: input.source,
    taskId: input.taskId,
    startedAt: now(),
  });

  try {
    const summary = await runSyncProcessor({
      sender: localAssignmentMessageSender,
      config: BACKGROUND_SYNC_PROCESSOR_CONFIG,
    });

    markSyncSucceeded({
      source: input.source,
      taskId: input.taskId,
      finishedAt: now(),
      summary,
    });

    return summary;
  } catch (error: unknown) {
    markSyncFailed({
      source: input.source,
      taskId: input.taskId,
      finishedAt: now(),
      error,
    });

    throw error;
  }
}
