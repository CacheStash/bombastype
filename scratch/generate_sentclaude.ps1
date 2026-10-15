param (
    [string]$ProjectName = "bombastype"
)

$targetDir = "sentclaude"
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$zipPath = Join-Path $targetDir "${ProjectName}_sentclaude.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$items = Get-ChildItem -Path . | Where-Object { 
    $_.Name -ne 'node_modules' -and 
    $_.Name -ne '.git' -and 
    $_.Name -ne 'dist' -and 
    $_.Name -ne 'sentclaude' -and 
    $_.Name -ne 'backups' 
}

Compress-Archive -Path $items -DestinationPath $zipPath -Force
Write-Host "Regenerated sentclaude backup: $zipPath"
