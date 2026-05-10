import {useSyncExternalStore} from 'react';

import {
  getSyncStatusSnapshot,
  subscribeSyncStatus,
  type SyncStatusSnapshot,
} from '../sync/syncStatusStore';

export function useSyncStatus(): SyncStatusSnapshot {
  return useSyncExternalStore(
    subscribeSyncStatus,
    getSyncStatusSnapshot,
    getSyncStatusSnapshot,
  );
}
