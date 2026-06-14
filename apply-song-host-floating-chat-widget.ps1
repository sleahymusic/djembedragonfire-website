# Djembe website - floating Song Host chat widget
#
# Purpose:
# - Move the Ollama Song Host panel to the bottom-right as a chat-style widget.
# - Collapsed by default as a compact launcher.
# - Opens to a usable chat window with visible input/actions.
# - Render input immediately, before/while data/songs.csv loads.
# - Avoid non-ASCII content in this PowerShell helper.
#
# Run from website repo:
#   D:\Djembe\AI Brain\AI Core\Website Projects\Djembe Dragonfire Website\Website Repo\djembedragonfire-website

$ErrorActionPreference = "Stop"

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CoreRoot = Resolve-Path (Join-Path $RepoDir "..\..\..\..")
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $CoreRoot "_Backups\$Stamp-djembe-website-floating-song-host"
$SongHostJs = Join-Path $RepoDir "song-host.js"
$SongHostCss = Join-Path $RepoDir "song-host.css"

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
  $escape = $false
  for ($i = $braceStart; $i -lt $Content.Length; $i++) {
    $ch = $Content[$i]
    if ($escape) { $escape = $false; continue }
    if ($ch -eq '\') { $escape = $true; continue }
    if ($inSingle) { if ($ch -eq "'") { $inSingle = $false }; continue }
    if ($inDouble) { if ($ch -eq '"') { $inDouble = $false }; continue }
    if ($inTemplate) { if ($ch -eq '`') { $inTemplate = $false }; continue }
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
  $start = $Content.IndexOf("async function $FunctionName", [System.StringComparison]::Ordinal)
  if ($start -lt 0) { $start = $Content.IndexOf("function $FunctionName", [System.StringComparison]::Ordinal) }
  if ($start -lt 0) { throw "Could not find JS function: $FunctionName" }
  $end = Find-JsFunctionEnd -Content $Content -StartIndex $start
  return $Content.Substring(0, $start) + $Replacement.TrimEnd() + "`r`n" + $Content.Substring($end)
}

Write-Host "Applying floating Song Host widget patch" -ForegroundColor Cyan
Write-Host "Repo: $RepoDir"
Write-Host "Backup dir: $BackupDir"

Backup-File $SongHostJs
Backup-File $SongHostCss

$js = Get-Content -Raw -Path $SongHostJs

$floatingFunction = @'
function setupFloatingSongHost() {
  const panel = document.getElementById('songHost');
  if (!panel || panel.dataset.floatingReady === 'true') return;

  panel.dataset.floatingReady = 'true';
  panel.classList.add('song-host-floating', 'is-collapsed');

  const header = document.createElement('button');
  header.className = 'song-host-dock-header';
  header.type = 'button';
  header.setAttribute('aria-expanded', 'false');
  header.innerHTML = `
    <span class="song-host-dock-light" aria-hidden="true"></span>
    <span class="song-host-dock-title"><small>Ollama Song Host</small><strong>Ask for a song</strong></span>
    <span class="song-host-dock-state" aria-hidden="true">+</span>
  `;

  panel.insertBefore(header, panel.firstChild);

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
}
'@

if ($js -notmatch 'function setupFloatingSongHost\(') {
  $js = $js.Replace('function hostSay(text, save = true) {', $floatingFunction + "`r`nfunction hostSay(text, save = true) {")
  Write-Host "Inserted setupFloatingSongHost()." -ForegroundColor Green
} else {
  Write-Host "setupFloatingSongHost() already present." -ForegroundColor Yellow
}

$newInit = @'
async function initSongHost() {
  if (!hostMessages || !hostActions) return;

  setupFloatingSongHost();
  resetHost();

  try {
    const response = await fetch('data/songs.csv', { cache: 'no-store' });
    const csvText = await response.text();
    hostState.songs = hostRowsToSongs(hostParseCsv(csvText));
  } catch (error) {
    console.error(error);
    hostSay('I could not load the local song catalog yet, but you can still type a request and I will ask the live Djembe host.');
    renderConversationalActions();
  }
}
'@

$js = Replace-JsFunction -Content $js -FunctionName 'initSongHost' -Replacement $newInit
Write-Host "Patched initSongHost() to render input immediately." -ForegroundColor Green

Write-Utf8NoBom -Path $SongHostJs -Content $js

$css = Get-Content -Raw -Path $SongHostCss
$cssBlock = @'

/* Floating bottom-right Song Host widget */
.song-host-floating {
  position: fixed !important;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 950;
  width: min(430px, calc(100vw - 2rem));
  max-height: min(760px, calc(100vh - 2rem));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 !important;
  border-radius: 28px !important;
  box-shadow: 0 32px 90px rgba(0, 0, 0, 0.68), 0 0 55px rgba(34, 211, 238, 0.12) !important;
}

.song-host-floating::after {
  display: none !important;
}

.song-host-dock-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  min-height: 4.4rem;
  padding: 0.9rem 1rem;
  border: 0;
  border-bottom: 1px solid rgba(255,255,255,0.12);
  color: var(--text);
  background: linear-gradient(135deg, rgba(8,6,10,0.98), rgba(25,9,22,0.96) 58%, rgba(5,28,35,0.92));
  cursor: pointer;
  text-align: left;
}

.song-host-dock-light {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  background: var(--cyan);
  box-shadow: 0 0 22px rgba(34, 211, 238, 0.9);
  animation: hostPulse 1.8s ease-in-out infinite;
}

.song-host-dock-title small,
.song-host-dock-title strong {
  display: block;
}

.song-host-dock-title small {
  color: var(--muted);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.song-host-dock-title strong {
  color: var(--text);
  font-size: 1.05rem;
  line-height: 1.15;
}

.song-host-dock-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  color: #1c0710;
  background: linear-gradient(135deg, var(--gold), var(--rose));
  font-weight: 950;
  font-size: 1.2rem;
}

.song-host-floating > .eyebrow,
.song-host-floating > h2,
.song-host-floating > .small-note,
.song-host-floating > .host-messages,
.song-host-floating > .host-actions {
  margin-left: 1rem;
  margin-right: 1rem;
}

.song-host-floating > .eyebrow {
  margin-top: 1rem;
  margin-bottom: 0.45rem;
}

.song-host-floating > h2 {
  margin-bottom: 0.45rem;
  font-size: 1.85rem;
}

.song-host-floating > .small-note {
  margin-bottom: 0.85rem;
  font-size: 0.95rem;
}

.song-host-floating .host-messages {
  min-height: 160px;
  max-height: 265px;
  overflow-y: auto;
  margin-bottom: 0.8rem;
  padding: 0.85rem;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  background: rgba(255,255,255,0.045);
}

.song-host-floating .host-actions {
  margin-bottom: 1rem;
}

.song-host-floating .host-input-row {
  grid-template-columns: 1fr auto;
}

.song-host-floating .host-chat-input {
  min-width: 0;
}

.song-host-floating.is-collapsed {
  width: min(330px, calc(100vw - 2rem));
  max-height: 4.4rem;
}

.song-host-floating.is-collapsed > .eyebrow,
.song-host-floating.is-collapsed > h2,
.song-host-floating.is-collapsed > .small-note,
.song-host-floating.is-collapsed > .host-messages,
.song-host-floating.is-collapsed > .host-actions {
  display: none !important;
}

@media (max-width: 760px) {
  .song-host-floating {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
    width: auto;
    max-height: calc(100vh - 1.5rem);
  }

  .song-host-floating.is-collapsed {
    width: auto;
  }

  .song-host-floating .host-input-row {
    grid-template-columns: 1fr;
  }
}
'@

if ($css -notmatch 'Floating bottom-right Song Host widget') {
  $css = $css.TrimEnd() + "`r`n" + $cssBlock + "`r`n"
  Write-Host "Appended floating Song Host CSS." -ForegroundColor Green
} else {
  Write-Host "Floating Song Host CSS already present; skipping append." -ForegroundColor Yellow
}

Write-Utf8NoBom -Path $SongHostCss -Content $css

Write-Host ""
Write-Host "Floating Song Host widget patch complete." -ForegroundColor Cyan
Write-Host "Updated files:" -ForegroundColor Cyan
Write-Host $SongHostJs
Write-Host $SongHostCss
Write-Host "Backup dir:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Commit and push song-host.js and song-host.css through GitHub Desktop."
Write-Host "2. Hard refresh the website with Ctrl+F5."
