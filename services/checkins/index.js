const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sigce',
  user: process.env.DB_USER || 'sigce',
  password: process.env.DB_PASSWORD || 'sigce2026',
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ service: 'checkins', status: 'ok' }));

// Get check-ins with filters
app.get('/api/checkins', async (req, res) => {
  try {
    const { status, userId, role } = req.query;
    let sql = 'SELECT * FROM checkins WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = $' + (params.length + 1);
      params.push(status);
    }
    if (userId && role === 'traveler') {
      sql += ' AND user_id = $' + (params.length + 1);
      params.push(parseInt(userId));
    }

    sql += ' ORDER BY created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching checkins:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get pending check-ins
app.get('/api/checkins/pending', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM checkins WHERE status IN ('pending', 'in_review') ORDER BY created_at ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single check-in
app.get('/api/checkins/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM checkins WHERE id::text = $1 OR local_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create check-in
app.post('/api/checkins', async (req, res) => {
  try {
    const body = req.body;
    const result = await pool.query(
      `INSERT INTO checkins (local_id, user_id, user_name, rut, nationality, email, phone,
        checkin_type, border_crossing, source, created_by, status, details, comments, version, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
       RETURNING *`,
      [
        body.localId || null, body.userId || null, body.userName || 'Visitante',
        body.rut || '', body.nationality || 'Chilena', body.email || '', body.phone || '',
        body.checkinType || 'general', body.borderCrossing || '',
        body.source || 'online', body.createdBy || null,
        body.status || 'pending', JSON.stringify(body.details || {}),
        body.comments || '', body.version || 1,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating checkin:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Batch sync
app.post('/api/checkins/batch', async (req, res) => {
  try {
    const items = req.body.items || [];
    const synced = [];

    for (const item of items) {
      const existing = await pool.query(
        'SELECT id FROM checkins WHERE local_id = $1', [item.localId]
      );

      if (existing.rows.length > 0) {
        const result = await pool.query(
          `UPDATE checkins SET user_name=$2, rut=$3, nationality=$4, email=$5, phone=$6,
           checkin_type=$7, border_crossing=$8, status=$9, details=$10, comments=$11,
           version=$12, synced_at=NOW() WHERE local_id=$1 RETURNING *`,
          [
            item.localId, item.userName || 'Visitante', item.rut || '', item.nationality || '',
            item.email || '', item.phone || '', item.checkinType || 'general',
            item.borderCrossing || '', item.status || 'pending',
            JSON.stringify(item.details || {}), item.comments || '', item.version || 1,
          ]
        );
        synced.push(result.rows[0]);
      } else {
        const result = await pool.query(
          `INSERT INTO checkins (local_id, user_name, rut, nationality, email, phone,
            checkin_type, border_crossing, status, details, comments, version, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) RETURNING *`,
          [
            item.localId, item.userName || 'Visitante', item.rut || '', item.nationality || '',
            item.email || '', item.phone || '', item.checkinType || 'general',
            item.borderCrossing || '', item.status || 'pending',
            JSON.stringify(item.details || {}), item.comments || '', item.version || 1,
          ]
        );
        synced.push(result.rows[0]);
      }
    }

    res.status(201).json({ synced: synced.length, items: synced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update status
app.patch('/api/checkins/:id/status', async (req, res) => {
  try {
    const { status, processedBy, comment } = req.body;
    const valid = ['pending', 'accepted', 'rejected', 'in_review'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const result = await pool.query(
      `UPDATE checkins SET status=$1, processed_at=NOW(), processed_by=$2,
       comments=$3, version=version+1 WHERE id::text=$4 OR local_id=$4 RETURNING *`,
      [status, processedBy || null, comment || null, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full sync
app.post('/api/sync', async (req, res) => {
  try {
    const { localCheckins } = req.body;
    if (!localCheckins || !Array.isArray(localCheckins)) {
      return res.status(400).json({ error: 'Formato inválido' });
    }

    const results = [];

    for (const local of localCheckins) {
      const existing = await pool.query(
        'SELECT * FROM checkins WHERE local_id = $1', [local.localId]
      );

      if (existing.rows.length > 0) {
        const current = existing.rows[0];
        if ((local.version || 0) > (current.version || 0)) {
          const updated = await pool.query(
            `UPDATE checkins SET user_name=$2, rut=$3, nationality=$4, email=$5, phone=$6,
             checkin_type=$7, border_crossing=$8, status=$9, details=$10, comments=$11,
             version=$12, synced_at=NOW() WHERE local_id=$1 RETURNING *`,
            [
              local.localId, local.userName || 'Visitante', local.rut || '', local.nationality || '',
              local.email || '', local.phone || '', local.checkinType || 'general',
              local.borderCrossing || '', local.status || 'pending',
              JSON.stringify(local.details || {}), local.comments || '', local.version || 1,
            ]
          );
          results.push({ localId: local.localId, status: 'updated', serverId: updated.rows[0].id });
        } else {
          results.push({ localId: local.localId, status: 'server_newer', serverData: current });
        }
      } else {
        const created = await pool.query(
          `INSERT INTO checkins (local_id, user_name, rut, nationality, email, phone,
            checkin_type, border_crossing, status, details, comments, version, synced_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) RETURNING *`,
          [
            local.localId, local.userName || 'Visitante', local.rut || '', local.nationality || '',
            local.email || '', local.phone || '', local.checkinType || 'general',
            local.borderCrossing || '', local.status || 'pending',
            JSON.stringify(local.details || {}), local.comments || '', local.version || 1,
          ]
        );
        results.push({ localId: local.localId, status: 'created', serverId: created.rows[0].id });
      }
    }

    const allCheckins = await pool.query('SELECT * FROM checkins ORDER BY created_at DESC');
    res.json({ results, serverCheckins: allCheckins.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📋 Checkins service on :${PORT}`);
});
