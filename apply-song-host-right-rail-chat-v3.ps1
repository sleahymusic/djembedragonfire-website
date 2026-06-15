# Djembe website - Song Host right-rail chat v3
#
# Purpose:
# - Replace fragile collapsed floating Song Host behavior.
# - Keep chat input visible and clickable.
# - Desktop/wide screens: fixed near the top-right/right margin.
# - Smaller screens: fixed bottom-right/bottom sheet style.
# - Cache-bust song-host.js and song-host.css in songs.html.
#
# Run from website repo:
#   D:\Djembe\AI Brain\AI Core\Website Projects\Djembe Dragonfire Website\Website Repo\djembedragonfire-website

$ErrorActionPreference = "Stop"

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CoreRoot = Resolve-Path (Join-Path $RepoDir "..\..\..\..")
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $CoreRoot "_Backups\$Stamp-djembe-song-host-right-rail-chat-v3"
$SongHostJs = Join-Path $RepoDir "song-host.js"
$SongHostCss = Join-Path $RepoDir "song-host.css"
$SongsHtml = Join-Path $RepoDir "songs.html"
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

function Find-JsFunctionEnd {
  param([string]$Content, [int]$StartIndex)
  $braceStart = $Content.IndexOf('{', $StartIndex)
  if ($braceStart -lt 0) { throw "Could not find opening brace." }
  $depth = 0
  $inSingle = $false
  $inDouble = $false
  $inTemplate = $false
  $inLineComment = $false
  $inBlockComment = $false
  $escape = $false

  for ($i = $braceStart; $i -lt $Content.Length; $i++) {
    $ch = $Content[$i]
    $next = if ($i + 1 -lt $Content.Length) { $Content[$i + 1] } else { [char]0 }

    if ($inLineComment) { if ($ch -eq "`n") { $inLineComment = $false }; continue }
    if ($inBlockComment) { if ($ch -eq '*' -and $next -eq '/') { $inBlockComment = $false; $i++ }; continue }
    if ($escape) { $escape = $false; continue }
    if ($ch -eq '\') { $escape = $true; continue }
    if ($inSingle) { if ($ch -eq "'") { $inSingle = $false }; continue }
    if ($inDouble) { if ($ch -eq '"') { $inDouble = $false }; continue }
    if ($inTemplate) { if ($ch -eq '`') { $inTemplate = $false }; continue }
    if ($ch -eq '/' -and $next -eq '/') { $inLineComment = $true; $i++; continue }
    if ($ch -eq '/' -and $next -eq '*') { $inBlockComment = $true; $i++; continue }
    if ($ch -eq "'") { $inSingle = $true; continue }
    if ($ch -eq '"') { $inDouble = $true; continue }
    if ($ch -eq '`') { $inTemplate = $true; continue }
    if ($ch -eq '{') { $depth++ }
    elseif ($ch -eq '}') {
      $depth--
      if ($depth -eq 0) { return $i + 1 }
    }
  }
  throw "Could not find closing brace."
}

function Replace-JsFunction {
  param([string]$Content, [string]$FunctionName, [string]$Replacement)
  $start = $Content.IndexOf("function $FunctionName", [System.StringComparison]::Ordinal)
  if ($start -lt 0) { throw "Could not find JS function: $FunctionName" }
  $end = Find-JsFunctionEnd -Content $Content -StartIndex $start
  return $Content.Substring(0, $start) + $Replacement.TrimEnd() + "`r`n" + $Content.Substring($end)
}

Write-Host "Applying Song Host right-rail chat v3" -ForegroundColor Cyan
Write-Host "Repo: $RepoDir"
Write-Host "Backup dir: $BackupDir"

Backup-File $SongHostJs
Backup-File $SongHostCss
Backup-File $SongsHtml

$js = Get-Content -Raw -Path $SongHostJs

$newSetup = @'
function setupFloatingSongHost() {
  const panel = document.getElementById('songHost');
  if (!panel || panel.dataset.floatingReady === 'true') return;

  panel.dataset.floatingReady = 'true';
  panel.classList.add('song-host-floating', 'song-host-right-rail', 'is-open');
  panel.classList.remove('is-collapsed');

  let header = panel.querySelector('.song-host-dock-header');
  if (!header) {
    header = document.createElement('button');
    header.className = 'song-host-dock-header';
    header.type = 'button';
    header.setAttribute('aria-expanded', 'true');
    header.innerHTML = `
      <span class="song-host-dock-light" aria-hidden="true"></span>
      <span class="song-host-dock-title"><small>Ollama Song Host</small><strong>Ask for a song</strong></span>
      <span class="song-host-dock-state" aria-hidden="true">-</span>
    `;
    panel.insertBefore(header, panel.firstChild);
  }

  function setOpen(open) {
    panel.classList.toggle('is-collapsed', !open);
    panel.classList.toggle('is-open', open);
    header.setAttribute('aria-expanded', open ? 'true' : 'false');
    const state = header.querySelector('.song-host-dock-state');
    if (state) state.textContent = open ? '-' : '+';
    if (open) {
      window.setTimeout(() => panel.querySelector('.host-chat-input')?.focus(), 80);
    }
  }

  header.addEventListener('click', () => {
    setOpen(panel.classList.contains('is-collapsed'));
  });

  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });

  setOpen(true);
}
'@

$js = Replace-JsFunction -Content $js -FunctionName 'setupFloatingSongHost' -Replacement $newSetup
Write-Host "Patched setupFloatingSongHost() to open by default." -ForegroundColor Green

Write-Utf8NoBom -Path $SongHostJs -Content $js

$css = Get-Content -Raw -Path $SongHostCss
$cssBlock = @'

/* Song Host right-rail chat v3 - input-safe layout */
#songHost.song-host-panel,
#songHost.song-host-floating,
.song-host-right-rail {
  position: fixed !important;
  top: 7rem !important;
  right: 1rem !important;
  bottom: auto !important;
  z-index: 950 !important;
  width: min(360px, calc(100vw - 2rem)) !important;
  max-height: calc(100vh - 8.5rem) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  padding: 0 !important;
  border-radius: 24px !important;
  background: linear-gradient(145deg, rgba(8,6,10,0.96), rgba(31,10,23,0.94)) !important;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.66), 0 0 42px rgba(34, 211, 238, 0.10) !important;
}

#songHost.song-host-panel::after,
#songHost.song-host-floating::after,
.song-host-right-rail::after {
  display: none !important;
}

#songHost .song-host-dock-header {
  flex: 0 0 auto !important;
  display: grid !important;
  grid-template-columns: auto 1fr auto !important;
  align-items: center !important;
  gap: 0.8rem !important;
  width: 100% !important;
  min-height: 4.1rem !important;
  padding: 0.85rem 1rem !important;
  border: 0 !important;
  border-bottom: 1px solid rgba(255,255,255,0.12) !important;
  color: var(--text) !important;
  background: linear-gradient(135deg, rgba(8,6,10,0.98), rgba(25,9,22,0.96) 58%, rgba(5,28,35,0.92)) !important;
  cursor: pointer !important;
  text-align: left !important;
}

#songHost .song-host-dock-light {
  width: 0.85rem !important;
  height: 0.85rem !important;
  border-radius: 999px !important;
  background: var(--cyan) !important;
  box-shadow: 0 0 22px rgba(34, 211, 238, 0.9) !important;
  animation: hostPulse 1.8s ease-in-out infinite !important;
}

#songHost .song-host-dock-title small,
#songHost .song-host-dock-title strong {
  display: block !important;
}

#songHost .song-host-dock-title small {
  color: var(--muted) !important;
  font-size: 0.72rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
}

#songHost .song-host-dock-title strong {
  color: var(--text) !important;
  font-size: 1.02rem !important;
  line-height: 1.15 !important;
}

#songHost .song-host-dock-state {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 2rem !important;
  height: 2rem !important;
  border-radius: 999px !important;
  color: #1c0710 !important;
  background: linear-gradient(135deg, var(--gold), var(--rose)) !important;
  font-weight: 950 !important;
  font-size: 1.2rem !important;
}

#songHost > .eyebrow,
#songHost > h2,
#songHost > .small-note,
#songHost > .host-messages,
#songHost > .host-actions {
  margin-left: 1rem !important;
  margin-right: 1rem !important;
}

#songHost > .eyebrow {
  flex: 0 0 auto !important;
  margin-top: 0.9rem !important;
  margin-bottom: 0.35rem !important;
  font-size: 0.7rem !important;
}

#songHost > h2 {
  flex: 0 0 auto !important;
  margin-bottom: 0.35rem !important;
  font-size: 1.65rem !important;
  line-height: 1 !important;
}

#songHost > .small-note {
  flex: 0 0 auto !important;
  margin-bottom: 0.7rem !important;
  font-size: 0.9rem !important;
  line-height: 1.35 !important;
}

#songHost .host-messages {
  flex: 1 1 auto !important;
  min-height: 120px !important;
  max-height: none !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
  margin-bottom: 0.7rem !important;
  padding: 0.75rem !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-radius: 16px !important;
  background: rgba(255,255,255,0.045) !important;
}

#songHost .host-actions {
  flex: 0 0 auto !important;
  position: relative !important;
  z-index: 3 !important;
  display: block !important;
  margin-bottom: 1rem !important;
  pointer-events: auto !important;
}

#songHost .host-actions.is-thinking {
  pointer-events: auto !important;
}

#songHost .host-actions.is-thinking::after {
  content: "Ollama is thinking..." !important;
}

#songHost .host-input-row {
  display: grid !important;
  grid-template-columns: 1fr auto !important;
  gap: 0.6rem !important;
  width: 100% !important;
}

#songHost .host-chat-input,
#songHost .host-name-input,
#songHost .host-chat-send,
#songHost .host-send,
#songHost .host-confirm,
#songHost .host-guided,
#songHost .host-again,
#songHost button,
#songHost input {
  position: relative !important;
  z-index: 4 !important;
  pointer-events: auto !important;
}

#songHost .host-chat-input,
#songHost .host-name-input {
  min-width: 0 !important;
  width: 100% !important;
}

#songHost.is-collapsed {
  width: min(320px, calc(100vw - 2rem)) !important;
  height: auto !important;
  max-height: 4.1rem !important;
}

#songHost.is-collapsed > .eyebrow,
#songHost.is-collapsed > h2,
#songHost.is-collapsed > .small-note,
#songHost.is-collapsed > .host-messages,
#songHost.is-collapsed > .host-actions {
  display: none !important;
}

@media (min-width: 1560px) {
  #songHost.song-host-panel,
  #songHost.song-host-floating,
  .song-host-right-rail {
    top: 8rem !important;
    right: max(1rem, calc((100vw - 1180px) / 2 - 350px)) !important;
    width: 340px !important;
  }
}

@media (max-width: 1350px) {
  #songHost.song-host-panel,
  #songHost.song-host-floating,
  .song-host-right-rail {
    top: auto !important;
    right: 1rem !important;
    bottom: 1rem !important;
    width: min(380px, calc(100vw - 2rem)) !important;
    max-height: min(640px, calc(100vh - 2rem)) !important;
  }
}

@media (max-width: 760px) {
  #songHost.song-host-panel,
  #songHost.song-host-floating,
  .song-host-right-rail {
    left: 0.75rem !important;
    right: 0.75rem !important;
    bottom: 0.75rem !important;
    width: auto !important;
    max-height: min(660px, calc(100vh - 1.5rem)) !important;
  }

  #songHost .host-input-row {
    grid-template-columns: 1fr !important;
  }

  #songHost .host-action-row .button,
  #songHost .host-actions .button,
  #songHost .host-actions .choice-button {
    width: 100% !important;
  }
}
'@

# Remove older force/right-rail blocks, then append the v3 override at the end.
$css = [regex]::Replace($css, '(?s)\n/\* Force Song Host to bottom-right even before JS class initializes \*/.*?(?=\n/\* Song Host right-rail chat v3|$)', "`r`n")
$css = [regex]::Replace($css, '(?s)\n/\* Song Host right-rail chat v3 - input-safe layout \*/.*$', "`r`n")
$css = $css.TrimEnd() + "`r`n" + $cssBlock + "`r`n"
Write-Utf8NoBom -Path $SongHostCss -Content $css
Write-Host "Patched song-host.css with input-safe right-rail layout." -ForegroundColor Green

$html = Get-Content -Raw -Path $SongsHtml
$html = [regex]::Replace($html, 'href="song-host\.css(?:\?v=[^"]*)?"', 'href="song-host.css?v=' + $Version + '"')
$html = [regex]::Replace($html, 'src="song-host\.js(?:\?v=[^"]*)?"', 'src="song-host.js?v=' + $Version + '"')
Write-Utf8NoBom -Path $SongsHtml -Content $html
Write-Host "Cache-busted song-host assets in songs.html: $Version" -ForegroundColor Green

Write-Host ""
Write-Host "Song Host right-rail chat v3 complete." -ForegroundColor Cyan
Write-Host "Updated files:" -ForegroundColor Cyan
Write-Host $SongHostJs
Write-Host $SongHostCss
Write-Host $SongsHtml
Write-Host "Backup dir:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Commit and push song-host.js, song-host.css, and songs.html through GitHub Desktop."
Write-Host "2. Hard refresh the website with Ctrl+F5."
