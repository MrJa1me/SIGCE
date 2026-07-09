-- Migración: columnas de perfil para viajeros
ALTER TABLE users ADD COLUMN IF NOT EXISTS rut VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);
