# Mobile Compatibility — Notes for v0.2

These notes were written at the end of v0.1 to brief the next development session.
Current state: not tested on mobile, not designed for it. Here's what needs attention.

---

## Markdown Reader — minor fixes only

Already has an 820px breakpoint that collapses sidenotes inline. Mostly works.

- [ ] `height: 100%` / `overflow: hidden` on body may cause scroll issues on iOS Safari

---

## Video Viewer — closest to ready

The default vertical layout (video top, questions below) is a natural mobile pattern.

- [ ] **`100vh` on iOS Safari**: the browser chrome (address bar) reduces the actual viewport
      height but `100vh` doesn't account for it. Use `height: 100dvh` (dynamic viewport height)
      where supported, with `100vh` as fallback. Or use `min-height: -webkit-fill-available`.
- [ ] **Touch support for drag handle**: the divider uses `mousedown/mousemove/mouseup` only.
      Add `touchstart/touchmove/touchend` listeners. Use `e.touches[0].clientX` in place of
      `e.clientX`. Only relevant in `?layout=horizontal` mode.
- [ ] Consider hiding the drag handle entirely on touch devices (`@media (pointer: coarse)`).

---

## PDF Viewer — needs real redesign for mobile

The two-column layout with a fixed 380px sidebar and 918px-wide canvas does not work on phones.

### Layout
- [ ] Below ~768px, collapse to single column. Two options:
  - **Tab/toggle approach**: a button switches between "PDF" and "Questions" views.
    Simple to implement, common pattern for split-content on mobile.
  - **Bottom sheet / drawer**: questions slide up from the bottom when a page threshold
    is crossed, overlay the PDF partially, can be dismissed. More polished but more work.
  - Recommendation: tab toggle for v0.2, drawer for v0.3 if it feels clunky.

### PDF rendering scale
- [ ] The fixed `scale: 1.5` produces a ~918px canvas — too wide for phones.
      Compute scale dynamically from the viewer's `clientWidth`:
      ```js
      const scale = (pdfViewer.clientWidth - 32) / baseViewport.width;
      ```
      Cap at 1.5 so it doesn't over-enlarge on large screens.
- [ ] Add `touch-action: pan-y` on `.page-wrapper` to ensure native vertical scroll
      isn't blocked by PDF.js canvas event handling.

### Drag handle
- [ ] Hide on touch devices (`@media (pointer: coarse) { #divider { display: none; } }`).
      The fixed-width sidebar should just become full-width on mobile instead.

---

## Shared / cross-cutting

- [ ] **`100vh` instability**: all three viewers use `height: 100vh` on `#app`. Switch to
      `height: 100dvh` with `100vh` fallback for iOS Safari compatibility.
      ```css
      height: 100vh;
      height: 100dvh; /* overrides above where supported */
      ```
- [ ] **Touch drag handle**: same fix needed in PDF and Video (horizontal) viewers.
      Extract into a shared `initDivider()` that handles both mouse and touch, or just
      suppress the divider entirely on touch devices with `@media (pointer: coarse)`.
- [ ] **Iframe sizing**: the Stop & Think question iframe has fixed heights in some places.
      Audit that it renders usably on small screens — the S+T app itself may need its own
      mobile audit.
- [ ] **Test matrix**: before calling mobile "done", test on:
      - iOS Safari (the hardest — viewport height, scroll behaviour, iframe quirks)
      - Chrome on Android
      - Canvas mobile app webview (different again from a mobile browser)
