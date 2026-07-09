import { getUnsyncedCheckins, markSynced, updateLocalStatus, getPendingChanges, clearPendingChanges, saveCheckinLocally, getLocalCheckins } from './offlineDb';
import { syncData, updateCheckinStatus } from './api';

export function isOnline() {
  return navigator.onLine;
}

export function onNetworkChange(callback) {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
}

// Full sync: push unsynced data and pull server updates
export async function performSync() {
  if (!isOnline()) {
    console.log('[SIGCE] Offline, sync postergado');
    return { synced: false, reason: 'offline' };
  }

  try {
    // 1. Push unsynced check-ins to server
    const unsynced = await getUnsyncedCheckins();
    let pushedCount = 0;

    if (unsynced.length > 0) {
      const result = await syncData(unsynced);
      for (const r of result.results) {
        if (r.status === 'created' || r.status === 'updated') {
          await markSynced(r.localId, r.serverId);
          pushedCount++;
        }
        // If server_newer, update local
        if (r.status === 'server_newer' && r.serverData) {
          await updateLocalStatus(r.localId, r.serverData.status, r.serverData.comment);
          await markSynced(r.localId, r.serverData.id);
        }
      }
    }

    // 2. Push pending status changes (official actions done offline)
    const pendingChanges = await getPendingChanges();
    for (const change of pendingChanges) {
      try {
        await updateCheckinStatus(change.localId, change.status, change.processedBy, change.comment);
      } catch (e) {
        console.warn('Error syncing status change:', change.localId, e.message);
      }
    }
    await clearPendingChanges();

    // 3. Pull server check-ins and merge
    const local = await getLocalCheckins();
    const serverData = result?.serverCheckins || [];

    // Update local with any server changes
    for (const serverItem of serverData) {
      if (serverItem.localId) {
        await updateLocalStatus(serverItem.localId, serverItem.status, serverItem.comment);
        await markSynced(serverItem.localId, serverItem.id);
      }
    }

    console.log(`[SIGCE] Sync completo: ${pushedCount} enviados, ${serverData.length} en servidor`);
    return { synced: true, pushed: pushedCount, serverTotal: serverData.length };
  } catch (error) {
    console.error('[SIGCE] Error de sync:', error.message);
    return { synced: false, reason: error.message };
  }
}

// Schedule periodic sync
let syncInterval = null;

export function startPeriodicSync(intervalMs = 30000) {
  stopPeriodicSync();
  console.log(`[SIGCE] Sync automático cada ${intervalMs / 1000}s`);
  syncInterval = setInterval(performSync, intervalMs);
  // Also sync on online event
  window.addEventListener('online', handleOnlineSync);
}

export function stopPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  window.removeEventListener('online', handleOnlineSync);
}

async function handleOnlineSync() {
  console.log('[SIGCE] Conexión recuperada, sincronizando...');
  await performSync();
}
