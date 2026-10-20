$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)

if (-not $isAdmin) {
  throw 'Execute este script em um PowerShell aberto como Administrador.'
}

$taskName = 'PM2-Resurrect-BeforeLogin'
$projectDir = Split-Path -Parent $PSScriptRoot
$startupScript = Join-Path $PSScriptRoot 'pm2-resurrect-before-login.ps1'
$powershellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

if (-not (Test-Path $startupScript)) {
  throw "Script de inicialização não encontrado: $startupScript"
}

$action = New-ScheduledTaskAction `
  -Execute $powershellExe `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startupScript`"" `
  -WorkingDirectory $projectDir

$trigger = New-ScheduledTaskTrigger -AtStartup

$principal = New-ScheduledTaskPrincipal `
  -UserId 'SYSTEM' `
  -LogonType ServiceAccount `
  -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Force | Out-Null

Write-Host "Tarefa '$taskName' registrada para iniciar no boot como SYSTEM."
