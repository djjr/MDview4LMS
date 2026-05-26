// =============================================================================
// MDview4LMS v0.1 — Markdown Reader
// =============================================================================
//
// PURPOSE
//   Renders a Markdown file (specified via ?file=path/to/file.md) as a
//   Tufte-inspired reading with sidenotes, math (KaTeX), and inline
//   Stop & Think question iframes via [^st:q1,q2] syntax.
//
// URL SCHEMA
//   ?file=content/reading.md   — path or full URL to the .md file
//   ?bg=ffffff                 — optional hex color override for --paper background
//
// STOP & THINK SYNTAX (in the .md file)
//   [^st:108,109]   — renders an inline STOP+THINK badge (red/grey/green) and
//                     a sidenote iframe loading questions 108 & 109. Does NOT
//                     consume a footnote number.
//   [^myref]        — renders a sequential superscript number and a text sidenote
//                     (definition line: [^myref]: your note text)
//
// SIDENOTE ALIGNMENT
//   Sidenotes are position:absolute. After render, alignSidenotes() centres each
//   sidenote on the vertical midpoint of its inline reference, with 12px collision
//   avoidance between adjacent sidenotes. Re-runs on window resize.
//
// CONSTANTS TO SWAP
//   ST_BASE — base URL of the Stop & Think question app
//             currently: https://djjr.github.io/STOP_and_THINK/index.html
//
// =============================================================================

//const ST_BASE = 'https://innoeduvation.org/danryan/production/teaching/stop_and_think/index.html';
const ST_BASE = 'https://djjr.github.io/STOP_and_THINK/index.html';

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { data: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: text };
  const yaml = text.slice(4, end);
  const body = text.slice(end + 4).trimStart();
  const data = {};
  let currentKey = null;
  let listMode = false;
  for (const line of yaml.split('\n')) {
    if (/^\s*-\s+/.test(line)) {
      if (currentKey && listMode) {
        if (!Array.isArray(data[currentKey])) data[currentKey] = [];
        data[currentKey].push(line.replace(/^\s*-\s+/, '').trim());
      }
      continue;
    }
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    currentKey = key;
    if (val === '') {
      data[key] = [];
      listMode = true;
    } else {
      data[key] = val;
      listMode = false;
    }
  }
  return { data, body };
}

// Pull [^id]: text definitions out of the body before marked sees them.
// Returns a Map of id → text and the cleaned body.
function extractFootnotes(body) {
  const footnotes = new Map();
  const cleaned = body.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, (_, id, text) => {
    footnotes.set(id.trim(), text.trim());
    return '';
  });
  return { footnotes, body: cleaned.replace(/\n{3,}/g, '\n\n') };
}

function buildMarkedInstance(footnotes) {
  let counter = 0; // footnote number (regular refs only)
  let snId    = 0; // sidenote position index (all refs, for alignment)

  // Block: $$...$$ display math
  const displayMath = {
    name: 'displayMath',
    level: 'block',
    start(src) { const i = src.indexOf('$$'); return i === -1 ? undefined : i; },
    tokenizer(src) {
      const m = src.match(/^\$\$([^$]+?)\$\$/s);
      if (m) return { type: 'displayMath', raw: m[0], math: m[1].trim() };
    },
    renderer(token) {
      try {
        return '<div class="math-display">' +
          katex.renderToString(token.math, { displayMode: true, throwOnError: false }) +
          '</div>';
      } catch { return '<div class="math-error">' + token.math + '</div>'; }
    }
  };

  // Inline: $...$ math (must be declared after displayMath)
  const inlineMath = {
    name: 'inlineMath',
    level: 'inline',
    start(src) { const i = src.indexOf('$'); return i === -1 ? undefined : i; },
    tokenizer(src) {
      if (src.startsWith('$$')) return;
      const m = src.match(/^\$([^$\n]+?)\$/);
      if (m) return { type: 'inlineMath', raw: m[0], math: m[1] };
    },
    renderer(token) {
      try {
        return katex.renderToString(token.math, { displayMode: false, throwOnError: false });
      } catch { return '<span class="math-error">$' + token.math + '$</span>'; }
    }
  };

  // Inline: [^id] and [^st:q1,q2,q3] sidenote references
  //   - [^st:108,109] → S+T iframe sidenote (no definition line needed)
  //   - [^id]         → text sidenote (definition extracted before this runs)
  const sidenoteRef = {
    name: 'sidenoteRef',
    level: 'inline',
    start(src) { const i = src.indexOf('[^'); return i === -1 ? undefined : i; },
    tokenizer(src) {
      const m = src.match(/^\[\^([^\]]+)\]/);
      if (m) return { type: 'sidenoteRef', raw: m[0], id: m[1] };
    },
    renderer(token) {
      const { id } = token;

      snId++;
      const sid = snId;

      if (id.startsWith('st:')) {
        // ST refs don't consume a footnote number — show badge instead
        const qids = id.slice(3);
        const url = ST_BASE + '?q=' + encodeURIComponent(qids);
        return (
          `<span class="st-ref" data-snref="${sid}">` +
            `<span class="st-stop">STOP</span>` +
            `<span class="st-plus">+</span>` +
            `<span class="st-think">THINK</span>` +
          `</span>` +
          `<aside class="sidenote stop-and-think" data-snid="${sid}">` +
          `<iframe src="${url}" width="100%" height="400" frameborder="0" ` +
          `loading="lazy" title="Stop and Think questions"></iframe>` +
          `</aside>`
        );
      }

      counter++;
      const n = counter;
      const text = footnotes.get(id) ?? `(missing note: ${id})`;
      return (
        `<sup class="footnote-ref" data-snref="${sid}">${n}</sup>` +
        `<aside class="sidenote" data-snid="${sid}"><sup class="footnote-ref">${n}</sup> ${text}</aside>`
      );
    }
  };

  return new marked.Marked({
    extensions: [displayMath, inlineMath, sidenoteRef],
    gfm: true
  });
}

async function loadReading() {
  const file = getParam('file');
  const contentEl = document.getElementById('content');
  const titleEl = document.getElementById('doc-title');

  if (!file) {
    contentEl.innerHTML =
      '<p class="error">No reading specified. Add <code>?file=content/reading.md</code> to the URL.</p>';
    return;
  }

  let raw;
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.text();
  } catch (e) {
    contentEl.innerHTML =
      `<p class="error">Could not load <code>${file}</code>: ${e.message}</p>`;
    return;
  }

  const { data, body } = parseFrontmatter(raw);
  const { footnotes, body: cleanBody } = extractFootnotes(body);

  if (data.title) {
    titleEl.textContent = data.title;
    document.title = data.title;
  }

  contentEl.innerHTML = buildMarkedInstance(footnotes).parse(cleanBody);
  requestAnimationFrame(alignSidenotes);
}

function alignSidenotes() {
  const article = document.getElementById('content');
  if (!article) return;

  const articleRect = article.getBoundingClientRect();
  const sidenotes   = Array.from(article.querySelectorAll('.sidenote[data-snid]'));
  const GAP = 12; // minimum px gap between consecutive sidenotes
  let prevBottom = 0;

  sidenotes.forEach(aside => {
    const ref = article.querySelector(`[data-snref="${aside.dataset.snid}"]`);
    if (!ref) return;

    const refRect  = ref.getBoundingClientRect();
    const refMid   = refRect.top + refRect.height / 2 - articleRect.top;
    const asideH   = aside.offsetHeight;

    // Ideal: vertically centre on the inline reference
    let top = refMid - asideH / 2;

    // Collision avoidance: never above the article top, never overlap prior sidenote
    top = Math.max(top, 0);
    top = Math.max(top, prevBottom + GAP);

    aside.style.top = top + 'px';
    prevBottom = top + asideH;
  });
}

function applyBgOverride() {
  const bg = getParam('bg');
  if (bg && /^[0-9a-fA-F]{3,6}$/.test(bg)) {
    document.documentElement.style.setProperty('--paper', '#' + bg);
  }
}

applyBgOverride();
loadReading();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(alignSidenotes, 150);
});
