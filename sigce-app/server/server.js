const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const {
  CROSSING_CATALOG,
  SEED_CROSSINGS,
  enrichCrossing,
  buildCustomCrossing,
  mapRowToApi,
} = require('../../services/users/borderCrossingData');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// ---------- Data Persistence ----------
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = {
        users: [],
        checkins: [],
        borderCrossings: SEED_CROSSINGS.map((row) => mapRowToApi(row)),
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (!data.borderCrossings) {
      data.borderCrossings = SEED_CROSSINGS.map((row) => mapRowToApi(row));
      writeData(data);
    }
    return data;
  } catch {
    return { users: [], checkins: [], borderCrossings: SEED_CROSSINGS.map((row) => mapRowToApi(row)) };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Seed demo users
function seedUsers() {
  const data = readData();
  if (data.users.length === 0) {
    data.users.push(
      { id: 1, username: 'admin', password: 'admin123', name: 'Admin Aduanas', role: 'admin' },
      { id: 2, username: 'oficial1', password: 'aduana2026', name: 'María González', role: 'official' },
      { id: 3, username: 'oficial2', password: 'aduana2026', name: 'Carlos Muñoz', role: 'official' },
      { id: 4, username: 'viajero1', password: 'viajero123', name: 'Juan Pérez', role: 'traveler' },
      { id: 5, username: 'viajero2', password: 'viajero123', name: 'Ana Soto', role: 'traveler' }
    );
    writeData(data);
  }
}
seedUsers();

// ---------- Auth ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const data = readData();
  const user = data.users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
});

// ---------- User CRUD (Admin) ----------
app.get('/api/users', (req, res) => {
  const data = readData();
  res.json(data.users);
});

app.get('/api/users/:id', (req, res) => {
  const data = readData();
  const user = data.users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const data = readData();
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (data.users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'El nombre de usuario ya existe' });
  }
  const maxId = data.users.reduce((max, u) => Math.max(max, u.id), 0);
  const newUser = { id: maxId + 1, username, password, name, role };
  data.users.push(newUser);
  writeData(data);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req, res) => {
  const data = readData();
  const user = data.users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const { username, password, name, role } = req.body;
  if (username && username !== user.username) {
    if (data.users.find(u => u.username === username && u.id !== user.id)) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }
    user.username = username;
  }
  if (password) user.password = password;
  if (name) user.name = name;
  if (role) user.role = role;

  writeData(data);
  res.json(user);
});

app.delete('/api/users/:id', (req, res) => {
  const data = readData();
  const idx = data.users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });
  data.users.splice(idx, 1);
  writeData(data);
  res.json({ success: true });
});

function computeAdminStats(data, days = 14) {
  const countBy = (items, field) => items.reduce((acc, item) => {
    const key = item[field] || 'sin-dato';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const dailyCount = (items, dateField) => {
    const map = {};
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    for (const item of items) {
      const raw = item[dateField] || item.createdAt || item.created_at;
      if (!raw) continue;
      const d = new Date(raw);
      if (d < cutoff) continue;
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);

  const checkins = data.checkins || [];
  const users = data.users || [];
  const byStatus = countBy(checkins, 'status');

  const resolved = (byStatus.accepted || 0) + (byStatus.rejected || 0);
  const processed = checkins.filter((c) => c.processedAt || c.processed_at);
  const avgHours = processed.length
    ? processed.reduce((sum, c) => {
      const start = new Date(c.createdAt || c.created_at);
      const end = new Date(c.processedAt || c.processed_at);
      return sum + (end - start) / 3600000;
    }, 0) / processed.length
    : 0;

  return {
    periodDays: days,
    generatedAt: new Date().toISOString(),
    users: {
      total: users.length,
      byRole: countBy(users, 'role'),
      daily: dailyCount(users, 'createdAt'),
    },
    checkins: {
      total: checkins.length,
      today: checkins.filter((c) => (c.createdAt || c.created_at || '').slice(0, 10) === today).length,
      thisWeek: checkins.filter((c) => new Date(c.createdAt || c.created_at) >= weekAgo).length,
      byStatus,
      byType: countBy(checkins, 'checkinType'),
      byCrossing: countBy(checkins, 'borderCrossing'),
      daily: dailyCount(checkins, 'createdAt'),
      byNationality: countBy(checkins, 'nationality'),
    },
    documents: { total: 0 },
    summary: {
      acceptanceRate: resolved > 0 ? Math.round(((byStatus.accepted || 0) / resolved) * 100) : 0,
      pendingCount: (byStatus.pending || 0) + (byStatus.in_review || 0),
      avgProcessingHours: Math.round(avgHours * 10) / 10,
    },
  };
}

app.get('/api/admin/stats', (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 7), 90);
  const data = readData();
  res.json(computeAdminStats(data, days));
});

// ---------- Border Crossings ----------
app.get('/api/border-crossings', (req, res) => {
  const data = readData();
  res.json((data.borderCrossings || []).sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name)));
});

app.get('/api/admin/border-crossings/presets', (req, res) => {
  const data = readData();
  const existing = new Set((data.borderCrossings || []).map((c) => c.id));
  const available = CROSSING_CATALOG
    .filter((p) => !existing.has(p.id))
    .map((p) => mapRowToApi(enrichCrossing(p)));
  res.json(available);
});

app.get('/api/admin/border-crossings', (req, res) => {
  const data = readData();
  res.json(data.borderCrossings || []);
});

app.post('/api/admin/border-crossings', (req, res) => {
  const data = readData();
  const { presetId, name, country } = req.body;
  let row;
  try {
    if (presetId) {
      const preset = CROSSING_CATALOG.find((p) => p.id === presetId);
      if (!preset) return res.status(400).json({ error: 'Paso del catálogo no encontrado' });
      row = enrichCrossing(preset);
    } else if (name && country) {
      row = buildCustomCrossing(name, country);
    } else {
      return res.status(400).json({ error: 'Selecciona un paso del catálogo o ingresa nombre y país vecino' });
    }
    if ((data.borderCrossings || []).some((c) => c.id === row.id)) {
      return res.status(400).json({ error: 'Este paso fronterizo ya está registrado' });
    }
    const created = mapRowToApi(row);
    data.borderCrossings = [...(data.borderCrossings || []), created];
    writeData(data);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/border-crossings/:id', (req, res) => {
  const data = readData();
  const id = req.params.id;
  const inUse = (data.checkins || []).filter((c) => c.borderCrossing === id).length;
  if (inUse > 0) {
    return res.status(400).json({ error: `No se puede eliminar: hay ${inUse} trámite(s) asociados` });
  }
  const before = (data.borderCrossings || []).length;
  data.borderCrossings = (data.borderCrossings || []).filter((c) => c.id !== id);
  if (data.borderCrossings.length === before) {
    return res.status(404).json({ error: 'Paso fronterizo no encontrado' });
  }
  writeData(data);
  res.json({ success: true, id });
});

// ---------- Check-Ins ----------
app.get('/api/checkins', (req, res) => {
  const data = readData();
  const { status, userId, role } = req.query;

  let result = data.checkins;

  if (status) {
    result = result.filter(c => c.status === status);
  }
  if (userId && role === 'traveler') {
    result = result.filter(c => c.userId === parseInt(userId));
  }

  res.json(result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get('/api/checkins/pending', (req, res) => {
  const data = readData();
  const pending = data.checkins.filter(c => c.status === 'pending' || c.status === 'in_review');
  res.json(pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
});

app.get('/api/checkins/:id/verify', (req, res) => {
  const data = readData();
  const checkin = data.checkins.find(c => c.id === req.params.id || c.localId === req.params.id);
  if (!checkin) return res.status(404).json({ error: 'Trámite no encontrado' });
  const ref = checkin.localId || checkin.id;
  res.json({
    id: checkin.id,
    localId: checkin.localId,
    code: String(ref).slice(0, 8).toUpperCase(),
    userName: checkin.userName,
    rut: checkin.rut,
    nationality: checkin.nationality,
    checkinType: checkin.checkinType,
    borderCrossing: checkin.borderCrossing,
    status: checkin.status,
    details: checkin.details,
    processedAt: checkin.processedAt,
    processedBy: checkin.processedBy,
    createdAt: checkin.createdAt,
  });
});

app.get('/api/checkins/:id', (req, res) => {
  const data = readData();
  const checkin = data.checkins.find(c => c.id === req.params.id || c.localId === req.params.id);
  if (!checkin) return res.status(404).json({ error: 'No encontrado' });
  res.json(checkin);
});

app.post('/api/checkins', (req, res) => {
  const data = readData();
  const newCheckin = {
    id: uuidv4(),
    localId: req.body.localId || null,
    userId: req.body.userId || null,
    userName: req.body.userName || 'Visitante',
    rut: req.body.rut || '',
    nationality: req.body.nationality || 'Chilena',
    email: req.body.email || '',
    phone: req.body.phone || '',
    checkinType: req.body.checkinType || 'general', // 'vehicle', 'minor', 'pet', 'general'
    borderCrossing: req.body.borderCrossing || '',
    source: req.body.source || 'online', // 'online' | 'inperson'
    createdBy: req.body.createdBy || null,
    status: req.body.status || 'pending',
    details: req.body.details || {},
    createdAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
    processedAt: null,
    processedBy: null,
    version: req.body.version || 1,
    notificationSent: false
  };
  data.checkins.push(newCheckin);
  writeData(data);
  res.status(201).json(newCheckin);
});

app.post('/api/checkins/batch', (req, res) => {
  const data = readData();
  const items = req.body.items || [];
  const created = [];

  for (const item of items) {
    const existing = data.checkins.find(c => c.localId === item.localId);
    if (existing) {
      // Update existing
      Object.assign(existing, item, { id: existing.id, syncedAt: new Date().toISOString() });
      created.push(existing);
    } else {
      const newItem = {
        id: uuidv4(),
        ...item,
        syncedAt: new Date().toISOString()
      };
      data.checkins.push(newItem);
      created.push(newItem);
    }
  }

  writeData(data);
  res.status(201).json({ synced: created.length, items: created });
});

app.patch('/api/checkins/:id/status', (req, res) => {
  const data = readData();
  const checkin = data.checkins.find(c => c.id === req.params.id || c.localId === req.params.id);
  if (!checkin) return res.status(404).json({ error: 'No encontrado' });

  const { status, processedBy, comment } = req.body;
  const validStatuses = ['pending', 'accepted', 'rejected', 'in_review'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  checkin.status = status;
  checkin.processedAt = new Date().toISOString();
  checkin.processedBy = processedBy || null;
  if (comment) checkin.comment = comment;
  checkin.version = (checkin.version || 1) + 1;

  writeData(data);
  res.json(checkin);
});

// ---------- Sync endpoint ----------
app.post('/api/sync', (req, res) => {
  const data = readData();
  const { localCheckins } = req.body;

  if (!localCheckins || !Array.isArray(localCheckins)) {
    return res.status(400).json({ error: 'Formato inválido' });
  }

  const results = [];
  const serverCheckinIds = new Set(data.checkins.map(c => c.id));

  for (const local of localCheckins) {
    const existing = data.checkins.find(c => c.localId === local.localId);

    if (existing) {
      // Merge: local has newer version?
      if ((local.version || 0) > (existing.version || 0)) {
        Object.assign(existing, local, { id: existing.id, syncedAt: new Date().toISOString() });
        results.push({ localId: local.localId, status: 'updated', serverId: existing.id });
      } else {
        // Server version is newer, send it back
        results.push({ localId: local.localId, status: 'server_newer', serverData: existing });
      }
    } else {
      const created = {
        id: uuidv4(),
        ...local,
        syncedAt: new Date().toISOString()
      };
      data.checkins.push(created);
      results.push({ localId: local.localId, status: 'created', serverId: created.id });
    }
  }

  writeData(data);
  res.json({ results, serverCheckins: data.checkins });
});

app.listen(PORT, () => {
  console.log(`🛂 SIGCE API corriendo en http://localhost:${PORT}`);
  console.log(`📁 Datos en: ${DATA_FILE}`);
});
