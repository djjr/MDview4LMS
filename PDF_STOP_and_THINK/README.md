# PDF + Stop & Think Viewer

A context-aware PDF viewer that keeps a synchronized Stop & Think question sidebar. As the user scrolls through the PDF, the sidebar iframe automatically updates to show questions mapped to the current page.

This is a companion to the Markdown reader at the repo root (`index.html` / `assets/viewer.js`), which handles the same Stop & Think question system but for text-based readings with inline sidenotes.

---

## File structure

```
PDF_STOP_and_THINK/
├── index.html          # Shell: two-column layout, PDF.js CDN script tag
├── style.css           # Warm paper aesthetic, flex layout, sidebar
├── app.js              # All logic: URL parsing, PDF rendering, scroll tracking
├── README.md           # This file
└── *.pdf               # Local PDF copies for dev (not committed, see below)
```

The project uses no build step, no package manager, no framework. Vanilla HTML/CSS/JS + PDF.js via CDN.

---

## How to use

### URL schema

All state is driven by URL parameters:

```
?file=AmodeiEtAl2016.pdf&page3=101,102&page7=104
```

| Parameter | Meaning |
|---|---|
| `file` | Filename of the PDF (appended to `PDF_BASE`) |
| `pageN` | Comma-separated Stop & Think question IDs to show when page N is visible |

Pages with no `pageN` entry show a "No questions on this page" placeholder in the sidebar.

### Local development

1. Start a local server from the repo root (required — `fetch()` is blocked on `file://`):
   ```
   python3 -m http.server 8181 --directory /path/to/MDview4LMS
   ```
2. Download the PDF you want to test into this folder:
   ```
   curl -o PDF_STOP_and_THINK/mypaper.pdf https://innoeduvation.org/danryan/library/mypaper.pdf
   ```
3. Open: `http://localhost:8181/PDF_STOP_and_THINK/?file=mypaper.pdf&page3=101,102`

The dev/prod switch is automatic — no code changes needed between local and deployed.

---

## Key constants (`app.js` top)

```js
const PDF_BASE = window.location.hostname === 'localhost'
  ? ''   // relative path — serves local PDF copy from same directory
  : 'https://innoeduvation.org/danryan/library';

const ST_BASE = 'https://innoeduvation.org/danryan/production/teaching/stop_and_think/index.html';
```

**`PDF_BASE`** auto-switches between local (empty string → relative path) and production (full remote URL). When `PDF_BASE` is empty, `file=AmodeiEtAl2016.pdf` resolves relative to the HTML page's directory, so the local copy must live in `PDF_STOP_and_THINK/`.

**`ST_BASE`** is the Stop & Think question app. The sidebar iframe loads `ST_BASE + '?q=101,102'` for each page that has questions assigned.

**PDF.js version** is pinned at 3.11.174 (cdnjs). Version 4.x switched to ESM-only which breaks a plain `<script>` tag — stay on 3.x unless you move to `type="module"`.

---

## Architecture decisions

### One-way data flow
The parent app is strictly a router. It reads its own URL params, watches the scroll position, and sets the iframe `src`. It never sends `postMessage` into the iframe or reads data back out. This keeps the PDF viewer and the question app fully decoupled.

### IntersectionObserver, not scroll events
`window.onscroll` fires on every pixel of movement, which would thrash the iframe with constant URL changes. `IntersectionObserver` fires only when a page crosses the 50% visibility threshold, and the 450ms debounce means the iframe only updates once scrolling settles. This prevents flickering and avoids unnecessary network requests to the question app.

### Tracking a Set of intersecting pages
Multiple pages can be ≥50% visible simultaneously (e.g. when a short page is nearly scrolled past). Rather than taking whichever page fired last, the observer maintains a `Set` of all currently-intersecting page numbers and always picks `Math.min()` — the topmost visible page.

### Synchronous wrapper creation in the render loop
The `<div class="page-wrapper" data-page="N">` elements are appended to the DOM synchronously inside the `for` loop, before `await`ing the canvas render. This guarantees page wrappers appear in order in the DOM even if rendering of an individual page takes a variable amount of time. Without this, the async nature of `pdf.getPage()` could cause pages to appear out of order.

### Render scale
Pages render at `scale: 1.5` (fixed). At this scale a standard US Letter page (612pt wide) produces a 918px canvas. CSS `max-width: 100%` on the canvas shrinks it on narrow viewports without re-rendering. A future version could compute scale dynamically from the viewer's `clientWidth`.

### CORS and the local PDF copies
PDF.js fetches PDFs via `fetch()`. The production server (`innoeduvation.org`) does not send `Access-Control-Allow-Origin` headers, so cross-origin fetches fail. Locally this is solved by downloading PDFs into the project directory and serving them from the same origin. In production the viewer lives on the same server as the PDFs, so there is no cross-origin issue. Local `.pdf` files should not be committed to git.

---

## Relationship to the Markdown viewer

The Markdown viewer (`/index.html`) uses a `[^st:108,109]` sidenote syntax to embed Stop & Think iframes inline in the reading flow. The PDF viewer achieves the same effect through scroll-position awareness rather than explicit markup. Both ultimately load the same `ST_BASE` URL with a `?q=` parameter.

---

## Possible next steps

- Dynamic render scale based on viewer width
- Page number display in the PDF column (overlay or label below each page)
- A title bar showing the document name parsed from the `file` param
- Text selection layer (PDF.js text layer API) for copy/paste
- Mobile layout: stack PDF and sidebar vertically, sidebar collapses to a drawer
