@echo off
title SIGCE - Inicio Docker
cd /d "C:\sigce"

echo ╔══════════════════════════════════════╗
echo ║   🐳  SIGCE - Inicio Docker          ║
echo ╚══════════════════════════════════════╝
echo.

REM 1. Compilar frontend
echo 📦 Compilando frontend...
cd sigce-app
call npx vite build
if %errorlevel% neq 0 (
    echo ❌ Error compilando frontend
    pause
    exit /b 1
)
cd ..
echo    ✓ Frontend compilado
echo.

REM 2. Bajar contenedores previos
echo 🗑️  Limpiando contenedores anteriores...
docker compose down --remove-orphans >nul 2>&1
echo    ✓ Done
echo.

REM 3. Levantar todo
echo 🐳 Levantando contenedores...
docker compose up -d --build
if %errorlevel% neq 0 (
    echo ❌ Error al levantar contenedores
    pause
    exit /b 1
)
echo    ✓ Contenedores arriba
echo.

REM 4. Abrir VSCode
echo 📂 Abriendo VSCode...
start "" "code" "C:\sigce\sigce-app"
echo    ✓ VSCode abierto
echo.

echo ╔══════════════════════════════════════╗
echo ║      ✅  SIGCE corriendo en Docker   ║
echo ╠══════════════════════════════════════╣
echo ║                                      ║
echo ║  📍 Local                            ║
echo ║  Frontend: http://localhost:4173     ║
echo ║  Gateway:  http://localhost:4000     ║
echo ║  Auth:     http://localhost:4001     ║
echo ║  Checkins: http://localhost:4002     ║
echo ║  Users:    http://localhost:4003     ║
echo ║  DB:       localhost:5432            ║
echo ║                                      ║
echo ║  🌐 Para exponer con ngrok:         ║
echo ║  1. Abre Docker Desktop              ║
echo ║  2. Ve a la pestana de ngrok         ║
echo ║  3. Crea endpoint SOLO para          ║
echo ║     sigce-frontend (puerto 80)       ║
echo ║     El proxy maneja la API sola      ║
echo ║                                      ║
echo ║  🛑 Para detener:                    ║
echo ║     .\docker-detener.bat             ║
echo ╚══════════════════════════════════════╝
echo.

pause
