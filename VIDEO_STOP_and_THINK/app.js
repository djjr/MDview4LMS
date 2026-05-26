// =============================================================================
// MDview4LMS v0.1 — VIDEO + STOP & THINK VIEWER
// =============================================================================
//
// PURPOSE
//   Embeds a YouTube video alongside a Stop & Think question sidebar.
//   The video pauses automatically at instructor-defined timestamps; the sidebar
//   loads the corresponding questions. The student answers, then resumes.
//
// URL SCHEMA
//   ?v=YOUTUBE_ID & ss30=101,102 & ss90=104 & layout=vertical
//
//   v=          YouTube video ID (the part after watch?v= in a YouTube URL)
//   ssN=        Comma-separated Stop & Think question IDs to show at N seconds.
//               N is a whole number of seconds. Any number of ssN params allowed.
//   layout=     "vertical" (default) — video top, questions below, video capped
//               at 55vh so questions always have room.
//               "horizontal" — side-by-side, for slide or wide embeds.
//
// LAYOUT SWITCHING
//   The default stacked layout caps the video at 55vh (see style.css) so the
//   question panel is always visible without scrolling. Adding ?layout=horizontal
//   adds the class "horizontal" to #app, which CSS overrides to side-by-side.
//   No JS layout logic — purely a CSS class toggle.
//
// TIME TRACKING
//   The YouTube IFrame API has no timeupdate event. We poll player.getCurrentTime()
//   every 500ms. findActiveThreshold() returns the largest ssN ≤ current time,
//   so questions for the most recently passed threshold stay visible until the
//   next one is crossed. Seeking backward resets correctly.
//
// AUTO-PAUSE
//   When a new threshold is crossed, player.pauseVideo() fires. The student
//   resumes manually. lastThreshold (undefined → null → ssN) prevents re-pausing
//   on every poll tick once a threshold has been acted on.
//
// CONSTANTS TO SWAP
//   ST_BASE — base URL of the Stop & Think question app
//
// =============================================================================

// ── Swappable constant ────────────────────────────────────────────────────
const ST_BASE = 'https://innoeduvation.org/danryan/production/teaching/stop_and_think/index.html';

// ── URL parsing ───────────────────────────────────────────────────────────

// Parse ?v=VIDEOID&ss30=101,102&ss90=104
// Returns { videoId, thresholds: Map { 30 → "101,102", 90 → "104" } }
function parseParams() {
  const params = new URLSearchParams(window.location.search);
  const videoId = params.get('v');
  const layout  = params.get('layout') ?? 'vertical';

  const thresholds = new Map();
  for (const [key, value] of params) {
    const m = key.match(/^ss(\d+)$/i);
    if (m) thresholds.set(parseInt(m[1], 10), value);
  }
  return { videoId, layout, thresholds };
}

// ── Threshold logic ───────────────────────────────────────────────────────

// Returns the largest ss value ≤ t, or null if none has been passed yet
function findActiveThreshold(t) {
  let active = null;
  for (const ss of thresholds.keys()) {
    if (ss <= t && (active === null || ss > active)) active = ss;
  }
  return active;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Sidebar ───────────────────────────────────────────────────────────────

function updateSidebar(ss) {
  const iframe    = document.getElementById('question-iframe');
  const empty     = document.getElementById('sidebar-empty');
  const indicator = document.getElementById('time-indicator');

  if (ss === null) {
    indicator.textContent = '—';
    iframe.src           = 'about:blank';
    iframe.style.display  = 'none';
    empty.style.display   = 'flex';
    return;
  }

  indicator.textContent = formatTime(ss);
  const qids = thresholds.get(ss);
  if (qids) {
    iframe.src           = ST_BASE + '?q=' + encodeURIComponent(qids);
    iframe.style.display  = 'block';
    empty.style.display   = 'none';
  } else {
    iframe.src           = 'about:blank';
    iframe.style.display  = 'none';
    empty.style.display   = 'flex';
  }
}

// ── YouTube IFrame Player API ─────────────────────────────────────────────

let player;
let lastThreshold = undefined; // undefined = not yet initialised
let pollInterval  = null;

// Called automatically by the YouTube API script when it finishes loading
function onYouTubeIframeAPIReady() {
  if (!videoId) {
    document.getElementById('video-container').innerHTML =
      '<p class="error">No video specified. Add ?v=YOUTUBE_ID to the URL.</p>';
    return;
  }

  player = new YT.Player('player', {
    videoId,
    playerVars: {
      rel: 0,              // suppress related-video suggestions
      modestbranding: 1
    },
    events: {
      onReady() {
        updateSidebar(null);
        pollInterval = setInterval(checkTime, 500);
      },
      onStateChange(e) {
        if (e.data === YT.PlayerState.ENDED) clearInterval(pollInterval);
      }
    }
  });
}

// Runs every 500ms while the video is loaded
function checkTime() {
  if (!player || typeof player.getCurrentTime !== 'function') return;

  const t      = player.getCurrentTime();
  const active = findActiveThreshold(t);

  if (active !== lastThreshold) {
    lastThreshold = active;
    updateSidebar(active);
    // Pause at each new threshold so the student stops to answer
    if (active !== null) player.pauseVideo();
  }
}

// ── Draggable divider (horizontal layout only) ────────────────────────────

function initDivider() {
  const divider = document.getElementById('divider');
  const sidebar  = document.getElementById('sidebar');
  let startX, startWidth;

  divider.addEventListener('mousedown', (e) => {
    startX     = e.clientX;
    startWidth = sidebar.offsetWidth;
    divider.classList.add('dragging');
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
  });

  function onDrag(e) {
    const newWidth = Math.max(280, Math.min(600, startWidth + (startX - e.clientX)));
    sidebar.style.width    = newWidth + 'px';
    sidebar.style.minWidth = newWidth + 'px';
  }

  function stopDrag() {
    divider.classList.remove('dragging');
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────

const { videoId, layout, thresholds } = parseParams();
if (layout === 'horizontal') {
  document.getElementById('app').classList.add('horizontal');
  initDivider();
}
// onYouTubeIframeAPIReady() is called by the YT script — no explicit call needed here
