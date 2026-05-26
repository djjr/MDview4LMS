# MDview4LMS — v0.1

A suite of lightweight, LMS-embeddable reading tools that synchronize Stop & Think questions alongside course content. No build step, no framework — vanilla HTML/CSS/JS.

## Components

| Tool | Path | Medium | How questions are triggered |
|---|---|---|---|
| Markdown Reader | `/` | `.md` files | `[^st:q1,q2]` inline syntax — questions appear as sidenotes |
| PDF Viewer | `/PDF_STOP_and_THINK/` | PDF files | Scroll position — IntersectionObserver tracks visible page |
| Video Viewer | `/VIDEO_STOP_and_THINK/` | YouTube | Playback time — polling pauses video at defined timestamps |

All three load questions from the same Stop & Think app via iframe.

## URL schemas

```
# Markdown reader
?file=content/reading.md&bg=ffffff

# PDF viewer
?file=paper.pdf&page3=101,102&page7=104&bg=ffffff

# Video viewer
?v=YOUTUBE_ID&ss30=101,102&ss90=104&layout=vertical&bg=ffffff
```

`bg=` is optional on all three — pass a hex color (no `#`) to override the default warm paper background. Useful for matching the host LMS page color.

## Hosting

Apps are served as static files (GitHub Pages or any web host). Content files (`.md`, `.pdf`) are fetched from `innoeduvation.org/danryan/library` — CORS headers on that server allow cross-origin fetches. YouTube videos stream directly from YouTube; no CORS configuration needed.

See the README in each component folder for full documentation.

## Local development

```bash
python3 -m http.server 8181
# then open http://localhost:8181
```

For the PDF viewer, download a local copy of the PDF into `PDF_STOP_and_THINK/` — the dev/prod toggle in `app.js` detects `localhost` and resolves filenames as relative paths automatically.
