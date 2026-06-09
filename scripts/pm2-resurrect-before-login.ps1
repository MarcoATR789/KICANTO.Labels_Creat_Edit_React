$ErrorActionPreference = 'Stop'

$pm2Home = 'C:\Users\wrk_agricom\.pm2'
$pm2Cmd = 'C:\Users\wrk_agricom\AppData\Roaming\npm\pm2.cmd'
$nodeDir = 'C:\Program Files\nodejs'
$npmGlobalDir = 'C:\Users\wrk_agricom\AppData\Roaming\npm'
$logFile = Join-Path $pm2Home 'pm2-before-login.log'

New-Item -ItemType Directory -Path $pm2Home -Force | Out-Null

$env:PM2_HOME = $pm2Home
$env:PATH = "$nodeDir;$npmGlobalDir;$env:PATH"

"[$(Get-Date -Format o)] Starting PM2 resurrect as $([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)" |
  Out-File -FilePath $logFile -Append -Encoding utf8

& $pm2Cmd --no-color resurrect 2>&1 |
  Out-File -FilePath $logFile -Append -Encoding utf8
$exitCode = $LASTEXITCODE

"[$(Get-Date -Format o)] PM2 resurrect finished with exit code $exitCode" |
  Out-File -FilePath $logFile -Append -Encoding utf8

exit $exitCode
