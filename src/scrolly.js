/**
 * scrolly.js — Vanilla Scrollycoding Visual Recap Generator
 *
 * Outputs a single self-contained HTML page:
 *   Left  — scrollable narrative steps (one per key changed file)
 *   Right — sticky code viewer that updates as user scrolls
 *
 * Zero runtime dependencies. Uses IntersectionObserver + position:sticky.
 * Works offline, opens with a double-click.
 */

export function generateScrolly(diff, options) {
  const { title, base, head } = options;
  const keyFiles = Object.keys(diff.keyFileDiffs);

  // ── Build step data ──────────────────────────────────────────────────────
  const steps = [];

  // Step 0 — overview
  steps.push({
    id: 0,
    label: 'OVERVIEW',
    labelColor: '#7c3aed',
    file: null,
    title: title,
    subtitle: `${diff.commits.length} commit${diff.commits.length !== 1 ? 's' : ''} · ${diff.files.length} files · +${diff.totalInsertions} −${diff.totalDeletions}`,
    description: buildOverviewDescription(diff, base, head),
    code: buildOverviewCode(diff),
  });

  // Steps 1-N — key files
  for (const filePath of keyFiles) {
    const fileMeta = diff.files.find(f => f.path === filePath) || { status: 'modified', insertions: 0, deletions: 0 };
    const hunks = diff.keyFileDiffs[filePath] || [];
    steps.push({
      id: steps.length,
      label: statusLabel(fileMeta.status),
      labelColor: statusColor(fileMeta.status),
      file: filePath,
      title: filePath.split('/').pop(),
      subtitle: `${filePath} · +${fileMeta.insertions} −${fileMeta.deletions}`,
      description: buildFileDescription(filePath, fileMeta, hunks),
      code: buildHunkCode(hunks),
    });
  }

  // ── Embed step data as JSON ───────────────────────────────────────────────
  const stepsJson = JSON.stringify(steps.map(s => ({
    label: s.label,
    labelColor: s.labelColor,
    file: s.file,
    title: s.title,
    subtitle: s.subtitle,
    description: s.description,
    code: s.code,
  })));

  // ── Render left-column step cards ────────────────────────────────────────
  const stepCardsHtml = steps.map((s, i) => `
    <div class="step" data-index="${i}">
      <div class="step-inner">
        <div class="step-meta">
          <span class="step-badge" style="color:${s.labelColor};border-color:${s.labelColor}20;background:${s.labelColor}10">${s.label}</span>
          <span class="step-num">Step ${i}</span>
        </div>
        <h2 class="step-title">${escHtml(s.title)}</h2>
        <p class="step-subtitle">${escHtml(s.subtitle)}</p>
        <p class="step-desc">${s.description}</p>
      </div>
    </div>`).join('\n');

  // ── Full HTML ─────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(title)} — Scrollycoding</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
/* ── Reset & base ──────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0b0f19;
  --bg2:#0f1623;
  --surface:#141c2e;
  --border:#1e2d45;
  --text:#cbd5e1;
  --muted:#64748b;
  --violet:#7c3aed;
  --violet-faint:#7c3aed18;
  --emerald:#10b981;
  --rose:#f43f5e;
  --cyan:#22d3ee;
  --amber:#f59e0b;
  --mono:'JetBrains Mono',monospace;
  --sans:'Inter',sans-serif;
}
html{scroll-behavior:smooth}
body{
  background:var(--bg);
  color:var(--text);
  font-family:var(--sans);
  font-size:15px;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}

/* ── Header ────────────────────────────────── */
.site-header{
  position:fixed;top:0;left:0;right:0;z-index:100;
  height:56px;
  background:rgba(11,15,25,0.85);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;
  padding:0 2rem;
  gap:1rem;
}
.header-logo{
  font-size:13px;font-weight:700;letter-spacing:.05em;
  color:var(--violet);text-transform:uppercase;
}
.header-title{
  font-size:13px;color:var(--muted);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.header-pills{display:flex;gap:.5rem;margin-left:auto}
.pill{
  font-size:11px;font-family:var(--mono);
  padding:2px 8px;border-radius:20px;border:1px solid;
}
.pill-add{color:var(--emerald);border-color:var(--emerald)30;background:var(--emerald)10}
.pill-del{color:var(--rose);border-color:var(--rose)30;background:var(--rose)10}

/* ── Progress bar ──────────────────────────── */
#progress-bar{
  position:fixed;top:56px;left:0;right:0;z-index:99;
  height:2px;background:var(--border);
}
#progress-fill{
  height:100%;width:0%;
  background:linear-gradient(90deg,var(--violet),var(--cyan));
  transition:width .2s ease;
}

/* ── Layout ────────────────────────────────── */
.layout{
  display:flex;
  min-height:100vh;
  padding-top:58px;
}
.steps-col{
  width:48%;
  padding:0 3.5rem 30vh 3.5rem;
  padding-top:15vh;
}
.code-col{
  width:52%;
  position:sticky;
  top:56px;
  height:calc(100vh - 56px);
  overflow:hidden;
  background:var(--bg2);
  border-left:1px solid var(--border);
  display:flex;
  flex-direction:column;
}

/* ── Step cards ────────────────────────────── */
.step{
  min-height:75vh;
  display:flex;
  align-items:center;
  padding:3rem 0;
  position:relative;
}
.step::before{
  content:'';
  position:absolute;
  left:-2rem;top:0;bottom:0;
  width:2px;
  background:var(--border);
  border-radius:2px;
  transition:background .4s;
}
.step.active::before{
  background:var(--violet);
}
.step-inner{
  opacity:.25;
  transform:translateY(8px);
  transition:opacity .5s ease, transform .5s ease;
  max-width:480px;
}
.step.active .step-inner{
  opacity:1;
  transform:translateY(0);
}
.step-meta{
  display:flex;align-items:center;gap:.75rem;
  margin-bottom:.75rem;
}
.step-badge{
  font-family:var(--mono);font-size:10px;font-weight:600;
  letter-spacing:.08em;text-transform:uppercase;
  padding:2px 8px;border-radius:4px;border:1px solid;
}
.step-num{
  font-size:12px;color:var(--muted);font-family:var(--mono);
}
.step-title{
  font-size:22px;font-weight:700;color:#f1f5f9;
  line-height:1.2;margin-bottom:.4rem;
  font-family:var(--sans);
  word-break:break-all;
}
.step-subtitle{
  font-size:12px;color:var(--muted);font-family:var(--mono);
  margin-bottom:1rem;
}
.step-desc{
  font-size:14px;line-height:1.75;color:var(--text);
}
.step-desc code{
  font-family:var(--mono);font-size:12px;
  background:var(--surface);border:1px solid var(--border);
  padding:1px 5px;border-radius:3px;color:var(--cyan);
}

/* ── Code pane ─────────────────────────────── */
.code-pane-header{
  padding:.75rem 1.25rem;
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:.75rem;
  flex-shrink:0;
  background:var(--surface);
}
.code-filename{
  font-family:var(--mono);font-size:12px;color:var(--text);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.code-badge{
  font-family:var(--mono);font-size:10px;font-weight:700;
  padding:2px 7px;border-radius:4px;border:1px solid;
  margin-left:auto;flex-shrink:0;
}
.code-pane-body{
  flex:1;
  overflow-y:auto;
  overflow-x:auto;
  padding:1rem 0;
  scrollbar-width:thin;
  scrollbar-color:var(--border) transparent;
  position:relative;
}
.code-pane-body::-webkit-scrollbar{width:5px;height:5px}
.code-pane-body::-webkit-scrollbar-track{background:transparent}
.code-pane-body::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}

/* ── Code content (transition) ─────────────── */
.code-view{
  position:absolute;inset:0;
  padding:1rem 0;
  opacity:0;
  transition:opacity .3s ease;
  pointer-events:none;
  overflow:auto;
}
.code-view.visible{
  opacity:1;
  pointer-events:auto;
}

/* ── Diff lines ────────────────────────────── */
.diff-table{
  width:100%;
  border-collapse:collapse;
  font-family:var(--mono);
  font-size:12.5px;
  line-height:1.6;
}
.diff-ln{
  width:40px;
  padding:0 .75rem;
  text-align:right;
  color:var(--muted);
  user-select:none;
  vertical-align:top;
  white-space:nowrap;
  border-right:1px solid var(--border);
}
.diff-code{
  padding:0 1rem;
  white-space:pre-wrap;
  word-break:break-all;
  vertical-align:top;
}
.line-add .diff-code{color:#4ade80;background:#052e16}
.line-add .diff-ln{background:#052e16}
.line-del .diff-code{color:#f87171;background:#2d0707}
.line-del .diff-ln{background:#2d0707}
.line-hdr .diff-code{color:var(--cyan);background:#0c1a2e}
.line-hdr .diff-ln{background:#0c1a2e}
.line-ctx .diff-code{color:var(--text)}

/* ── Step counter ───────────────────────────── */
.counter-strip{
  position:fixed;
  left:0;top:50%;transform:translateY(-50%);
  display:flex;flex-direction:column;gap:6px;
  padding:.5rem .4rem;
  z-index:50;
}
.counter-dot{
  width:6px;height:6px;
  border-radius:50%;
  background:var(--border);
  cursor:pointer;
  transition:all .3s;
}
.counter-dot.active{
  background:var(--violet);
  transform:scale(1.5);
}

/* ── Responsive ────────────────────────────── */
@media(max-width:768px){
  .steps-col,.code-col{width:100%;position:static;height:auto}
  .layout{flex-direction:column}
  .step::before{display:none}
  .counter-strip{display:none}
}
</style>
</head>
<body>

<!-- Header -->
<header class="site-header">
  <span class="header-logo">⬡ Scrollycoding Recap</span>
  <span class="header-title">${escHtml(title)}</span>
  <div class="header-pills">
    <span class="pill pill-add">+${diff.totalInsertions}</span>
    <span class="pill pill-del">−${diff.totalDeletions}</span>
  </div>
</header>

<!-- Progress bar -->
<div id="progress-bar"><div id="progress-fill"></div></div>

<!-- Step counter dots (left edge) -->
<nav class="counter-strip" id="counter-strip">
  ${steps.map((_, i) => `<div class="counter-dot${i === 0 ? ' active' : ''}" data-goto="${i}" title="Step ${i}"></div>`).join('\n  ')}
</nav>

<!-- Main layout -->
<div class="layout">

  <!-- Left: narrative steps -->
  <div class="steps-col" id="steps-col">
    ${stepCardsHtml}
  </div>

  <!-- Right: sticky code viewer -->
  <div class="code-col" id="code-col">
    <div class="code-pane-header">
      <span class="code-filename" id="code-filename">— Overview —</span>
      <span class="code-badge pill" id="code-badge" style="color:var(--violet);border-color:var(--violet)30;background:var(--violet)10">OVERVIEW</span>
    </div>
    <div class="code-pane-body" id="code-pane-body">
      ${steps.map((s, i) => `
      <div class="code-view${i === 0 ? ' visible' : ''}" id="code-view-${i}">
        ${renderCodeView(s.code)}
      </div>`).join('\n')}
    </div>
  </div>

</div>

<script>
// ── Embedded step data ────────────────────────────────
const STEPS = ${stepsJson};

// ── DOM refs ──────────────────────────────────────────
const stepEls    = document.querySelectorAll('.step');
const counterDots = document.querySelectorAll('.counter-dot');
const progressFill = document.getElementById('progress-fill');
const codeFilename = document.getElementById('code-filename');
const codeBadge    = document.getElementById('code-badge');

let activeIndex = 0;

// ── Activate a step ───────────────────────────────────
function activateStep(index) {
  if (index === activeIndex && stepEls[index].classList.contains('active')) return;
  activeIndex = index;
  const s = STEPS[index];

  // Update step highlights
  stepEls.forEach((el, i) => el.classList.toggle('active', i === index));

  // Update counter dots
  counterDots.forEach((dot, i) => dot.classList.toggle('active', i === index));

  // Update code pane header
  codeFilename.textContent = s.file || '— Overview —';
  codeBadge.textContent    = s.label;
  codeBadge.style.color    = s.labelColor;
  codeBadge.style.borderColor = s.labelColor + '44';
  codeBadge.style.background  = s.labelColor + '14';

  // Swap code views
  document.querySelectorAll('.code-view').forEach((el, i) => {
    el.classList.toggle('visible', i === index);
  });

  // Update progress
  const pct = STEPS.length > 1 ? (index / (STEPS.length - 1)) * 100 : 0;
  progressFill.style.width = pct + '%';
}

// ── IntersectionObserver ──────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = parseInt(entry.target.dataset.index, 10);
      activateStep(idx);
    }
  });
}, {
  threshold: 0.4,
  rootMargin: '-15% 0px -15% 0px',
});

stepEls.forEach(el => observer.observe(el));

// ── Counter dot clicks ────────────────────────────────
counterDots.forEach(dot => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.dataset.goto, 10);
    stepEls[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

// ── Activate first step on load ───────────────────────
activateStep(0);
</script>
</body>
</html>`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildOverviewDescription(diff, base, head) {
  const added   = diff.files.filter(f => f.status === 'added').length;
  const deleted = diff.files.filter(f => f.status === 'deleted').length;
  const modified= diff.files.filter(f => f.status === 'modified').length;
  const commits = diff.commits.map(c => `<code>${c.sha}</code> ${escHtml(c.message)}`).join(', ') || 'No commits';

  return `This diff spans <code>${diff.files.length}</code> changed files between <code>${escHtml(base)}</code> and <code>${escHtml(head)}</code>.
    <strong>${added}</strong> files were added, <strong>${deleted}</strong> deleted, and <strong>${modified}</strong> modified.
    Commits: ${commits}.
    Scroll down to walk through each key changed file step by step.`;
}

function buildOverviewCode(diff) {
  const lines = [];
  lines.push(`# ${diff.repoName}: ${diff.base} → ${diff.head}`);
  lines.push('');
  lines.push(`  ${diff.files.filter(f=>f.status==='added').length} files added`);
  lines.push(`  ${diff.files.filter(f=>f.status==='modified').length} files modified`);
  lines.push(`  ${diff.files.filter(f=>f.status==='deleted').length} files deleted`);
  lines.push('');
  lines.push('# Changed files:');
  diff.files.slice(0, 30).forEach(f => {
    const flag = f.status === 'added' ? '+' : f.status === 'deleted' ? '-' : ' ';
    lines.push(`${flag} ${f.path}`);
  });
  if (diff.files.length > 30) lines.push(`  ... and ${diff.files.length - 30} more`);
  return lines.join('\n');
}

function buildFileDescription(filePath, fileMeta, hunks) {
  const filename = filePath.split('/').pop();
  const ext = filename.split('.').pop().toLowerCase();
  const dir = filePath.includes('/') ? filePath.split('/').slice(0, -1).join('/') : '.';

  let typeDesc = '';
  if (ext === 'vue')        typeDesc = 'a Vue 3 Single-File Component';
  else if (ext === 'tsx')   typeDesc = 'a React TypeScript component';
  else if (ext === 'ts')    typeDesc = 'a TypeScript module';
  else if (ext === 'js')    typeDesc = 'a JavaScript module';
  else if (ext === 'py')    typeDesc = 'a Python module';
  else if (ext === 'json')  typeDesc = 'a JSON configuration file';
  else if (ext === 'css')   typeDesc = 'a CSS stylesheet';
  else if (ext === 'md')    typeDesc = 'a Markdown document';
  else                      typeDesc = `a ${ext.toUpperCase()} file`;

  if (fileMeta.status === 'added') {
    return `<code>${filename}</code> is ${typeDesc} in <code>${dir}/</code> that was <strong>introduced</strong> in this diff.
      It adds <strong>${fileMeta.insertions}</strong> new lines. This is a net-new file — it did not exist in the base ref.`;
  }
  if (fileMeta.status === 'deleted') {
    return `<code>${filename}</code> was <strong>deleted</strong> from <code>${dir}/</code>.
      This removed <strong>${fileMeta.deletions}</strong> lines of ${typeDesc}. It no longer exists in the head ref.`;
  }
  return `<code>${filename}</code> is ${typeDesc} in <code>${dir}/</code> that was <strong>modified</strong>.
    The patch shows <strong>${fileMeta.insertions}</strong> additions and <strong>${fileMeta.deletions}</strong> deletions across ${hunks.length} hunk${hunks.length !== 1 ? 's' : ''}.`;
}

function buildHunkCode(hunks) {
  if (!hunks || hunks.length === 0) return '# (No hunk data for this file)';
  return hunks.map(h => `${h.header}\n${h.lines.join('\n')}`).join('\n\n');
}

function renderCodeView(rawCode) {
  const lines = rawCode.split('\n');
  let lineNum = 0;
  const rows = lines.map(line => {
    let cls = 'line-ctx';
    if (line.startsWith('@@'))      { cls = 'line-hdr'; }
    else if (line.startsWith('+'))  { cls = 'line-add'; lineNum++; }
    else if (line.startsWith('-'))  { cls = 'line-del'; }
    else if (line.startsWith('#'))  { cls = 'line-hdr'; lineNum++; }
    else                            { lineNum++; }
    const displayNum = (cls === 'line-hdr') ? '··' : lineNum;
    return `<tr class="${cls}"><td class="diff-ln">${displayNum}</td><td class="diff-code">${escHtml(line)}</td></tr>`;
  }).join('');
  return `<table class="diff-table"><tbody>${rows}</tbody></table>`;
}

function statusLabel(status) {
  switch (status) {
    case 'added':    return 'ADDED';
    case 'deleted':  return 'DELETED';
    case 'renamed':  return 'RENAMED';
    default:         return 'MODIFIED';
  }
}

function statusColor(status) {
  switch (status) {
    case 'added':    return '#10b981';
    case 'deleted':  return '#f43f5e';
    case 'renamed':  return '#f59e0b';
    default:         return '#3b82f6';
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
