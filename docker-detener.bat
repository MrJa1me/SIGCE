@echo off
title SIGCE - Detener Docker
cd /d "C:\sigce"

echo 🛑 Deteniendo contenedores...
docker compose down

echo 🧹 Limpiando...
docker compose down -v --remove-orphans 2>nul

echo ✅ SIGCE Docker detenido
timeout /t 3 /nobreak >nul
