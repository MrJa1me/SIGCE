const API_URL = '/api';

// Map snake_case from API to camelCase for frontend
function mapCheckin(c) {
  if (!c) return c;
  // Handle arrays
  if (Array.isArray(c)) return c.map(mapCheckin);
  // Handle objects
  const mapped = {};
  for (const [key, value] of Object.entries(c)) {
    // Convert snake_case to camelCase
    let camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    // Special case: 'comments' -> 'comment' (frontend uses singular)
    if (camelKey === 'comments') camelKey = 'comment';
    mapped[camelKey] = value;
  }
  return mapped;
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Credenciales inválidas');
  }
  return res.json();
}

export async function register({ username, password, name, rut, email }) {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, name, rut, email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar');
  return data;
}

export async function getTravelerCheckins(userId, rut) {
  const results = [];
  const seen = new Set();

  if (userId) {
    const res = await fetch(`${API_URL}/checkins?userId=${userId}&role=traveler`);
    if (res.ok) {
      for (const item of mapCheckin(await res.json())) {
        const key = item.localId || item.id;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(item);
        }
      }
    }
  }

  if (rut) {
    const res = await fetch(`${API_URL}/checkins/by-rut/${encodeURIComponent(rut)}`);
    if (res.ok) {
      for (const item of mapCheckin(await res.json())) {
        const key = item.localId || item.id;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(item);
        }
      }
    }
  }

  return results.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
}

export async function getCheckins(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/checkins${query ? '?' + query : ''}`);
  const data = await res.json();
  return mapCheckin(data);
}

export async function getCheckinsByRut(rut) {
  const res = await fetch(`${API_URL}/checkins/by-rut/${encodeURIComponent(rut)}`);
  if (!res.ok) throw new Error('Error al obtener trámites');
  const data = await res.json();
  return mapCheckin(data);
}

export async function getPendingCheckins() {
  const res = await fetch(`${API_URL}/checkins/pending`);
  const data = await res.json();
  return mapCheckin(data);
}

export async function getCheckin(id) {
  const res = await fetch(`${API_URL}/checkins/${id}`);
  if (!res.ok) throw new Error('No encontrado');
  const data = await res.json();
  return mapCheckin(data);
}

export async function getVerifyCheckin(id) {
  const res = await fetch(`${API_URL}/checkins/${encodeURIComponent(id)}/verify`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Trámite no encontrado');
  }
  return mapCheckin(await res.json());
}

export async function createCheckin(data) {
  const res = await fetch(`${API_URL}/checkins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function batchSync(items) {
  const res = await fetch(`${API_URL}/checkins/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return res.json();
}

export async function updatePdiReview(id, review) {
  const res = await fetch(`${API_URL}/checkins/${id}/pdi`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });
  if (!res.ok) throw new Error('Error al actualizar revisión PDI');
  return res.json();
}

export async function updateCheckinStatus(id, status, processedBy, comment) {
  const res = await fetch(`${API_URL}/checkins/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, processedBy, comment }),
  });
  return res.json();
}

export async function syncData(localCheckins) {
  const res = await fetch(`${API_URL}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ localCheckins }),
  });
  const data = await res.json();
  if (data.serverCheckins) {
    data.serverCheckins = mapCheckin(data.serverCheckins);
  }
  return data;
}

export function getDocumentUrl(docId) {
  return `${API_URL}/documents/${docId}`;
}

export async function getDocuments(checkinId) {
  const res = await fetch(`${API_URL}/checkins/${encodeURIComponent(checkinId)}/documents`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Error al cargar documentos');
  }
  return res.json();
}

export async function uploadDocument(checkinId, file, { label, uploadedBy } = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (label) formData.append('label', label);
  if (uploadedBy) formData.append('uploadedBy', uploadedBy);

  const res = await fetch(`${API_URL}/checkins/${encodeURIComponent(checkinId)}/documents`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al subir documento');
  return data;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function getAdminStats(days = 14) {
  const res = await fetch(`${API_URL}/admin/stats?days=${days}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudieron cargar las estadísticas');
  }
  return res.json();
}
