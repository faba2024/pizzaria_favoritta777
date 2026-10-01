# Verificação completa para produção (Windows / PowerShell).
# Uso, na pasta do projeto:  powershell -ExecutionPolicy Bypass -File scripts\verificar-producao.ps1
# Gera verificacao-producao.log com toda a saída e um resumo no final.

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)
$log = Join-Path (Get-Location) 'verificacao-producao.log'
Start-Transcript -Path $log -Force | Out-Null
$results = [ordered]@{}

function Step($name, [scriptblock]$cmd) {
  Write-Host "`n==================== $name ====================" -ForegroundColor Yellow
  & $cmd 2>&1 | Out-Host
  $ok = ($LASTEXITCODE -eq 0)
  $results[$name] = if ($ok) { 'OK' } else { "FALHOU (código $LASTEXITCODE)" }
  return $ok
}

Write-Host "Node $(node -v) | npm $(npm -v)"
$go = Step 'npm install' { npm install --no-audit --no-fund }
if ($go) { Step 'fontes (Google Fonts -> public/fonts)' { npm run fonts } | Out-Null }
if ($go) { Step 'typecheck' { npm run typecheck } | Out-Null }
if ($go) { Step 'testes (vitest)' { npm test } | Out-Null }
$built = $false
if ($go) { $built = Step 'build (next build)' { npm run build } }
if ($built) {
  Step 'playwright install chromium' { npx playwright install chromium } | Out-Null
  $env:E2E_SKIP_BUILD = '1'
  Step 'playwright (5 larguras)' { npx playwright test --reporter=list } | Out-Null
  Remove-Item Env:E2E_SKIP_BUILD
}

Write-Host "`n==================== RESUMO ====================" -ForegroundColor Cyan
$results.GetEnumerator() | ForEach-Object { '{0,-40} {1}' -f $_.Key, $_.Value | Write-Host }
Write-Host "`nLog completo: $log"
Stop-Transcript | Out-Null
if ($results.Values -match 'FALHOU') { exit 1 }
