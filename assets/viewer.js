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
//   ?file=content/reading.md
//
// STOP & THINK SYNTAX (in the .md file)
//   [^st:108,109]   — renders a Stop & Think iframe sidenote for questions 108, 109
//   [^myref]        — renders a text sidenote (definition: [^myref]: text)
//
// CONSTANTS TO SWAP
//   ST_BASE — base URL of the Stop & Think question app
//
// =============================================================================

const ST_BASE = 'https://innoeduvation.org/danryan/production/teaching/stop_and_think/index.html';

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
  let counter = 0;

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
      counter++;
      const n = counter;
      const { id } = token;

      if (id.startsWith('st:')) {
        const qids = id.slice(3); // e.g. "108,109,110"
        const url = ST_BASE + '?q=' + encodeURIComponent(qids);
        return (
          `<sup class="footnote-ref">${n}</sup>` +
          `<aside class="sidenote stop-and-think">` +
          `<iframe src="${url}" width="100%" height="400" frameborder="0" ` +
          `loading="lazy" title="Stop and Think questions"></iframe>` +
          `</aside>`
        );
      }

      const text = footnotes.get(id) ?? `(missing note: ${id})`;
      return `<sup class="footnote-ref">${n}</sup><aside class="sidenote"><sup class="footnote-ref">${n}</sup> ${text}</aside>`;
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
}

function applyBgOverride() {
  const bg = getParam('bg');
  if (bg && /^[0-9a-fA-F]{3,6}$/.test(bg)) {
    document.documentElement.style.setProperty('--paper', '#' + bg);
  }
}

applyBgOverride();
loadReading();
