@echo off
title ChefFlow Database Backup
cd /d "%~dp0"

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set d=%%c-%%a-%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set t=%%a%%b

set BACKUP_DIR=%~dp0backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

set BACKUP_FILE=%BACKUP_DIR%\chefflow-%d%-%t%.sql

echo Backing up ChefFlow database...
docker exec chefflow_postgres pg_dump -U postgres -d postgres > "%BACKUP_FILE%"

if errorlevel 1 (
    echo Backup FAILED.
) else (
    echo Backup saved to %BACKUP_FILE%
)
pause
