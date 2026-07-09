CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'traveler',
  rut VARCHAR(50),
  email VARCHAR(100),
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
);

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
);

INSERT INTO border_crossings (
  id, name, short_name, region, country, location, type, code, description,
  color, color_light, color_bg, gradient, daily_flow, avg_wait, altitude
) VALUES
  ('los-libertadores', 'Paso Los Libertadores', 'Los Libertadores', 'Región de Valparaíso', 'Argentina', 'Cordillera de los Andes, comuna de Los Andes', 'terrestrial', 'LL', 'Principal paso entre Chile y Argentina. Conecta Santiago con Mendoza.', '#1a5276', '#2980b9', '#eaf2f8', 'linear-gradient(135deg, #1a5276, #2980b9)', '12,000+', '4-8 hrs', '3,175 m s.n.m.'),
  ('jama', 'Paso Jama', 'Paso Jama', 'Región de Antofagasta', 'Argentina', 'Provincia de Jujuy — El Loa', 'terrestrial', 'PJ', 'Cruce de altura en el norte de Chile.', '#1a5276', '#2980b9', '#eaf2f8', 'linear-gradient(135deg, #1a5276, #2980b9)', '3,500+', '1-3 hrs', '4,200 m s.n.m.'),
  ('agua-negra', 'Paso Agua Negra', 'Agua Negra', 'Región de Coquimbo', 'Argentina', 'San Juan — Coquimbo', 'terrestrial', 'AN', 'Paso cordillerano Coquimbo–San Juan.', '#1e8449', '#27ae60', '#eafaf1', 'linear-gradient(135deg, #1e8449, #27ae60)', '2,000+', '1-2 hrs', '4,780 m s.n.m.'),
  ('cardenal-samore', 'Paso Cardenal Samoré', 'Cardenal Samoré', 'Región de Los Lagos', 'Argentina', 'Osorno — Bariloche', 'terrestrial', 'CS', 'Paso patagónico Puerto Montt–Bariloche.', '#1a5276', '#2c3e50', '#eef1f5', 'linear-gradient(135deg, #1a5276, #2c3e50)', '4,000+', '2-4 hrs', '1,210 m s.n.m.'),
  ('pino-hachado', 'Paso Pino Hachado', 'Pino Hachado', 'Región de La Araucanía', 'Argentina', 'Lonquimay — Neuquén', 'terrestrial', 'PH', 'Araucanía–Patagonia argentina.', '#1a5276', '#2980b9', '#eaf2f8', 'linear-gradient(135deg, #1a5276, #2980b9)', '1,800+', '1-3 hrs', '1,884 m s.n.m.'),
  ('cristo-redentor', 'Paso Cristo Redentor', 'Cristo Redentor', 'Región de O''Higgins', 'Argentina', 'Los Andes — Uspallata', 'terrestrial', 'CR', 'Ruta Los Andes–Mendoza.', '#1a5276', '#2980b9', '#eaf2f8', 'linear-gradient(135deg, #1a5276, #2980b9)', '5,500+', '2-5 hrs', '3,832 m s.n.m.'),
  ('chacalluta', 'Paso Chacalluta', 'Chacalluta', 'Región de Arica y Parinacota', 'Perú', 'Arica — Tacna', 'terrestrial', 'CH', 'Principal cruce Chile–Perú.', '#922b21', '#c0392b', '#fdedec', 'linear-gradient(135deg, #922b21, #c0392b)', '6,000+', '1-2 hrs', '35 m s.n.m.'),
  ('santa-rosa', 'Paso Santa Rosa', 'Santa Rosa', 'Región de Arica y Parinacota', 'Perú', 'Putre — Tacna', 'terrestrial', 'SR', 'Paso de altura frontera norte.', '#922b21', '#c0392b', '#fdedec', 'linear-gradient(135deg, #922b21, #c0392b)', '800+', '30-90 min', '3,600 m s.n.m.'),
  ('chungara-tambo-quemado', 'Paso Chungará–Tambo Quemado', 'Chungará–Tambo Quemado', 'Región de Arica y Parinacota', 'Bolivia', 'Lauca — Oruro', 'terrestrial', 'CT', 'Cruce altiplánico Chile–Bolivia.', '#1e6f3d', '#27ae60', '#eafaf1', 'linear-gradient(135deg, #1e6f3d, #27ae60)', '600+', '45-90 min', '4,687 m s.n.m.'),
  ('ollague', 'Paso Ollagüe', 'Ollagüe', 'Región de Antofagasta', 'Bolivia', 'Ollagüe — Potosí', 'terrestrial', 'OL', 'Paso minero hacia Bolivia.', '#1e6f3d', '#27ae60', '#eafaf1', 'linear-gradient(135deg, #1e6f3d, #27ae60)', '400+', '30-60 min', '3,695 m s.n.m.')
ON CONFLICT (id) DO NOTHING;
