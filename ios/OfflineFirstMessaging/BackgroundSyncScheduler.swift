import BackgroundTasks
import Foundation
import UIKit

enum BackgroundSyncScheduler {
  static let refreshTaskIdentifier = "com.offlinefirstmessaging.sync.refresh"
  static let processingTaskIdentifier = "com.offlinefirstmessaging.sync.processing"

  private static let operationQueue: OperationQueue = {
    let queue = OperationQueue()
    queue.maxConcurrentOperationCount = 1
    queue.qualityOfService = .utility
    return queue
  }()

  static func register() {
    guard #available(iOS 13.0, *) else {
      return
    }

    let didRegisterRefreshTask = BGTaskScheduler.shared.register(
      forTaskWithIdentifier: refreshTaskIdentifier,
      using: nil
    ) { task in
      guard let task = task as? BGAppRefreshTask else {
        task.setTaskCompleted(success: false)
        return
      }

      handleAppRefresh(task: task)
    }

    if !didRegisterRefreshTask {
      NSLog("[BackgroundSync] Failed to register app refresh task")
    }

    let didRegisterProcessingTask = BGTaskScheduler.shared.register(
      forTaskWithIdentifier: processingTaskIdentifier,
      using: nil
    ) { task in
      guard let task = task as? BGProcessingTask else {
        task.setTaskCompleted(success: false)
        return
      }

      handleProcessing(task: task)
    }

    if !didRegisterProcessingTask {
      NSLog("[BackgroundSync] Failed to register processing task")
    }
  }

  static func schedule() {
    guard #available(iOS 13.0, *) else {
      return
    }

    scheduleAppRefresh()
    scheduleProcessing()
  }

  @available(iOS 13.0, *)
  private static func handleAppRefresh(task: BGAppRefreshTask) {
    scheduleAppRefresh()

    let operation = BackgroundSyncOperation()
    task.expirationHandler = {
      operation.cancel()
    }

    operation.completionBlock = { [weak operation] in
      task.expirationHandler = nil
      task.setTaskCompleted(success: operation?.isCancelled == false)
    }

    operationQueue.addOperation(operation)
  }

  @available(iOS 13.0, *)
  private static func handleProcessing(task: BGProcessingTask) {
    scheduleProcessing()

    let operation = BackgroundSyncOperation()
    task.expirationHandler = {
      operation.cancel()
    }

    operation.completionBlock = { [weak operation] in
      task.expirationHandler = nil
      task.setTaskCompleted(success: operation?.isCancelled == false)
    }

    operationQueue.addOperation(operation)
  }

  @available(iOS 13.0, *)
  private static func scheduleAppRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: refreshTaskIdentifier)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)

    do {
      BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: refreshTaskIdentifier)
      try BGTaskScheduler.shared.submit(request)
    } catch {
      NSLog("[BackgroundSync] Failed to schedule app refresh: \(error)")
    }
  }

  @available(iOS 13.0, *)
  private static func scheduleProcessing() {
    let request = BGProcessingTaskRequest(identifier: processingTaskIdentifier)
    request.requiresNetworkConnectivity = true
    request.requiresExternalPower = false
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)

    do {
      BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: processingTaskIdentifier)
      try BGTaskScheduler.shared.submit(request)
    } catch {
      NSLog("[BackgroundSync] Failed to schedule processing: \(error)")
    }
  }
}

final class BackgroundSyncOperation: Operation {
  override func main() {
    if isCancelled {
      return
    }

    // iOS force-quit limitation: if the user force-quits the app, iOS will not relaunch it for background tasks until the user manually opens it again.
    Thread.sleep(forTimeInterval: 0.1)
  }
}
