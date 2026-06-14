# Djembe website - force floating Song Host + cache bust
#
# Purpose:
# - Add cache-busting query strings for song-host.css and song-host.js in songs.html.
# - Make the floating widget CSS target #songHost directly, not only the JS-added class.
# - This helps when the browser/CDN is still serving an old song-host.js or song-host.css.
#
# Run from website repo:
#   D:\Djembe\AI Brain\AI Core\Website Projects\Djembe Dragonfire Website\Website Repo\djembedragonfire-website

$ErrorActionPreference = "Stop"

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CoreRoot = Resolve-Path (Join-Path $RepoDir "..\..\..\..")
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $CoreRoot "_Backups\$Stamp-djembe-force-floating-song-host-cache-bust"
$SongsHtml = Join-Path $RepoDir "songs.html"
$SongHostCss = Join-Path $RepoDir "song-host.css"
$Version = Get-Date -Format "yyyyMMddHHmmss"

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

Write-Host "Forcing floating Song Host and cache-busting assets" -ForegroundColor Cyan
Write-Host "Repo: $RepoDir"
Write-Host "Backup dir: $BackupDir"

Backup-File $SongsHtml
Backup-File $SongHostCss

$html = Get-Content -Raw -Path $SongsHtml
$html = [regex]::Replace($html, 'href="song-host\.css(?:\?v=[^"]*)?"', 'href="song-host.css?v=' + $Version + '"')
$html = [regex]::Replace($html, 'src="song-host\.js(?:\?v=[^"]*)?"', 'src="song-host.js?v=' + $Version + '"')
Write-Utf8NoBom -Path $SongsHtml -Content $html
Write-Host "Updated songs.html cache-busting version: $Version" -ForegroundColor Green

$css = Get-Content -Raw -Path $SongHostCss
$forceBlock = @'

/* Force Song Host to bottom-right even before JS class initializes */
#songHost.song-host-panel {
  position: fixed !important;
  right: 1.25rem !important;
  bottom: 1.25rem !important;
  z-index: 950 !important;
  width: min(430px, calc(100vw - 2rem)) !important;
  max-height: min(760px, calc(100vh - 2rem)) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  padding: 0 !important;
  border-radius: 28px !important;
  box-shadow: 0 32px 90px rgba(0, 0, 0, 0.68), 0 0 55px rgba(34, 211, 238, 0.12) !important;
}

#songHost.song-host-panel::after {
  display: none !important;
}

#songHost.song-host-panel > .eyebrow,
#songHost.song-host-panel > h2,
#songHost.song-host-panel > .small-note,
#songHost.song-host-panel > .host-messages,
#songHost.song-host-panel > .host-actions {
  margin-left: 1rem;
  margin-right: 1rem;
}

#songHost.song-host-panel > .eyebrow {
  margin-top: 1rem;
  margin-bottom: 0.45rem;
}

#songHost.song-host-panel > h2 {
  margin-bottom: 0.45rem;
  font-size: 1.85rem;
}

#songHost.song-host-panel > .small-note {
  margin-bottom: 0.85rem;
  font-size: 0.95rem;
}

#songHost.song-host-panel .host-messages {
  min-height: 160px;
  max-height: 265px;
  overflow-y: auto;
  margin-bottom: 0.8rem;
  padding: 0.85rem;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  background: rgba(255,255,255,0.045);
}

#songHost.song-host-panel .host-actions {
  margin-bottom: 1rem;
}

#songHost.song-host-panel.is-collapsed {
  width: min(330px, calc(100vw - 2rem)) !important;
  max-height: 4.4rem !important;
}

#songHost.song-host-panel.is-collapsed > .eyebrow,
#songHost.song-host-panel.is-collapsed > h2,
#songHost.song-host-panel.is-collapsed > .small-note,
#songHost.song-host-panel.is-collapsed > .host-messages,
#songHost.song-host-panel.is-collapsed > .host-actions {
  display: none !important;
}

@media (max-width: 760px) {
  #songHost.song-host-panel {
    left: 0.75rem !important;
    right: 0.75rem !important;
    bottom: 0.75rem !important;
    width: auto !important;
    max-height: calc(100vh - 1.5rem) !important;
  }

  #songHost.song-host-panel.is-collapsed {
    width: auto !important;
  }
}
'@

if ($css -match 'Force Song Host to bottom-right even before JS class initializes') {
  $css = [regex]::Replace($css, '(?s)\n/\* Force Song Host to bottom-right even before JS class initializes \*/.*$', "`r`n" + $forceBlock.TrimStart())
} else {
  $css = $css.TrimEnd() + "`r`n" + $forceBlock + "`r`n"
}

Write-Utf8NoBom -Path $SongHostCss -Content $css
Write-Host "Updated song-host.css with direct #songHost fallback." -ForegroundColor Green

Write-Host ""
Write-Host "Force floating/cache-bust patch complete." -ForegroundColor Cyan
Write-Host "Updated files:" -ForegroundColor Cyan
Write-Host $SongsHtml
Write-Host $SongHostCss
Write-Host "Backup dir:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Commit and push songs.html and song-host.css through GitHub Desktop."
Write-Host "2. Hard refresh the website with Ctrl+F5."
