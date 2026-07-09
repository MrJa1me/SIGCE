const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { initSchema } = require('./initSchema');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'sigce-dev-secret-2026';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sigce',
  user: process.env.DB_USER || 'sigce',
  password: process.env.DB_PASSWORD || 'sigce2026',
});

app.use(cors());
app.use(express.json());

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await initSchema(pool);
  schemaReady = true;
}

app.get('/health', (req, res) => res.json({ service: 'auth', status: 'ok' }));

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  try {
    await ensureSchema();
    const result = await pool.query(
      'SELECT id, username, password, name, role, rut, email, phone, nationality, assigned_border_crossing FROM users WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      rut: user.rut,
      email: user.email,
      phone: user.phone,
      nationality: user.nationality,
      assignedBorderCrossing: user.assigned_border_crossing,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password, name, rut, email } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Usuario, contraseña y nombre son requeridos' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return res.status(400).json({ error: 'El usuario solo puede contener letras, números, puntos, guiones y guiones bajos' });
  }

  try {
    await ensureSchema();
    const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    if (rut) {
      const rutExists = await pool.query('SELECT id FROM users WHERE rut = $1', [rut.trim()]);
      if (rutExists.rows.length > 0) {
        return res.status(400).json({ error: 'Este RUT ya está registrado' });
      }
    }

    const result = await pool.query(
      'INSERT INTO users (username, password, name, role, rut, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, name, role, rut, email',
      [username.trim(), password, name.trim(), 'traveler', rut?.trim() || null, email?.trim() || null]
    );
    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      rut: user.rut,
      email: user.email,
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.json({ valid: false });
  }
});

async function start() {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      console.log(`🔐 Auth service on :${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start auth service:', err.message);
    process.exit(1);
  }
}

start();
