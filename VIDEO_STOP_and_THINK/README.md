# Video + Stop & Think Viewer

A YouTube video player with a synchronized Stop & Think question panel. The video pauses automatically at each instructor-defined timestamp; the panel loads the corresponding questions. The student answers, then manually resumes.

Sibling tool to the PDF viewer (`/PDF_STOP_and_THINK/`) and Markdown reader (`/index.html`). All three share the same Stop & Think question app and `ST_BASE` URL.

---

## File structure

```
VIDEO_STOP_and_THINK/
├── index.html     # Shell: app container, YouTube API script tag
├── style.css      # Warm paper aesthetic, stacked layout, horizontal override
├── app.js         # URL parsing, threshold logic, YT API integration
└── README.md      # This file
```

No build step. No package manager. Vanilla JS + YouTube IFrame Player API.

---

## How to use

### URL schema

```
?v=YOUTUBE_ID & ss30=101,102 & ss90=104 & layout=vertical
```

| Parameter | Meaning |
|---|---|
| `v` | YouTube video ID (the part after `watch?v=` in a YouTube URL) |
| `ssN` | Comma-separated Stop & Think question IDs to show at N seconds. Any number of `ssN` params allowed. |
| `layout` | `vertical` (default) or `horizontal` — see Layout section below |
| `bg` | Optional hex color (no `#`) to override the default background, e.g. `bg=ffffff` |

The video pauses each time it crosses a new `ssN` threshold. The student reads and answers the questions, then clicks play to resume.

### Local development

No CORS issues — there are no local files to serve for the video itself, it streams from YouTube.

```
python3 -m http.server 8181 --directory /path/to/MDview4LMS
```

Open: `http://localhost:8181/VIDEO_STOP_and_THINK/?v=YOUTUBE_ID&ss30=101,102`

---

## Layout

### Vertical (default)
Video sits on top, questions panel below. The video is capped at `max-height: 55vh` so the question panel always has breathing room — important in narrow Canvas LMS iframes. This is the right default for most teaching contexts.

### Horizontal (`?layout=horizontal`)
Side-by-side: video left, questions right (380px fixed). Intended for slide embeds or wide viewports where vertical stacking wastes space. The `max-height` cap is removed in this mode. Applied by adding the class `horizontal` to `#app` at init — no JS branching, purely a CSS override.

A draggable divider appears between the video and sidebar in horizontal mode. Drag left/right to resize the sidebar between 280–600px.

---

## Key constant (`app.js` top)

```js
const ST_BASE = 'https://innoeduvation.org/danryan/production/teaching/stop_and_think/index.html';
```

No `VIDEO_BASE` constant — YouTube videos are addressed by ID alone (`v=` param). No dev/prod toggle needed.

---

## Architecture decisions

### YouTube IFrame Player API, not `<video>`
YouTube videos cannot be embedded with a plain `<video>` tag. The IFrame Player API (`youtube.com/iframe_api`) loads asynchronously and calls `window.onYouTubeIframeAPIReady()` when ready. That global function is defined in `app.js` and creates the `YT.Player` instance, which replaces the `#player` div with a YouTube iframe.

`playerVars` includes `origin: window.location.origin` and `enablejsapi: 1`. These are required for the IFrame API's `postMessage` communication to work correctly when the viewer is itself embedded inside a Canvas LMS iframe (triple nesting). Without `origin`, the YouTube player initialises silently to a black screen.

### Polling, not events
The YouTube IFrame API has no `timeupdate` event. `player.getCurrentTime()` is polled every 500ms via `setInterval` — the standard approach, accurate enough for whole-second thresholds.

### Threshold logic: last-passed wins
`findActiveThreshold(t)` returns the largest `ssN` value ≤ current time. This means:
- Questions for the most recently passed threshold stay visible until the next one is crossed.
- Seeking forward past multiple thresholds jumps straight to the last one (no rapid-fire pausing).
- Seeking backward resets correctly: scrubbing before a threshold clears the panel; playing through it again re-pauses and re-shows questions.

### Auto-pause at each threshold
When `findActiveThreshold` returns a new value (different from `lastThreshold`), `player.pauseVideo()` fires. The student resumes manually — the pause is the pedagogical prompt. No auto-resume is implemented; a future version could listen for a `postMessage` from the Stop & Think iframe on question submission.

### `lastThreshold` state
Initialized to `undefined` (before the player is ready), then `null` (before the first threshold), then the `ssN` value of each threshold as it is crossed. The `undefined` → `null` distinction prevents a stale poll tick from firing a spurious update before `onPlayerReady` has run.

### Aspect ratio and height cap
`#player-wrapper` uses `aspect-ratio: 16/9` with `max-width: 960px` and (in vertical mode) `max-height: 55vh`. Modern CSS resolves all three constraints simultaneously, shrinking the video to whichever limit binds first while keeping the correct ratio.

---

## Relationship to the other viewers

| Viewer | Medium | Trigger | Update mechanism |
|---|---|---|---|
| Markdown (`/index.html`) | Text | `[^st:q1,q2]` inline syntax | Static — rendered at page load |
| PDF (`/PDF_STOP_and_THINK/`) | PDF pages | Scroll position | IntersectionObserver + 450ms debounce |
| Video (`/VIDEO_STOP_and_THINK/`) | YouTube | Playback time | 500ms polling + auto-pause |

All three construct the same `ST_BASE + '?q=' + qids` URL for the sidebar iframe.

---

## Possible next steps

- Threshold markers on the video progress bar (requires YouTube API workaround — the native controls can't be annotated)
- `?autopause=0` param for review mode — questions update silently without pausing
- `?title=Lecture+3` param displayed in the questions panel header
- Message-based resume: listen for a `postMessage` from the Stop & Think iframe when the student submits, then call `player.playVideo()`
