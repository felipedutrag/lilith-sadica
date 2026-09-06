param(
    [switch]$NoBrowser
)

$AgentPort = 5000
$NextPort = 3000
$ProjectRoot = $PSScriptRoot
$AgentDir = Join-Path $ProjectRoot "agent_engine"
$VenvDir = Join-Path $AgentDir "venv"
$PythonExe = Join-Path $VenvDir "Scripts" "python.exe"

Write-Host "==============================" -ForegroundColor Cyan
Write-Host "  Lilith Agent Engine + Dashboard" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $PythonExe)) {
    Write-Host "[...] Criando venv Python..." -ForegroundColor Yellow
    Push-Location $AgentDir
    python -m venv venv
    if (-not $?) { Write-Host "[ERRO] Falha ao criar venv" -ForegroundColor Red; exit 1 }
    & $PythonExe -m pip install -r requirements.txt --quiet
    Pop-Location
    Write-Host "[OK] Venv criada e dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "[OK] Venv encontrada" -ForegroundColor Green
}

$AgentLog = Join-Path $AgentDir "agent.log"
Write-Host "[...] Iniciando Agent Engine (http://localhost:$AgentPort)..." -ForegroundColor Yellow
$agentJob = Start-Process -FilePath $PythonExe -ArgumentList "-m uvicorn app:app --host 0.0.0.0 --port $AgentPort" -WorkingDirectory $AgentDir -PassThru -NoNewWindow -RedirectStandardOutput $AgentLog -RedirectStandardError $AgentLog
Start-Sleep -Seconds 3

if ($agentJob.HasExited) {
    Write-Host "[ERRO] Agent Engine falhou ao iniciar. Log:" -ForegroundColor Red
    Get-Content $AgentLog -Tail 10
    exit 1
}
Write-Host "[OK] Agent Engine rodando (PID $($agentJob.Id))" -ForegroundColor Green

$DashboardUrl = "http://localhost:$NextPort"
if (-not $NoBrowser) {
    Write-Host "[...] Abrindo dashboard..." -ForegroundColor Yellow
    Start-Process "msedge" -ArgumentList $DashboardUrl -ErrorAction SilentlyContinue
    if (-not $?) { Start-Process $DashboardUrl }
}

Write-Host "[OK] Dashboard em $DashboardUrl" -ForegroundColor Green
Write-Host "[INFO] Agent Engine log: $AgentLog" -ForegroundColor DarkGray
Write-Host "[INFO] Pressione Ctrl+C para parar tudo" -ForegroundColor DarkGray
Write-Host ""

try {
    Push-Location $ProjectRoot
    npx next dev
}
finally {
    Pop-Location
    Write-Host "[...] Parando Agent Engine..." -ForegroundColor Yellow
    if ($agentJob -and -not $agentJob.HasExited) {
        Stop-Process -Id $agentJob.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] Tudo parado." -ForegroundColor Green
}