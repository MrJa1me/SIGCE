const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

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

// Health check
app.get('/health', (req, res) => res.json({ service: 'auth', status: 'ok' }));

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  try {
    const result = await pool.query(
      'SELECT id, username, password, name, role FROM users WHERE username = $1',
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
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verify token (used by other services)
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

app.listen(PORT, () => {
  console.log(`🔐 Auth service on :${PORT}`);
});
