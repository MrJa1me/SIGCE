const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// ---------- Data Persistence ----------
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = { users: [], checkins: [] };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return { users: [], checkins: [] };
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
