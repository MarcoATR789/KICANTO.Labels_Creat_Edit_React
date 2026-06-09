@echo off
setlocal enabledelayedexpansion

REM (CONFIGURAÇÕES)
set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin
set BACKUP_DIR=C:\server_run\agricom-etiquetas-react\bkp_database
set DB_NAME=etiquetas_db
set DB_USER=root
set DB_PASS=@Solamento1

REM (CRIAR PASTA DE BACKUP SE NÃO EXISTIR)
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM (GERAR DATA)
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set DATA=%%i

REM (DEFINIR ARQUIVO)
set ARQUIVO=%BACKUP_DIR%\%DB_NAME%_%DATA%.sql

REM (EXECUTAR BACKUP)
"%MYSQL_BIN%\mysqldump.exe" -u%DB_USER% -p%DB_PASS% --databases %DB_NAME% --routines --events --triggers > "%ARQUIVO%"

REM (APAGAR BACKUPS - 7 DIAS)
forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -7 /c "cmd /c del /q @path"

endlocal
