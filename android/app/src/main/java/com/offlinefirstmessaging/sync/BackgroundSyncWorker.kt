package com.offlinefirstmessaging.sync

import android.content.ComponentName
import android.content.Context
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class BackgroundSyncWorker(
  appContext: Context,
  workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
  override suspend fun doWork(): Result {
    Log.i(TAG, "WorkManager background sync wake-up received")

    return try {
      HeadlessJsTaskService.acquireWakeLockNow(applicationContext)
      val service = applicationContext.startService(
        BackgroundSyncHeadlessService.createIntent(applicationContext, runAttemptCount),
      )
      handleServiceStartResult(service)
    } catch (exception: SecurityException) {
      Log.e(TAG, "Missing permission to start background sync headless service", exception)
      Result.failure()
    } catch (exception: IllegalStateException) {
      Log.w(TAG, "Android deferred background sync service start", exception)
      Result.retry()
    } catch (exception: RuntimeException) {
      Log.e(TAG, "Unexpected background sync service start failure", exception)
      Result.retry()
    }
  }

  private fun handleServiceStartResult(service: ComponentName?): Result {
    if (service == null) {
      Log.e(TAG, "Background sync headless service was not found")
      return Result.failure()
    }

    Log.i(TAG, "Background sync headless service started: ${service.className}")
    return Result.success()
  }

  companion object {
    private const val TAG = "OfflineSyncWorker"
  }
}
