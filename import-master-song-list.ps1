# Djembe Dragonfire Website - Import Master Song List
#
# Purpose:
# Copies the AI Brain Master Song List CSV into the website repo as data/songs.csv.
# The website song browser reads data/songs.csv directly.
#
# Run from PowerShell inside the website repo folder:
#   .\import-master-song-list.ps1

$ErrorActionPreference = "Stop"

$RepoRoot = $PSScriptRoot
$MasterSongList = Join-Path $RepoRoot "..\..\..\Setlists Music\Master Song List\Djembe_Full_Tagged_Songlist_UPDATED_2026-04-25.csv"
$DataDir = Join-Path $RepoRoot "data"
$OutputCsv = Join-Path $DataDir "songs.csv"

if (-not (Test-Path $MasterSongList)) {
    throw "Master Song List not found: $MasterSongList"
}

if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir | Out-Null
}

if (Test-Path $OutputCsv) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backup = Join-Path $DataDir "songs.$stamp.bak.csv"
    Copy-Item -Path $OutputCsv -Destination $backup -Force
    Write-Host "Backup created: $backup" -ForegroundColor Yellow
}

Copy-Item -Path $MasterSongList -Destination $OutputCsv -Force

$rowCount = (Import-Csv -Path $OutputCsv).Count
Write-Host "Imported $rowCount songs into: $OutputCsv" -ForegroundColor Green
Write-Host "Next: commit data/songs.csv, songs.js, and this importer script in GitHub Desktop." -ForegroundColor Cyan
