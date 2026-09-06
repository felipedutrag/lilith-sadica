@echo off
setlocal enabledelayedexpansion

set AGENT_PORT=5000
set NEXT_PORT=3000
set PROJECT_ROOT=%~dp0
set AGENT_DIR=%PROJECT_ROOT%agent_engine
set VENV_DIR=%AGENT_DIR%\venv
set PYTHON_EXE=%VENV_DIR%\Scripts\python.exe

echo ====================================
echo   Lilith Agent Engine + Dashboard
echo ====================================
echo.

if not exist "%PYTHON_EXE%" (
    echo [....] Criando venv Python...
    cd /d "%AGENT_DIR%"
    python -m venv venv
    if errorlevel 1 (
        echo [ERRO] Falha ao criar venv
        exit /b 1
    )
    echo [OK] Venv criada
)
cd /d "%AGENT_DIR%"
call "%PYTHON_EXE%" -m pip install -q -r requirements.txt
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias
    exit /b 1
)
cd /d "%PROJECT_ROOT%"

echo [....] Liberando a porta %AGENT_PORT% caso esteja ocupada...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%AGENT_PORT% ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [....] Iniciando Agent Engine (http://localhost:%AGENT_PORT%)...
cd /d "%AGENT_DIR%"
start /b "" "%PYTHON_EXE%" -m uvicorn app:app --host 0.0.0.0 --port %AGENT_PORT%
cd /d "%PROJECT_ROOT%"
timeout /t 5 /nobreak >nul

echo [OK] Agent Engine rodando
echo [OK] Dashboard em http://localhost:%NEXT_PORT%
echo [INFO] Feche esta janela para parar tudo
echo.

start http://localhost:%NEXT_PORT%

cd /d "%PROJECT_ROOT%"
npx next dev

echo.
echo [....] Parando Agent Engine...
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq python.exe" /nh 2^>nul') do (
    taskkill /pid %%a /f >nul 2>&1
)
echo [OK] Tudo parado.
