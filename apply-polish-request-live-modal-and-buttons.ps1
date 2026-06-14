# Djembe website - polish Request Live buttons and modal
#
# Purpose:
# - Fix mojibaked emojis/hearts in songs.js using HTML entities.
# - Move song-card request buttons to bottom-right and label them "Request Live".
# - Replace browser prompt/alert boxes with a larger styled modal for name + dedication.
# - Keep existing backend endpoint and spam guard.
#
# Run from website repo:
#   D:\Djembe\AI Brain\AI Core\Website Projects\Djembe Dragonfire Website\Website Repo\djembedragonfire-website

$ErrorActionPreference = "Stop"

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CoreRoot = Resolve-Path (Join-Path $RepoDir "..\..\..\..")
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $CoreRoot "_Backups\$Stamp-djembe-website-request-live-polish"
$SongsJs = Join-Path $RepoDir "songs.js"
$StylesCss = Join-Path $RepoDir "styles.css"

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

function Replace-JsFunction {
  param(
    [Parameter(Mandatory=$true)][string]$Content,
    [Parameter(Mandatory=$true)][string]$FunctionName,
    [Parameter(Mandatory=$true)][string]$Replacement
  )

  $start = $Content.IndexOf("async function $FunctionName", [System.StringComparison]::Ordinal)
  if ($start -lt 0) { $start = $Content.IndexOf("function $FunctionName", [System.StringComparison]::Ordinal) }
  if ($start -lt 0) { throw "Could not find JS function: $FunctionName" }

  $braceStart = $Content.IndexOf('{', $start)
  if ($braceStart -lt 0) { throw "Could not find opening brace for JS function: $FunctionName" }

  $depth = 0
  $inSingle = $false
  $inDouble = $false
  $inTemplate = $false
  $escape = $false

  for ($i = $braceStart; $i -lt $Content.Length; $i++) {
    $ch = $Content[$i]

    if ($escape) { $escape = $false; continue }
    if ($ch -eq '\') { $escape = $true; continue }

    if ($inSingle) {
      if ($ch -eq "'") { $inSingle = $false }
      continue
    }
    if ($inDouble) {
      if ($ch -eq '"') { $inDouble = $false }
      continue
    }
    if ($inTemplate) {
      if ($ch -eq '`') { $inTemplate = $false }
      # Do not try to parse ${} template internals; this is good enough for replacing a standalone function body.
      continue
    }

    if ($ch -eq "'") { $inSingle = $true; continue }
    if ($ch -eq '"') { $inDouble = $true; continue }
    if ($ch -eq '`') { $inTemplate = $true; continue }

    if ($ch -eq '{') { $depth++ }
    elseif ($ch -eq '}') {
      $depth--
      if ($depth -eq 0) {
        $end = $i + 1
        return $Content.Substring(0, $start) + $Replacement.TrimEnd() + "`r`n" + $Content.Substring($end)
      }
    }
  }

  throw "Could not find closing brace for JS function: $FunctionName"
}

Write-Host "Polishing Request Live UI" -ForegroundColor Cyan
Write-Host "Repo: $RepoDir"
Write-Host "Backup dir: $BackupDir"

Backup-File $SongsJs
Backup-File $StylesCss

$js = Get-Content -Raw -Path $SongsJs

# Fix choice emoji source safely with entities.
$choiceReplacement = @'
const choicePresets = [
  { label: 'Make Me Smile', emoji: '&#128522;', terms: ['joy'], description: 'Songs with warmth, fun, and lift.' },
  { label: 'Break My Heart', emoji: '&#128148;', terms: ['breakup', 'intimacy'], description: 'Emotional songs with ache and vulnerability.' },
  { label: 'Inspire Me', emoji: '&#10024;', terms: ['empowerment', 'devotion'], description: 'Songs that feel hopeful, strong, or grounding.' },
  { label: 'Tell Me a Story', emoji: '&#127917;', terms: ['theatrical', 'showtunes'], description: 'Broadway, standards, and dramatic vocal moments.' },
  { label: 'Dance Energy', emoji: '&#128378;', terms: ['high', 'edm', 'joy'], description: 'Higher-energy songs for movement and momentum.' },
  { label: 'Quiet & Intimate', emoji: '&#128367;', terms: ['low', 'intimacy'], description: 'Softer songs for close, emotional moments.' },
  { label: 'Nostalgia Trip', emoji: '&#127769;', terms: ['nostalgia'], description: 'Songs that feel familiar, reflective, or memory-filled.' },
  { label: 'Holiday Cheer', emoji: '&#127876;', terms: ['festive', 'holiday'], description: 'Christmas and seasonal favorites.' },
  { label: 'Surprise Me', emoji: '&#127922;', terms: [], random: true, description: 'A random spark from the whole catalog.' }
];
'@
$js = [regex]::Replace($js, '(?s)const choicePresets = \[.*?\];', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $choiceReplacement }, 1)

# Fix known mojibake bits that are visible in the screenshot.
$js = $js.Replace('â€”', ' - ')
$js = $js.Replace('â™¥', '&#9829;')

# Replace prompt/alert request flow with a polished modal.
$requestFunction = @'
async function sendSongListRequest(song, button) {
  if (!song || !song.title || !song.artist) return;

  if (!canSendSongRequestNow()) {
    openSongRequestModal(song, button, 'cooldown');
    return;
  }

  openSongRequestModal(song, button, 'ready');
}

function closeSongRequestModal() {
  document.querySelector('.song-request-modal-backdrop')?.remove();
}

function openSongRequestModal(song, sourceButton, mode = 'ready') {
  closeSongRequestModal();

  const overlay = document.createElement('div');
  overlay.className = 'song-request-modal-backdrop';
  overlay.innerHTML = `
    <div class="song-request-modal" role="dialog" aria-modal="true" aria-label="Request ${escapeHtml(song.title)} live">
      <button class="song-request-modal-close" type="button" aria-label="Close request form">&times;</button>
      <p class="eyebrow">Live Song Request</p>
      <h2>Request Live</h2>
      <p class="song-request-modal-song"><strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)}</span></p>
      <p class="song-request-modal-copy">Send this request straight to Djembe's live show HUD.</p>
      <label>
        <span>Your name</span>
        <input class="song-request-name" type="text" maxlength="80" placeholder="Second Life name or display name" autocomplete="name" />
      </label>
      <label>
        <span>Dedication or note <em>optional</em></span>
        <textarea class="song-request-note" maxlength="260" rows="4" placeholder="For someone special, a mood, or a short message..."></textarea>
      </label>
      <div class="song-request-modal-status" aria-live="polite"></div>
      <div class="song-request-modal-actions">
        <button class="button secondary song-request-cancel" type="button">Cancel</button>
        <button class="button song-request-submit" type="button">Send to Djembe</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const nameInput = overlay.querySelector('.song-request-name');
  const noteInput = overlay.querySelector('.song-request-note');
  const status = overlay.querySelector('.song-request-modal-status');
  const submit = overlay.querySelector('.song-request-submit');
  const cancel = overlay.querySelector('.song-request-cancel');
  const close = overlay.querySelector('.song-request-modal-close');

  const closeNow = () => closeSongRequestModal();
  cancel.addEventListener('click', closeNow);
  close.addEventListener('click', closeNow);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeNow();
  });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeNow();
  });

  if (mode === 'cooldown') {
    status.textContent = 'Please wait a moment before sending another live request.';
    status.className = 'song-request-modal-status is-warning';
    submit.disabled = true;
  }

  submit.addEventListener('click', async () => {
    const guestName = nameInput.value.trim();
    const note = noteInput.value.trim();

    if (!guestName) {
      status.textContent = 'Please enter the name Djembe should see with the request.';
      status.className = 'song-request-modal-status is-warning';
      nameInput.focus();
      return;
    }

    const payload = {
      guestName,
      songTitle: song.title,
      artist: song.artist,
      note,
      source: 'DjembeDragonfire.com song list',
      website: ''
    };

    submit.disabled = true;
    cancel.disabled = true;
    if (sourceButton) {
      sourceButton.disabled = true;
      sourceButton.textContent = 'Sending...';
    }
    status.textContent = 'Sending your live request to Djembe...';
    status.className = 'song-request-modal-status is-sending';

    try {
      const response = await fetchWithTimeout(SONG_REQUEST_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      }, SONG_REQUEST_TIMEOUT_MS);
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Request bridge error');
      markSongRequestSentNow();
      status.textContent = data.reply || `Request sent to Djembe: ${payload.songTitle} - ${payload.artist}`;
      status.className = 'song-request-modal-status is-success';
      submit.textContent = 'Sent';
      close.textContent = 'OK';
      close.classList.add('is-ok');
    } catch (error) {
      console.error(error);
      status.textContent = 'The live request bridge did not answer. Please try again in a moment or ask Djembe in-world.';
      status.className = 'song-request-modal-status is-error';
      submit.disabled = false;
      cancel.disabled = false;
    } finally {
      if (sourceButton) {
        sourceButton.disabled = false;
        sourceButton.textContent = 'Request Live';
      }
    }
  });

  window.setTimeout(() => nameInput.focus(), 50);
}
'@
$js = Replace-JsFunction -Content $js -FunctionName 'sendSongListRequest' -Replacement $requestFunction

# Update request button class and label in rendered sections.
$js = $js.Replace('class="button secondary song-request-button" type="button"', 'class="song-request-button song-request-live-button" type="button"')
$js = $js.Replace('Send request to Djembe now', 'Request Live')

Write-Utf8NoBom -Path $SongsJs -Content $js
Write-Host "Patched songs.js." -ForegroundColor Green

$css = Get-Content -Raw -Path $StylesCss
$cssBlock = @'

/* Live request buttons and modal */
.song-card {
  position: relative;
  min-height: 264px;
  padding-bottom: 4.8rem;
}

.song-request-live-button {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.9rem;
  padding: 0.72rem 1.12rem;
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 999px;
  color: #fff8f2;
  background: linear-gradient(135deg, #a6192e 0%, #e54b4b 55%, #ff7a59 100%);
  box-shadow: 0 18px 42px rgba(166, 25, 46, 0.45), inset 0 1px 0 rgba(255,255,255,0.16);
  cursor: pointer;
  font-size: 1.04rem;
  font-weight: 950;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}

.song-request-live-button:hover {
  transform: translateY(-2px);
  filter: brightness(1.08);
  box-shadow: 0 24px 54px rgba(166, 25, 46, 0.56), inset 0 1px 0 rgba(255,255,255,0.2);
}

.song-request-live-button:disabled {
  cursor: wait;
  opacity: 0.75;
  transform: none;
}

.song-of-week .song-request-live-button {
  position: static;
  margin-top: 1rem;
}

.song-request-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: radial-gradient(circle at center, rgba(229,75,122,0.18), transparent 32rem), rgba(4, 2, 6, 0.78);
  backdrop-filter: blur(14px);
}

.song-request-modal {
  position: relative;
  width: min(560px, 100%);
  border: 1px solid rgba(246,199,108,0.28);
  border-radius: 30px;
  padding: clamp(1.4rem, 4vw, 2.2rem);
  color: var(--text);
  background:
    radial-gradient(circle at 15% 0%, rgba(246,199,108,0.18), transparent 16rem),
    radial-gradient(circle at 90% 15%, rgba(229,75,122,0.24), transparent 18rem),
    linear-gradient(145deg, rgba(10,6,12,0.98), rgba(31,10,23,0.96));
  box-shadow: 0 40px 110px rgba(0,0,0,0.72);
}

.song-request-modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.55rem;
  height: 2.55rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  background: rgba(255,255,255,0.08);
  cursor: pointer;
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1;
}

.song-request-modal-close.is-ok {
  width: auto;
  padding: 0 1rem;
  color: #1c0710;
  background: linear-gradient(135deg, var(--gold), var(--rose));
  font-size: 0.95rem;
}

.song-request-modal h2 {
  margin-bottom: 0.7rem;
  font-size: clamp(2.4rem, 7vw, 4rem);
}

.song-request-modal-song {
  margin-bottom: 0.8rem;
  color: var(--muted);
  font-size: 1.12rem;
}

.song-request-modal-song strong,
.song-request-modal-song span {
  display: block;
}

.song-request-modal-song strong {
  color: var(--gold);
  font-size: 1.35rem;
  line-height: 1.2;
}

.song-request-modal-copy {
  margin-bottom: 1.2rem;
  color: var(--muted);
  font-size: 1.04rem;
}

.song-request-modal label {
  display: block;
  margin-top: 1rem;
}

.song-request-modal label span {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.45rem;
  color: var(--gold);
  font-weight: 900;
}

.song-request-modal label em {
  color: var(--muted);
  font-style: normal;
  font-weight: 700;
}

.song-request-modal input,
.song-request-modal textarea {
  width: 100%;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 18px;
  padding: 0.9rem 1rem;
  color: var(--text);
  background: rgba(255,255,255,0.08);
  font: inherit;
  font-size: 1.05rem;
  outline: none;
}

.song-request-modal textarea {
  resize: vertical;
  min-height: 7rem;
}

.song-request-modal input:focus,
.song-request-modal textarea:focus {
  border-color: rgba(246,199,108,0.7);
  box-shadow: 0 0 0 4px rgba(246,199,108,0.11);
}

.song-request-modal-status {
  min-height: 1.7rem;
  margin-top: 1rem;
  color: var(--muted);
  font-weight: 800;
}

.song-request-modal-status.is-success { color: #7df0a6; }
.song-request-modal-status.is-warning { color: var(--gold); }
.song-request-modal-status.is-error { color: #ff8a8a; }
.song-request-modal-status.is-sending { color: var(--cyan); }

.song-request-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
  margin-top: 1.2rem;
  flex-wrap: wrap;
}

.song-request-modal-actions .button {
  border: 0;
  cursor: pointer;
  font-size: 1.02rem;
}

@media (max-width: 900px) {
  .song-card { min-height: 240px; }
  .song-request-live-button { left: 1rem; right: 1rem; }
  .song-request-modal-actions { display: grid; grid-template-columns: 1fr; }
}
'@

if ($css -notmatch 'Live request buttons and modal') {
  $css = $css.TrimEnd() + "`r`n" + $cssBlock + "`r`n"
  Write-Host "Appended Request Live CSS." -ForegroundColor Green
} else {
  Write-Host "Request Live CSS block already present; skipping append." -ForegroundColor Yellow
}

Write-Utf8NoBom -Path $StylesCss -Content $css
Write-Host "Patched styles.css." -ForegroundColor Green

Write-Host ""
Write-Host "Request Live UI polish complete." -ForegroundColor Cyan
Write-Host "Updated files:" -ForegroundColor Cyan
Write-Host $SongsJs
Write-Host $StylesCss
Write-Host "Backup dir:" -ForegroundColor Cyan
Write-Host $BackupDir
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Commit/push songs.js and styles.css through GitHub Desktop."
Write-Host "2. Hard refresh the website with Ctrl+F5."
