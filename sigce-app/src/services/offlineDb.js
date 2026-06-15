const DB_NAME = 'SIGCE_OfflineDB';
const DB_VERSION = 2;
const STORE_NAME = 'checkins';
const PENDING_STORE = 'pendingSync';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save a check-in locally
export async function saveCheckinLocally(checkin) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const data = {
      ...checkin,
      localId: checkin.localId || crypto.randomUUID(),
      synced: false,
      savedAt: new Date().toISOString(),
    };
    store.put(data);
    tx.oncomplete = () => resolve(data);
    tx.onerror = () => reject(tx.error);
  });
}

// Get all local check-ins
export async function getLocalCheckins() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get unsynced check-ins
export async function getUnsyncedCheckins() {
  const all = await getLocalCheckins();
  return all.filter(c => !c.synced);
}

// Mark check-in as synced
export async function markSynced(localId, serverId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const data = getReq.result;
      if (data) {
        data.synced = true;
        data.serverId = serverId;
        data.syncedAt = new Date().toISOString();
        store.put(data);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Update local check-in status from server sync
export async function updateLocalStatus(localId, status, comment) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const data = getReq.result;
      if (data) {
        data.status = status;
        if (comment) data.comment = comment;
        data.updatedFromServer = new Date().toISOString();
        store.put(data);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Update local check-in status by user action (official)
export async function updateLocalCheckinStatus(localId, status, processedBy, comment) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const data = getReq.result;
      if (data) {
        data.status = status;
        data.processedBy = processedBy;
        if (comment) data.comment = comment;
        data.processedAt = new Date().toISOString();
        data.version = (data.version || 1) + 1;
        data.synced = false; // needs to sync back to server
        store.put(data);
        resolve(data);
      } else {
        reject(new Error('No encontrado localmente'));
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// Queue a status change for sync
export async function queueStatusChange(localId, status, processedBy, comment) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_STORE);
    store.add({ localId, status, processedBy, comment, queuedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get pending status changes
export async function getPendingChanges() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readonly');
    const store = tx.objectStore(PENDING_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Clear pending changes
export async function clearPendingChanges() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
