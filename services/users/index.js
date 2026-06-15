const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3003;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sigce',
  user: process.env.DB_USER || 'sigce',
  password: process.env.DB_PASSWORD || 'sigce2026',
});

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'users', status: 'ok' }));

// List all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, name, role FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by id (with password for admin)
app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, password, name, role FROM users WHERE id = $1',
      [parseInt(req.params.id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    const result = await pool.query(
      'INSERT INTO users (username, password, name, role) VALUES ($1,$2,$3,$4) RETURNING id, username, name, role',
      [username, password, name, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    const userId = parseInt(req.params.id);

    const existing = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    let sql = 'UPDATE users SET';
    const params = [];
    const updates = [];

    if (username) { updates.push(` username = $${params.length + 1}`); params.push(username); }
    if (password) { updates.push(` password = $${params.length + 1}`); params.push(password); }
    if (name) { updates.push(` name = $${params.length + 1}`); params.push(name); }
    if (role) { updates.push(` role = $${params.length + 1}`); params.push(role); }

    if (updates.length === 0) return res.status(400).json({ error: 'Sin campos para actualizar' });

    sql += updates.join(',');
    sql += ` WHERE id = $${params.length + 1} RETURNING id, username, name, role`;
    params.push(userId);

    const result = await pool.query(sql, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [parseInt(req.params.id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`👥 Users service on :${PORT}`);
});
