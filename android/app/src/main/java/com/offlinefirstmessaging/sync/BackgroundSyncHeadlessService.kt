package com.offlinefirstmessaging.sync

import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class BackgroundSyncHeadlessService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    if (intent?.action != ACTION_RUN_SYNC) {
      Log.w(TAG, "Ignoring unexpected headless sync intent")
      return null
    }

    val data = WritableNativeMap().apply {
      putString("taskId", ANDROID_WORK_MANAGER_TASK_ID)
      putBoolean("timeout", false)
      putString("source", "workmanager")
      putInt("attempt", intent.getIntExtra(EXTRA_RUN_ATTEMPT_COUNT, 0))
      putDouble("scheduledAt", intent.getLongExtra(EXTRA_SCHEDULED_AT_MS, 0L).toDouble())
    }

    return HeadlessJsTaskConfig(
      ANDROID_WORK_MANAGER_TASK_ID,
      data,
      TASK_TIMEOUT_MS,
      true,
    )
  }

  companion object {
    private const val TAG = "OfflineSyncHeadless"
    private const val TASK_TIMEOUT_MS = 30_000L
    private const val ACTION_RUN_SYNC = "com.offlinefirstmessaging.sync.RUN_BACKGROUND_SYNC"
    private const val EXTRA_RUN_ATTEMPT_COUNT = "runAttemptCount"
    private const val EXTRA_SCHEDULED_AT_MS = "scheduledAtMs"

    internal const val ANDROID_WORK_MANAGER_TASK_ID =
      "com.offlinefirstmessaging.sync.workmanager"

    internal fun createIntent(context: Context, runAttemptCount: Int): Intent =
      Intent(context, BackgroundSyncHeadlessService::class.java).apply {
        action = ACTION_RUN_SYNC
        putExtra(EXTRA_RUN_ATTEMPT_COUNT, runAttemptCount)
        putExtra(EXTRA_SCHEDULED_AT_MS, System.currentTimeMillis())
      }
  }
}
