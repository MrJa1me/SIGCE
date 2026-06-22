CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'traveler',
  created_at TIMESTAMP DEFAULT NOW()
);

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
);

-- Seed users
INSERT INTO users (username, password, name, role) VALUES
  ('admin', 'admin123', 'Admin Aduanas', 'admin'),
  ('oficial1', 'aduana2026', 'Maria Gonzalez', 'official'),
  ('oficial2', 'aduana2026', 'Carlos Munoz', 'official'),
  ('viajero1', 'viajero123', 'Juan Perez', 'traveler'),
  ('viajero2', 'viajero123', 'Ana Soto', 'traveler')
ON CONFLICT (username) DO NOTHING;

-- Seed check-ins are managed by the checkins service migration
