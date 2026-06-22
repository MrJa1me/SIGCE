@echo off
title SIGCE - Logs
cd /d "C:\sigce"
docker compose logs -f
pause
