// MDview4LMS v0.1 — PDF + Stop & Think Viewer
// ── Swappable constants ────────────────────────────────────────────────────
const PDF_BASE = window.location.hostname === 'localhost'
  ? ''
  : 'https://innoeduvation.org/danryan/library';
const ST_BASE  = 'https://innoeduvation.org/danryan/production/teaching/stop_and_think/index.html';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── Phase 2: URL parsing & sidebar state ──────────────────────────────────

// Parse ?file=foo.pdf&page3=101,102&page5=104
// Returns { pdfUrl, pageMap }
function parseParams() {
  const params = new URLSearchParams(window.location.search);
  const file   = params.get('file');
  const isAbsolute = /^https?:\/\//.test(file);
  const pdfUrl = file
    ? (isAbsolute ? file : PDF_BASE ? `${PDF_BASE}/${file}` : file)
    : null;

  const pageMap = new Map();
  for (const [key, value] of params) {
    const m = key.match(/^page(\d+)$/i);
    if (m) pageMap.set(parseInt(m[1], 10), value);
  }
  const bg = params.get('bg');
  return { pdfUrl, pageMap, bg };
}

function updateSidebar(pageNum) {
  const iframe    = document.getElementById('question-iframe');
  const empty     = document.getElementById('sidebar-empty');
  const indicator = document.getElementById('page-indicator');

  indicator.textContent = `p. ${pageNum}`;

  const qids = pageMap.get(pageNum);
  if (qids) {
    iframe.src          = ST_BASE + '?q=' + encodeURIComponent(qids);
    iframe.style.display = 'block';
    empty.style.display  = 'none';
  } else {
    iframe.src          = 'about:blank';
    iframe.style.display = 'none';
    empty.style.display  = 'flex';
  }
}

// ── Phase 3: PDF.js render engine ─────────────────────────────────────────

async function renderPDF(pdfUrl) {
  const pdfViewer      = document.getElementById('pdf-viewer');
  const loadingOverlay = document.getElementById('loading-overlay');

  if (!pdfUrl) {
    loadingOverlay.textContent = 'No PDF specified. Add ?file=filename.pdf to the URL.';
    loadingOverlay.classList.add('error');
    return;
  }

  // Phase 4: Intersection Observer (created here so it's available during the render loop)
  const intersectingPages = new Set();
  let debounceTimer = null;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const n = parseInt(entry.target.dataset.page, 10);
      if (entry.isIntersecting) {
        intersectingPages.add(n);
      } else {
        intersectingPages.delete(n);
      }
    }
    // Debounce: wait for scroll to settle before updating the iframe
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (intersectingPages.size > 0) {
        // Use the topmost visible page
        updateSidebar(Math.min(...intersectingPages));
      }
    }, 450);
  }, {
    root: pdfViewer,   // watch within the scrollable column, not the window
    threshold: 0.5     // fire when ≥50% of a page wrapper is visible
  });

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  } catch (err) {
    loadingOverlay.textContent = `Could not load PDF: ${err.message}`;
    loadingOverlay.classList.add('error');
    return;
  }

  loadingOverlay.remove();
  updateSidebar(1); // initialise sidebar for page 1 before user scrolls

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    // Create wrapper synchronously — guarantees DOM order even if rendering is async
    const wrapper = document.createElement('div');
    wrapper.className   = 'page-wrapper';
    wrapper.dataset.page = pageNum;
    pdfViewer.appendChild(wrapper);

    const page     = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas       = document.createElement('canvas');
    canvas.width       = viewport.width;
    canvas.height      = viewport.height;
    wrapper.appendChild(canvas);

    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    observer.observe(wrapper); // start watching once the page is rendered
  }
}

// ── Draggable divider ─────────────────────────────────────────────────────

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
    e.preventDefault(); // suppress text selection while dragging
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

const { pdfUrl, pageMap, bg } = parseParams();
if (bg && /^[0-9a-fA-F]{3,6}$/.test(bg)) {
  document.documentElement.style.setProperty('--paper', '#' + bg);
}
initDivider();
renderPDF(pdfUrl);
