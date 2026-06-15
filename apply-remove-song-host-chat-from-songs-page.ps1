# Djembe website - remove Song Host chat from songs page
#
# Purpose:
# - Remove the Ollama Song Host / bot chat UI from songs.html.
# - Stop loading song-host.css and song-host.js on the song list page.
# - Keep Help Me Choose, favorites, search, song cards, and Request Live buttons intact.
# - Leave song-host.js/css files in the repo unused, in case we want to revisit later.
#
# Run from website repo:
#   D:\Djembe\AI Brain\AI Core\Website Projects\Djembe Dragonfire Website\Website Repo\djembedragonfire-website

$ErrorActionPreference = "Stop"

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CoreRoot = Resolve-Path (Join-Path $RepoDir "..\..\..\..")
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $CoreRoot "_Backups\$Stamp-djembe-remove-song-host-chat"
$SongsHtml = Join-Path $RepoDir "songs.html"

function Backup-File {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (-not (Test-Path $Path)) { throw "Cannot find file to back up: $Path" }
  New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
  $safeName = ($Path.Substring($CoreRoot.Path.Length).TrimStart('\') -replace '[\\/:*?""<>|]', '_')
  $backupPath = Join-Path $BackupDir ($safeName + ".bak")
  Copy-Item $Path $backupPath -Force
  Write-Host "Backed up: $Path" -ForegroundColor DarkGray
  Write-Host "       to: $backupPath" -ForegroundColor DarkGray
}

function Write-Utf8NoBom {
  param([Parameter(Mandatory=$true)][string]$Path, [Parameter(Mandatory=$true)][string]$Content)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

Write-Host "Removing Song Host chat from songs.html" -ForegroundColor Cyan
Write-Host "Repo: $RepoDir"
Write-Host "Backup dir: $BackupDir"

Backup-File $SongsHtml
$html = Get-Content -Raw -Path $SongsHtml

# Remove song-host stylesheet link, including cache-bust query if present.
$html = [regex]::Replace($html, '\s*<link rel="stylesheet" href="song-host\.css(?:\?v=[^"]*)?" />\r?\n', "`r`n")

# Remove the Song Host panel block.
$panelPattern = '(?s)\s*<div id="songHost" class="choice-panel song-host-panel">.*?</div>\s*(?=<div class="favorites-panel">)'
if ($html -match $panelPattern) {
  $html = [regex]::Replace($html, $panelPattern, "`r`n      ", 1)
  Write-Host "Removed Song Host panel markup." -ForegroundColor Green
} else {
  Write-Host "Song Host panel markup was not found; it may already be removed." -ForegroundColor Yellow
}

# Remove song-host.js script, including cache-bust query if present.
$html = [regex]::Replace($html, '\s*<script src="song-host\.js(?:\?v=[^"]*)?"></script>\r?\n', "`r`n")

# Update page copy so it no longer points visitors to the removed Song Host.
$html = $html.Replace('Search the catalog by title, artist, genre, mood, or theme. Use Help Me Choose, then let the Song Host narrow it down to one request.', 'Search the catalog by title, artist, genre, mood, or theme. Use Help Me Choose, browse favorites, and send a live request when a song feels right.')

Write-Utf8NoBom -Path $SongsHtml -Content $html

Write-Host ""
Write-Host "Song Host chat removal complete." -ForegroundColor Cyan
Write-Host "Updated file:" -ForegroundColor Cyan
Write-Host $SongsHtml
Write-Host "Backup dir:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Commit and push songs.html through GitHub Desktop."
Write-Host "2. Hard refresh the website with Ctrl+F5."
