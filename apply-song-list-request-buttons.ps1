# Djembe website - add song-list request buttons
#
# Purpose:
# - Add 'Send request to Djembe now' buttons to song cards and Song of the Week.
# - Reuse the existing Djembe Music Worker /website/request endpoint.
# - Add lightweight browser cooldown for user experience; real anti-spam is server-side.
#
# Run from website repo:
#   D:\Djembe\AI Brain\AI Core\Website Projects\Djembe Dragonfire Website\Website Repo\djembedragonfire-website

$ErrorActionPreference = "Stop"

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CoreRoot = Resolve-Path (Join-Path $RepoDir "..\..\..\..")
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $CoreRoot "_Backups\$Stamp-djembe-website-song-list-request-buttons"
$SongsJs = Join-Path $RepoDir "songs.js"

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

Write-Host "Adding song-list request buttons" -ForegroundColor Cyan
Write-Host "Repo: $RepoDir"
Write-Host "Backup dir: $BackupDir"

Backup-File $SongsJs
$js = Get-Content -Raw -Path $SongsJs

if ($js -notmatch 'const SONG_REQUEST_ENDPOINT') {
  $js = $js.Replace(
"const requestGuide = document.getElementById('requestGuide');",
"const requestGuide = document.getElementById('requestGuide');`r`n`r`nconst SONG_REQUEST_ENDPOINT = 'https://djembe-music-brain.sleahymusic.workers.dev/website/request';`r`nconst SONG_REQUEST_TIMEOUT_MS = 30000;`r`nconst songRequestCooldownKey = 'djembeDragonfireSongRequestLastSent';`r`nconst SONG_REQUEST_CLIENT_COOLDOWN_MS = 30000;"
  )
  Write-Host "Inserted request endpoint constants." -ForegroundColor Green
} else {
  Write-Host "Request endpoint constants already present." -ForegroundColor Yellow
}

$helper = @'

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function canSendSongRequestNow() {
  const last = Number(localStorage.getItem(songRequestCooldownKey) || 0);
  const elapsed = Date.now() - last;
  return elapsed >= SONG_REQUEST_CLIENT_COOLDOWN_MS;
}

function markSongRequestSentNow() {
  localStorage.setItem(songRequestCooldownKey, String(Date.now()));
}

async function sendSongListRequest(song, button) {
  if (!song || !song.title || !song.artist) return;
  if (!canSendSongRequestNow()) {
    alert('Please wait a moment before sending another request.');
    return;
  }

  const guestName = window.prompt('What name should Djembe see with this request?\n\nUse your Second Life name or display name.', 'Website guest');
  if (guestName === null) return;

  const note = window.prompt('Optional: add a dedication or short note for Djembe.', '') || '';
  const payload = {
    guestName: guestName.trim() || 'Website guest',
    songTitle: song.title,
    artist: song.artist,
    note: note.trim(),
    source: 'DjembeDragonfire.com song list',
    website: ''
  };

  const oldText = button ? button.textContent : '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Sending...';
  }

  try {
    const response = await fetchWithTimeout(SONG_REQUEST_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }, SONG_REQUEST_TIMEOUT_MS);
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Request bridge error');
    markSongRequestSentNow();
    alert(data.reply || `Request sent to Djembe: ${payload.songTitle} - ${payload.artist}`);
  } catch (error) {
    console.error(error);
    alert('The live request bridge did not answer. Please try again in a moment or ask Djembe in-world.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = oldText || 'Send request to Djembe now';
    }
  }
}
'@

if ($js -notmatch 'async function sendSongListRequest\(') {
  $js = $js.Replace('function renderSongOfWeek() {', $helper + "`r`nfunction renderSongOfWeek() {")
  Write-Host "Inserted request helper functions." -ForegroundColor Green
} else {
  Write-Host "Request helper functions already present." -ForegroundColor Yellow
}

$oldWeek = @'
      ${sample ? `<audio controls preload="none" src="${escapeHtml(sample)}"></audio>` : '<p class="small-note">Audio sample coming soon.</p>'}
    </div>
    <button class="favorite-button${found && favorites.has(songKey(found)) ? ' is-favorite' : ''}" type="button" data-song-key="${found ? escapeHtml(songKey(found)) : ''}">♥ Favorite</button>
  `;
}
'@
$newWeek = @'
      ${sample ? `<audio controls preload="none" src="${escapeHtml(sample)}"></audio>` : '<p class="small-note">Audio sample coming soon.</p>'}
      ${found ? `<button class="button secondary song-request-button" type="button" data-song-key="${escapeHtml(songKey(found))}">Send request to Djembe now</button>` : ''}
    </div>
    <button class="favorite-button${found && favorites.has(songKey(found)) ? ' is-favorite' : ''}" type="button" data-song-key="${found ? escapeHtml(songKey(found)) : ''}">♥ Favorite</button>
  `;
}
'@
if ($js.Contains($oldWeek)) {
  $js = $js.Replace($oldWeek, $newWeek)
  Write-Host "Added request button to Song of the Week." -ForegroundColor Green
} elseif ($js -match 'Song of the Week' -and $js -match 'song-request-button') {
  Write-Host "Song of the Week request button appears already present." -ForegroundColor Yellow
} else {
  Write-Host "Could not patch Song of the Week button; continuing with song cards." -ForegroundColor Yellow
}

$oldCardTail = @'
      <div class="song-tags"><span>${escapeHtml(song.category)}</span><span>${escapeHtml(song.energy)}</span>${normalizeList(song.mood).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}${normalizeList(song.style).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    </article>`;
'@
$newCardTail = @'
      <div class="song-tags"><span>${escapeHtml(song.category)}</span><span>${escapeHtml(song.energy)}</span>${normalizeList(song.mood).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}${normalizeList(song.style).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      <button class="button secondary song-request-button" type="button" data-song-key="${escapeHtml(key)}">Send request to Djembe now</button>
    </article>`;
'@
if ($js.Contains($oldCardTail)) {
  $js = $js.Replace($oldCardTail, $newCardTail)
  Write-Host "Added request button to each song card." -ForegroundColor Green
} elseif ($js -match 'data-song-key="\$\{escapeHtml\(key\)\}".*Send request to Djembe now') {
  Write-Host "Song card request buttons already present." -ForegroundColor Yellow
} else {
  throw "Could not find song card tag block to patch."
}

$oldClick = @'
document.addEventListener('click', event => {
  const favoriteButton = event.target.closest('.favorite-button');
  if (favoriteButton) toggleFavorite(favoriteButton.dataset.songKey);
});
'@
$newClick = @'
document.addEventListener('click', event => {
  const requestButton = event.target.closest('.song-request-button');
  if (requestButton) {
    const key = requestButton.dataset.songKey;
    const song = songs.find(item => songKey(item) === key);
    sendSongListRequest(song, requestButton);
    return;
  }

  const favoriteButton = event.target.closest('.favorite-button');
  if (favoriteButton) toggleFavorite(favoriteButton.dataset.songKey);
});
'@
if ($js.Contains($oldClick)) {
  $js = $js.Replace($oldClick, $newClick)
  Write-Host "Patched document click handler for request buttons." -ForegroundColor Green
} elseif ($js -match 'sendSongListRequest\(song, requestButton\)') {
  Write-Host "Request click handler already present." -ForegroundColor Yellow
} else {
  throw "Could not find document click handler to patch."
}

Write-Utf8NoBom -Path $SongsJs -Content $js

Write-Host ""
Write-Host "Song-list request buttons patch complete." -ForegroundColor Cyan
Write-Host "Backup dir:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Commit/push songs.js through GitHub Desktop."
Write-Host "2. Hard refresh the website."
Write-Host "3. Click 'Send request to Djembe now' on a song card."
