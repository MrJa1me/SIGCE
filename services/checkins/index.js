const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sigce',
  user: process.env.DB_USER || 'sigce',
  password: process.env.DB_PASSWORD || 'sigce2026',
});

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = ALLOWED_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase() || '';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) cb(null, true);
    else cb(new Error('Tipo no permitido. Usa PDF, JPG o PNG.'));
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

async function resolveCheckin(id) {
  const result = await pool.query(
    'SELECT id, local_id FROM checkins WHERE id::text = $1 OR local_id = $1',
    [id]
  );
  return result.rows[0] || null;
}

function mapDocument(row) {
  return {
    id: row.id,
    checkinId: row.checkin_id,
    checkinLocalId: row.checkin_local_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    label: row.label,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

// ─── Migration / seed on startup ───
async function runMigrations() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'traveler',
        rut VARCHAR(50),
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS checkins (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        local_id VARCHAR(100),
        user_id INTEGER REFERENCES users(id),
        user_name VARCHAR(100) NOT NULL,
        rut VARCHAR(50),
        nationality VARCHAR(50) DEFAULT 'Chilena',
        email VARCHAR(100),
        phone VARCHAR(50),
        checkin_type VARCHAR(20) NOT NULL,
        border_crossing VARCHAR(50),
        source VARCHAR(20) DEFAULT 'online',
        created_by VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        details JSONB DEFAULT '{}',
        comments TEXT,
        version INTEGER DEFAULT 1,
        notification_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        synced_at TIMESTAMP,
        processed_at TIMESTAMP,
        processed_by VARCHAR(100),
        pdi_review JSONB DEFAULT NULL
      )
    `);

    await pool.query(`
      ALTER TABLE checkins ADD COLUMN IF NOT EXISTS pdi_review JSONB DEFAULT NULL
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS checkin_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
        checkin_local_id VARCHAR(100),
        original_name VARCHAR(255) NOT NULL,
        stored_name VARCHAR(255) NOT NULL UNIQUE,
        mime_type VARCHAR(100) NOT NULL,
        size_bytes INTEGER NOT NULL,
        label VARCHAR(100),
        uploaded_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('📦 Migration: schema + documents table OK');

    // 2. Insert seed data if table is empty (no local_id with 'seed-' prefix)
    const existing = await pool.query(`SELECT COUNT(*) as count FROM checkins WHERE local_id LIKE 'seed-%'`);
    if (parseInt(existing.rows[0].count) === 0) {
      const ago = (hours) => new Date(Date.now() - hours * 3600000).toISOString();
      const pdi = (status, by, comment) => JSON.stringify({ status, reviewedBy: by, comment });

      // [local_id, name, rut, nation, email, phone, type, crossing, status, details|comments, created_hours_ago, processed_hours_ago, processed_by, pdi_review]
      const seedData = [
        ['seed-001', 'Carlos Muñoz', '12.345.678-9', 'Chilena', 'carlos@email.com', '+56911111111', 'vehicle', 'pino-hachado', 'accepted', JSON.stringify({patent:'ABCD-11',brand:'Toyota',model:'Corolla',vehicleYear:2023,vehicleType:'particular',maxDays:180}), null, 72, 48, 'Maria Gonzalez', pdi('cleared','Maria Gonzalez','Viajero frecuente, sin antecedentes')],
        ['seed-002', 'Ana Soto', '23.456.789-0', 'Argentina', 'ana@email.com', '+54911111111', 'vehicle', 'cardenal-samore', 'accepted', JSON.stringify({patent:'BCDE-22',brand:'Ford',model:'Ranger',vehicleYear:2024,vehicleType:'particular',maxDays:180}), null, 48, 24, 'Carlos Munoz', pdi('cleared','Carlos Munoz','Todo en orden')],
        ['seed-003', 'Pedro Ramirez', '13.579.246-8', 'Chilena', 'pedro@email.com', '+56922222222', 'minor', 'pino-hachado', 'accepted', JSON.stringify({minorName:'Luis Ramirez',minorRut:'Sin RUT',minorAccompaniedBy:'one_parent',hasMinorAuthorization:true}), 'Viajo con mi hijo a visitar familiares', 96, 72, 'Maria Gonzalez', pdi('cleared','Maria Gonzalez','Autorización notarial verificada')],
        ['seed-004', 'Maria Fernandez', '34.567.890-1', 'Peruana', 'maria@email.com', '+51911111111', 'general', 'santa-rosa', 'accepted', '{}', 'Consulta sobre ingreso de productos artesanales', 120, 96, 'Carlos Munoz', pdi('cleared','Carlos Munoz',null)],
        ['seed-005', 'Jorge Martinez', '45.678.901-2', 'Boliviana', 'jorge@email.com', '+59111111111', 'vehicle', 'chacalluta', 'rejected', JSON.stringify({patent:'CDEF-33',brand:'Nissan',model:'Frontier',vehicleYear:2022,vehicleType:'particular',maxDays:180}), null, 48, 24, 'Maria Gonzalez', pdi('denied','Maria Gonzalez','Prohibición de ingreso vigente según PDI')],
        ['seed-006', 'Laura Vargas', '56.789.012-3', 'Chilena', 'laura@email.com', '+56933333333', 'pet', 'los-liberadores', 'rejected', JSON.stringify({petType:'dog',petName:'Max',petBreed:'Labrador',petHasVaccines:false,petHasMicrochip:false}), 'Mi perro no tiene vacunas aún', 72, 48, 'Carlos Munoz', pdi('denied','Carlos Munoz','No cumple requisitos sanitarios SAG')],
        ['seed-007', 'Roberto Diaz', '67.890.123-4', 'Argentina', 'roberto@email.com', '+54922222222', 'vehicle', 'cristo-redentor', 'accepted', JSON.stringify({patent:'DEFG-44',brand:'Volkswagen',model:'Amarok',vehicleYear:2024,vehicleType:'diplomatic',maxDays:90}), 'Vehículo con placa diplomática CC-123', 144, 120, 'Maria Gonzalez', pdi('cleared','Maria Gonzalez','Vehículo diplomático verificado')],
        ['seed-008', 'Carmen Flores', '78.901.234-5', 'Peruana', 'carmen@email.com', '+51922222222', 'minor', 'santa-rosa', 'rejected', JSON.stringify({minorName:'Diego Flores',minorRut:'Sin RUT',minorAccompaniedBy:'neither',hasMinorAuthorization:false}), 'Mi sobrino viaja solo a Chile', 24, 12, 'Carlos Munoz', pdi('denied','Carlos Munoz','Menor sin autorización notarial ni acompañante')],
        ['seed-009', 'Patricio Vega', '89.012.345-6', 'Chilena', 'patricio@email.com', '+56944444444', 'general', 'pino-hachado', 'accepted', '{}', 'Declaración de herramientas de trabajo para reparaciones en Argentina', 168, 144, 'Maria Gonzalez', pdi('cleared','Maria Gonzalez',null)],
        ['seed-010', 'Daniela Rojas', '90.123.456-7', 'Argentina', 'daniela@email.com', '+54933333333', 'pet', 'cardenal-samore', 'accepted', JSON.stringify({petType:'cat',petName:'Michi',petBreed:'Persa',petHasVaccines:true,petHasMicrochip:true}), 'Gato con todas las vacunas y microchip', 120, 96, 'Carlos Munoz', pdi('cleared','Carlos Munoz',null)],
        ['seed-011', 'Felipe Soto', '11.111.111-1', 'Chilena', 'felipe@email.com', '+56955555555', 'vehicle', 'los-liberadores', 'pending', JSON.stringify({patent:'EFGH-55',brand:'Mazda',model:'CX-5',vehicleYear:2023,vehicleType:'particular',maxDays:180}), null, 3, null, null, null],
        ['seed-012', 'Gabriela Torres', '22.222.222-2', 'Peruana', 'gabriela@email.com', '+51933333333', 'minor', 'santa-rosa', 'pending', JSON.stringify({minorName:'Sofia Torres',minorRut:'Sin RUT',minorAccompaniedBy:'both',hasMinorAuthorization:true}), 'Viaje familiar a Chile por turismo', 2, null, null, null],
        ['seed-013', 'Hector Campos', '33.333.333-3', 'Boliviana', 'hector@email.com', '+59122222222', 'vehicle', 'chacalluta', 'pending', JSON.stringify({patent:'FGHI-66',brand:'Suzuki',model:'Swift',vehicleYear:2022,vehicleType:'particular',maxDays:180}), null, 1, null, null, null],
        ['seed-014', 'Isabel Cruz', '44.444.444-4', 'Argentina', 'isabel@email.com', '+54944444444', 'pet', 'cristo-redentor', 'pending', JSON.stringify({petType:'dog',petName:'Luna',petBreed:'Golden Retriever',petHasVaccines:true,petHasMicrochip:true}), null, 0.5, null, null, null],
        ['seed-015', 'Javier Luna', '55.555.555-5', 'Chilena', 'javier@email.com', '+56966666666', 'general', 'pino-hachado', 'pending', '{}', 'Consulta sobre importación temporal de equipos médicos', 0.25, null, null, null],
        ['seed-016', 'Karen Peña', '66.666.666-6', 'Peruana', 'karen@email.com', '+51944444444', 'minor', 'los-liberadores', 'in_review', JSON.stringify({minorName:'Mateo Peña',minorRut:'Sin RUT',minorAccompaniedBy:'one_parent',hasMinorAuthorization:false}), 'Viajo sola con mi hijo, estoy tramitando la autorización', 5, 1, 'Maria Gonzalez', null],
        ['seed-017', 'Luis Castro', '77.777.777-7', 'Argentina', 'luis@email.com', '+54955555555', 'vehicle', 'pino-hachado', 'in_review', JSON.stringify({patent:'GHIJ-77',brand:'Chevrolet',model:'Tracker',vehicleYear:2025,vehicleType:'particular',maxDays:180}), 'Vehículo nuevo, patente provisoria', 4, 0.5, 'Carlos Munoz', null],
        ['seed-018', 'Monica Rios', '88.888.888-8', 'Chilena', 'monica@email.com', '+56977777777', 'pet', 'cardenal-samore', 'accepted', JSON.stringify({petType:'cat',petName:'Simba',petBreed:'Siames',petHasVaccines:true,petHasMicrochip:false}), null, 8, 3, 'Maria Gonzalez', pdi('cleared','Maria Gonzalez',null)],
        ['seed-019', 'Nicolas Vargas', '99.999.999-9', 'Chilena', 'nico@email.com', '+56988888888', 'vehicle', 'los-liberadores', 'rejected', JSON.stringify({patent:'HIJK-88',brand:'BMW',model:'X5',vehicleYear:2024,vehicleType:'particular',maxDays:180}), 'Vehículo de alta gama', 24, 6, 'Maria Gonzalez', pdi('denied','Maria Gonzalez','Vehículo con reporte de robo en Argentina')],
        ['seed-020', 'Valentina Morales', '10.101.010-1', 'Argentina', 'vale@email.com', '+54966666666', 'general', 'cristo-redentor', 'pending', '{}', 'Ingreso temporal de equipamiento deportivo para competencia', 0.16, null, null, null],
      ];

      for (const s of seedData) {
        const [localId, name, rut, nation, email, phone, type, crossing, status, details, comments, createdH, processedH, processedBy, pdiReview] = s;
        await pool.query(`
          INSERT INTO checkins (local_id, user_name, rut, nationality, email, phone, checkin_type,
            border_crossing, status, details, comments, created_at, processed_at, processed_by, pdi_review)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15::jsonb)
          ON CONFLICT DO NOTHING
        `, [
          localId, name, rut, nation, email, phone, type, crossing, status,
          details, comments,
          createdH ? ago(createdH) : new Date().toISOString(),
          processedH ? ago(processedH) : null,
          processedBy,
          pdiReview,
        ]);
      }
      console.log(`📦 Seed: ${seedData.length} check-ins insertados`);
    } else {
      console.log('📦 Seed: ya existen datos, saltando');
    }
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

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

// Get check-ins by RUT
app.get('/api/checkins/by-rut/:rut', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM checkins WHERE rut = $1 ORDER BY created_at DESC',
      [req.params.rut]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public verification payload for QR scans (live status)
app.get('/api/checkins/:id/verify', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, local_id, user_name, rut, nationality, checkin_type, border_crossing,
              status, details, processed_at, processed_by, pdi_review, created_at
       FROM checkins WHERE id::text = $1 OR local_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Trámite no encontrado' });
    const row = result.rows[0];
    const ref = row.local_id || row.id;
    res.json({
      id: row.id,
      local_id: row.local_id,
      code: String(ref).slice(0, 8).toUpperCase(),
      user_name: row.user_name,
      rut: row.rut,
      nationality: row.nationality,
      checkin_type: row.checkin_type,
      border_crossing: row.border_crossing,
      status: row.status,
      details: row.details,
      processed_at: row.processed_at,
      processed_by: row.processed_by,
      pdi_review: row.pdi_review,
      created_at: row.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List documents for a check-in
app.get('/api/checkins/:id/documents', async (req, res) => {
  try {
    const checkin = await resolveCheckin(req.params.id);
    if (!checkin) return res.status(404).json({ error: 'Trámite no encontrado' });

    const result = await pool.query(
      `SELECT * FROM checkin_documents
       WHERE checkin_id = $1 OR checkin_local_id = $2
       ORDER BY created_at DESC`,
      [checkin.id, checkin.local_id]
    );
    res.json(result.rows.map(mapDocument));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload document for a check-in
app.post('/api/checkins/:id/documents', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir archivo' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }

    try {
      const checkin = await resolveCheckin(req.params.id);
      if (!checkin) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      const result = await pool.query(
        `INSERT INTO checkin_documents
          (checkin_id, checkin_local_id, original_name, stored_name, mime_type, size_bytes, label, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          checkin.id,
          checkin.local_id,
          req.file.originalname,
          req.file.filename,
          req.file.mimetype,
          req.file.size,
          req.body.label || null,
          req.body.uploadedBy || null,
        ]
      );
      res.status(201).json(mapDocument(result.rows[0]));
    } catch (dbErr) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      console.error('Upload error:', dbErr.message);
      res.status(500).json({ error: 'Error al guardar documento' });
    }
  });
});

// Download / view document
app.get('/api/documents/:docId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM checkin_documents WHERE id = $1', [req.params.docId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Documento no encontrado' });

    const doc = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, doc.stored_name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
    }

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_name)}"`);
    fs.createReadStream(filePath).pipe(res);
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

// Update PDI review
app.put('/api/checkins/:id/pdi', async (req, res) => {
  try {
    const { status, reviewedBy, comment } = req.body;
    const pdiReview = JSON.stringify({ status, reviewedBy, reviewedAt: new Date().toISOString(), comment });
    const result = await pool.query(
      `UPDATE checkins SET pdi_review=$1 WHERE id::text=$2 OR local_id=$2 RETURNING *`,
      [pdiReview, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
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

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`📋 Checkins service on :${PORT}`);
  });
});
