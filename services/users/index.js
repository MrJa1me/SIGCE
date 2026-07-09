const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const {
  CROSSING_CATALOG,
  SEED_CROSSINGS,
  enrichCrossing,
  buildCustomCrossing,
  mapRowToApi,
} = require('./borderCrossingData');

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

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS border_crossings (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      short_name VARCHAR(80) NOT NULL,
      region VARCHAR(100) NOT NULL,
      country VARCHAR(50) NOT NULL,
      location VARCHAR(200),
      type VARCHAR(20) DEFAULT 'terrestrial',
      code VARCHAR(10) NOT NULL,
      description TEXT,
      color VARCHAR(20),
      color_light VARCHAR(20),
      color_bg VARCHAR(20),
      gradient VARCHAR(200),
      daily_flow VARCHAR(50),
      avg_wait VARCHAR(50),
      altitude VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM border_crossings');
  if (countRes.rows[0].count === 0) {
    for (const row of SEED_CROSSINGS) {
      await pool.query(
        `INSERT INTO border_crossings (
          id, name, short_name, region, country, location, type, code, description,
          color, color_light, color_bg, gradient, daily_flow, avg_wait, altitude
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (id) DO NOTHING`,
        [
          row.id, row.name, row.short_name, row.region, row.country, row.location,
          row.type, row.code, row.description, row.color, row.color_light, row.color_bg,
          row.gradient, row.daily_flow, row.avg_wait, row.altitude,
        ]
      );
    }
    console.log('📦 Border crossings seeded:', SEED_CROSSINGS.length);
  }

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Chilena'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_border_crossing VARCHAR(50)`);

  await pool.query(`
    UPDATE users SET assigned_border_crossing = 'los-libertadores'
    WHERE username = 'oficial1' AND assigned_border_crossing IS NULL
  `);
  await pool.query(`
    UPDATE users SET assigned_border_crossing = 'chacalluta'
    WHERE username = 'oficial2' AND assigned_border_crossing IS NULL
  `);
}

runMigrations().catch((err) => console.error('Migration error:', err.message));

app.get('/health', (req, res) => res.json({ service: 'users', status: 'ok' }));

// ─── Border crossings (público) ───
app.get('/api/border-crossings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM border_crossings WHERE is_active = TRUE ORDER BY country, name`
    );
    res.json(result.rows.map(mapRowToApi));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: catálogo disponible ───
app.get('/api/admin/border-crossings/presets', async (req, res) => {
  try {
    const existing = await pool.query('SELECT id FROM border_crossings WHERE is_active = TRUE');
    const existingIds = new Set(existing.rows.map((r) => r.id));
    const available = CROSSING_CATALOG
      .filter((p) => !existingIds.has(p.id))
      .map((p) => {
        const enriched = enrichCrossing(p);
        return mapRowToApi(enriched);
      });
    res.json(available);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/border-crossings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM border_crossings WHERE is_active = TRUE ORDER BY country, name`
    );
    res.json(result.rows.map(mapRowToApi));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/border-crossings', async (req, res) => {
  try {
    const { presetId, name, country } = req.body;
    let row;

    if (presetId) {
      const preset = CROSSING_CATALOG.find((p) => p.id === presetId);
      if (!preset) return res.status(400).json({ error: 'Paso del catálogo no encontrado' });
      row = enrichCrossing(preset);
    } else if (name && country) {
      row = buildCustomCrossing(name, country);
    } else {
      return res.status(400).json({ error: 'Selecciona un paso del catálogo o ingresa nombre y país vecino' });
    }

    const exists = await pool.query('SELECT id FROM border_crossings WHERE id = $1', [row.id]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Este paso fronterizo ya está registrado' });
    }

    const result = await pool.query(
      `INSERT INTO border_crossings (
        id, name, short_name, region, country, location, type, code, description,
        color, color_light, color_bg, gradient, daily_flow, avg_wait, altitude
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        row.id, row.name, row.short_name, row.region, row.country, row.location,
        row.type, row.code, row.description, row.color, row.color_light, row.color_bg,
        row.gradient, row.daily_flow, row.avg_wait, row.altitude,
      ]
    );
    res.status(201).json(mapRowToApi(result.rows[0]));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/border-crossings/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const inUse = await pool.query(
      `SELECT COUNT(*)::int AS count FROM checkins WHERE border_crossing = $1`,
      [id]
    );
    if (inUse.rows[0].count > 0) {
      return res.status(400).json({
        error: `No se puede eliminar: hay ${inUse.rows[0].count} trámite(s) asociados a este paso`,
      });
    }

    const result = await pool.query(
      `UPDATE border_crossings SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paso fronterizo no encontrado' });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


function mapUserProfile(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    rut: row.rut,
    email: row.email,
    phone: row.phone,
    nationality: row.nationality,
    assignedBorderCrossing: row.assigned_border_crossing,
  };
}

// Traveler / user profile
app.get('/api/users/:id/profile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, name, role, rut, email, phone, nationality, assigned_border_crossing
       FROM users WHERE id = $1`,
      [parseInt(req.params.id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(mapUserProfile(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/profile', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, rut, email, phone, nationality } = req.body;

    if (rut) {
      const rutExists = await pool.query(
        'SELECT id FROM users WHERE rut = $1 AND id != $2',
        [rut.trim(), userId]
      );
      if (rutExists.rows.length > 0) {
        return res.status(400).json({ error: 'Este RUT ya está registrado por otro usuario' });
      }
    }

    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        rut = COALESCE($2, rut),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        nationality = COALESCE($5, nationality)
       WHERE id = $6
       RETURNING id, username, name, role, rut, email, phone, nationality, assigned_border_crossing`,
      [
        name?.trim() || null,
        rut?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        nationality?.trim() || null,
        userId,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(mapUserProfile(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, password, name, role, rut, email, phone, nationality, assigned_border_crossing
       FROM users ORDER BY id`
    );
    res.json(result.rows.map((r) => ({ ...mapUserProfile(r), password: r.password })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by id (with password for admin)
app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, password, name, role, rut, email, phone, nationality, assigned_border_crossing FROM users WHERE id = $1',
      [parseInt(req.params.id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const row = result.rows[0];
    res.json({ ...mapUserProfile(row), password: row.password });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, role, assignedBorderCrossing } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const exists = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    const result = await pool.query(
      `INSERT INTO users (username, password, name, role, assigned_border_crossing)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, username, name, role, rut, email, phone, nationality, assigned_border_crossing`,
      [username, password, name, role, assignedBorderCrossing || null]
    );
    res.status(201).json(mapUserProfile(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { username, password, name, role, assignedBorderCrossing } = req.body;
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
    if (assignedBorderCrossing !== undefined) {
      updates.push(` assigned_border_crossing = $${params.length + 1}`);
      params.push(assignedBorderCrossing || null);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Sin campos para actualizar' });

    sql += updates.join(',');
    sql += ` WHERE id = $${params.length + 1} RETURNING id, username, name, role, rut, email, phone, nationality, assigned_border_crossing`;
    params.push(userId);

    const result = await pool.query(sql, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(mapUserProfile(result.rows[0]));
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

function rowsToMap(rows, keyField = 'key', valueField = 'count') {
  return Object.fromEntries(rows.map((r) => [r[keyField], r[valueField]]));
}

// Admin dashboard statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 7), 90);

    const [
      usersTotalRes,
      usersByRoleRes,
      usersDailyRes,
      checkinsTotalRes,
      checkinsTodayRes,
      checkinsWeekRes,
      checkinsByStatusRes,
      checkinsByTypeRes,
      checkinsByCrossingRes,
      checkinsDailyRes,
      avgProcessingRes,
      nationalityRes,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query('SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role'),
      pool.query(
        `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
         FROM users
         WHERE created_at >= CURRENT_DATE - $1::int
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [days - 1]
      ),
      pool.query('SELECT COUNT(*)::int AS count FROM checkins'),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM checkins
         WHERE DATE(created_at) = CURRENT_DATE`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM checkins
         WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'`
      ),
      pool.query('SELECT status, COUNT(*)::int AS count FROM checkins GROUP BY status ORDER BY status'),
      pool.query('SELECT checkin_type AS type, COUNT(*)::int AS count FROM checkins GROUP BY checkin_type ORDER BY count DESC'),
      pool.query(
        `SELECT COALESCE(NULLIF(border_crossing, ''), 'sin-paso') AS crossing, COUNT(*)::int AS count
         FROM checkins GROUP BY crossing ORDER BY count DESC`
      ),
      pool.query(
        `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
         FROM checkins
         WHERE created_at >= CURRENT_DATE - $1::int
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [days - 1]
      ),
      pool.query(
        `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) / 3600), 0)::float AS hours
         FROM checkins WHERE processed_at IS NOT NULL`
      ),
      pool.query(
        `SELECT COALESCE(NULLIF(nationality, ''), 'Sin dato') AS nationality, COUNT(*)::int AS count
         FROM checkins GROUP BY nationality ORDER BY count DESC LIMIT 8`
      ),
    ]);

    let documentsTotal = 0;
    try {
      const docRes = await pool.query('SELECT COUNT(*)::int AS count FROM checkin_documents');
      documentsTotal = docRes.rows[0].count;
    } catch {
      documentsTotal = 0;
    }

    const byStatus = rowsToMap(checkinsByStatusRes.rows, 'status');
    const resolved = (byStatus.accepted || 0) + (byStatus.rejected || 0);
    const acceptanceRate = resolved > 0 ? Math.round(((byStatus.accepted || 0) / resolved) * 100) : 0;

    res.json({
      periodDays: days,
      generatedAt: new Date().toISOString(),
      users: {
        total: usersTotalRes.rows[0].count,
        byRole: rowsToMap(usersByRoleRes.rows, 'role'),
        daily: usersDailyRes.rows,
      },
      checkins: {
        total: checkinsTotalRes.rows[0].count,
        today: checkinsTodayRes.rows[0].count,
        thisWeek: checkinsWeekRes.rows[0].count,
        byStatus,
        byType: rowsToMap(checkinsByTypeRes.rows, 'type'),
        byCrossing: rowsToMap(checkinsByCrossingRes.rows, 'crossing'),
        daily: checkinsDailyRes.rows,
        byNationality: rowsToMap(nationalityRes.rows, 'nationality'),
      },
      documents: {
        total: documentsTotal,
      },
      summary: {
        acceptanceRate,
        pendingCount: (byStatus.pending || 0) + (byStatus.in_review || 0),
        avgProcessingHours: Math.round(avgProcessingRes.rows[0].hours * 10) / 10,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`👥 Users service on :${PORT}`);
});
