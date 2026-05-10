package com.offlinefirstmessaging.sync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BackgroundSyncBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED -> {
        Log.i(TAG, "Rescheduling background sync after ${intent.action}")
        BackgroundSyncScheduler.schedule(context.applicationContext)
      }
      else -> Log.w(TAG, "Ignoring unexpected boot receiver intent")
    }
  }

  companion object {
    private const val TAG = "OfflineSyncBoot"
  }
}
