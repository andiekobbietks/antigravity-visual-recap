/**
 * index.js — HTML Visual Recap Generator
 *
 * Renders a self-contained, high-fidelity HTML report of a git diff.
 * Zero-dependency, modern UI with Tailwind-like styling, tabs, interactive tree,
 * syntax highlighting-like diff style, and clear project structure review.
 */

export function generateRecap(diff, options) {
  const { title, repoPath, base, head } = options;

  // Prepare file statuses summary
  const addedFiles = diff.files.filter(f => f.status === 'added');
  const modifiedFiles = diff.files.filter(f => f.status === 'modified');
  const deletedFiles = diff.files.filter(f => f.status === 'deleted');
  const renamedFiles = diff.files.filter(f => f.status === 'renamed');

  // Generate file list HTML
  const fileListHtml = diff.files.map((file, i) => {
    let badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    let badgeText = 'MODIFIED';
    if (file.status === 'added') {
      badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      badgeText = 'ADDED';
    } else if (file.status === 'deleted') {
      badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      badgeText = 'DELETED';
    } else if (file.status === 'renamed') {
      badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      badgeText = 'RENAMED';
    }

    const renameInfo = file.from ? `<span class="text-xs text-slate-500 block">Renamed from: ${file.from}</span>` : '';

    return `
      <div class="flex items-center justify-between p-3 border-b border-slate-800/80 hover:bg-slate-800/20 transition-all rounded-lg mb-1">
        <div class="flex flex-col gap-0.5">
          <span class="font-mono text-sm text-slate-200 select-all">${file.path}</span>
          ${renameInfo}
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs font-mono font-bold px-2 py-0.5 rounded border ${badgeClass}">${badgeText}</span>
          <span class="text-xs font-mono text-slate-400">
            <span class="text-emerald-500">+${file.insertions}</span>
            <span class="text-rose-500">-${file.deletions}</span>
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Generate diff tabs HTML
  const keyFiles = Object.keys(diff.keyFileDiffs);
  let tabsHtml = '';
  let diffContentsHtml = '';

  if (keyFiles.length > 0) {
    keyFiles.forEach((file, index) => {
      const activeTabClass = index === 0 
        ? 'border-violet-500 text-violet-400 bg-violet-500/5' 
        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700';

      const filename = file.split('/').pop();

      tabsHtml += `
        <button 
          onclick="switchTab(event, 'diff-tab-${index}')"
          class="px-4 py-3 border-b-2 font-mono text-sm transition-all focus:outline-none flex items-center gap-2 ${activeTabClass}"
        >
          <span>${filename}</span>
          <span class="text-xs text-slate-500">(${diff.files.find(f => f.path === file)?.insertions ?? 0}+ / ${diff.files.find(f => f.path === file)?.deletions ?? 0}-)</span>
        </button>
      `;

      const hunks = diff.keyFileDiffs[file];
      let hunkContentHtml = '';

      if (hunks.length === 0) {
        hunkContentHtml = `<div class="p-6 text-center text-slate-500 font-mono text-sm">No details or binary file diff.</div>`;
      } else {
        hunks.forEach((hunk, hIndex) => {
          const formattedLines = hunk.lines.map(line => {
            let lineClass = 'text-slate-300';
            if (line.startsWith('+')) {
              lineClass = 'bg-emerald-950/30 text-emerald-300 border-l-4 border-emerald-500 pl-2';
            } else if (line.startsWith('-')) {
              lineClass = 'bg-rose-950/30 text-rose-300 border-l-4 border-rose-500 pl-2';
            } else if (line.startsWith('\\')) {
              lineClass = 'text-slate-500 italic';
            } else {
              lineClass = 'pl-3 text-slate-400';
            }
            return `<div class="py-0.5 select-text whitespace-pre-wrap font-mono text-xs ${lineClass}">${escapeHtml(line)}</div>`;
          }).join('');

          hunkContentHtml += `
            <div class="mb-4 rounded-lg overflow-hidden border border-slate-800">
              <div class="bg-slate-900 px-4 py-2 border-b border-slate-800 font-mono text-xs text-cyan-400 select-all">
                ${escapeHtml(hunk.header)}
              </div>
              <div class="p-3 bg-slate-950 overflow-x-auto leading-relaxed select-text">
                ${formattedLines}
              </div>
            </div>
          `;
        });
      }

      const hiddenClass = index === 0 ? '' : 'hidden';
      diffContentsHtml += `
        <div id="diff-tab-${index}" class="tab-content ${hiddenClass}">
          <div class="p-4 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center">
            <span class="font-mono text-sm text-slate-300 select-all">${file}</span>
            <span class="text-xs text-slate-500">Showing top hunk edits</span>
          </div>
          <div class="p-4">
            ${hunkContentHtml}
          </div>
        </div>
      `;
    });
  } else {
    tabsHtml = '<div class="px-4 py-3 text-slate-500 text-sm">No code changes to display.</div>';
    diffContentsHtml = '<div class="p-8 text-center text-slate-500 font-mono">No details available.</div>';
  }

  // Generate commits list HTML
  const commitsHtml = diff.commits.length > 0
    ? diff.commits.map(c => `
        <div class="flex gap-3 py-2 px-3 hover:bg-slate-800/10 rounded-lg transition-colors">
          <span class="font-mono text-xs text-violet-400 select-all font-bold">${c.sha}</span>
          <span class="text-sm text-slate-300">${escapeHtml(c.message)}</span>
        </div>
      `).join('')
    : '<div class="text-slate-500 text-sm italic py-2">No committed commits in range (working directory changes only)</div>';

  // Master template
  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <!-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <!-- Tailwind CSS Play CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          }
        }
      }
    }
  </script>
  <style>
    body {
      background-color: #0b0f19;
      color: #cbd5e1;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #0f172a;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  </style>
</head>
<body class="min-h-full font-sans flex flex-col antialiased selection:bg-violet-500/30 selection:text-violet-200">

  <!-- Header Banner -->
  <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-violet-600/10 text-violet-400 rounded-lg border border-violet-500/20">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-bold text-white tracking-tight">${escapeHtml(title)}</h1>
          <p class="text-xs text-slate-400 font-mono mt-0.5">Repo: ${escapeHtml(diff.repoName)} | Branch: ${escapeHtml(diff.currentBranch)}</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 sm:self-end">
        <span class="text-xs font-mono bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300">
          Range: <span class="text-violet-400 font-semibold">${escapeHtml(base)}</span> → <span class="text-violet-400 font-semibold">${escapeHtml(head)}</span>
        </span>
        <span class="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-2.5 py-1">
          +${diff.totalInsertions}
        </span>
        <span class="text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded px-2.5 py-1">
          -${diff.totalDeletions}
        </span>
      </div>
    </div>
  </header>

  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
    
    <!-- Left Section: Stats, Commits, Files Tree -->
    <section class="w-full lg:w-5/12 flex flex-col gap-6">
      
      <!-- Conversion & Process Story -->
      <div class="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-white tracking-wide uppercase mb-3 flex items-center gap-2">
          <svg class="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Conversion Origins
        </h2>
        <div class="text-sm text-slate-300 space-y-3 leading-relaxed">
          <p>
            This codebase was migrated from a <strong>React + TanStack Start</strong> codebase to <strong>Vue 3 + Vue Router</strong> to match the target <strong>Frappe / frappe-ui</strong> design stack.
          </p>
          <p>
            This visual recap tool was built in response to commercial/corporate alternatives (like Builder.io's <code>/visual-recap</code> skill) requiring paid cloud database tiers. Under our philosophy, developer workflow documentation shouldn't be locked behind subscription models or external servers. This generator executes entirely locally on your laptop, producing offline HTML files directly from git.
          </p>
        </div>
      </div>

      <!-- General Statistics -->
      <div class="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-white tracking-wide uppercase mb-3">Changes Overview</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-slate-950/50 rounded-lg p-3 border border-slate-800 text-center">
            <span class="text-xs text-slate-400 block mb-1">Total Files</span>
            <span class="text-xl font-bold font-mono text-white">${diff.files.length}</span>
          </div>
          <div class="bg-slate-950/50 rounded-lg p-3 border border-slate-800 text-center">
            <span class="text-xs text-slate-400 block mb-1">Added</span>
            <span class="text-xl font-bold font-mono text-emerald-400">${addedFiles.length}</span>
          </div>
          <div class="bg-slate-950/50 rounded-lg p-3 border border-slate-800 text-center">
            <span class="text-xs text-slate-400 block mb-1">Modified</span>
            <span class="text-xl font-bold font-mono text-blue-400">${modifiedFiles.length}</span>
          </div>
          <div class="bg-slate-950/50 rounded-lg p-3 border border-slate-800 text-center">
            <span class="text-xs text-slate-400 block mb-1">Deleted</span>
            <span class="text-xl font-bold font-mono text-rose-400">${deletedFiles.length}</span>
          </div>
        </div>
      </div>

      <!-- Commits List -->
      <div class="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-white tracking-wide uppercase mb-3 flex items-center justify-between">
          <span>Commit Log (${diff.commits.length})</span>
          <span class="text-xs text-slate-500 font-mono select-all">HEAD SHA: ${diff.headSha}</span>
        </h2>
        <div class="max-h-60 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1">
          ${commitsHtml}
        </div>
      </div>

      <!-- Changed Files Tree -->
      <div class="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-sm flex-1 flex flex-col">
        <h2 class="text-sm font-semibold text-white tracking-wide uppercase mb-3">Changed Files Tree</h2>
        <div class="overflow-y-auto custom-scrollbar pr-1 flex-1 max-h-[400px]">
          ${fileListHtml}
        </div>
      </div>

    </section>

    <!-- Right Section: Key Changes / Diff Viewer -->
    <section class="w-full lg:w-7/12 flex flex-col bg-slate-900/20 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div class="bg-slate-950 px-5 py-4 border-b border-slate-800">
        <h2 class="text-sm font-semibold text-white tracking-wide uppercase">Key Changed Files & Diffs</h2>
        <p class="text-xs text-slate-500 mt-0.5">Click a tab to view the file's diff hunks and annotated lines</p>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex overflow-x-auto border-b border-slate-800 bg-slate-950/40 custom-scrollbar whitespace-nowrap">
        ${tabsHtml}
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 bg-slate-950/20">
        ${diffContentsHtml}
      </div>
    </section>

  </main>

  <footer class="border-t border-slate-800 bg-slate-950/60 py-6 text-center text-xs text-slate-500 font-mono">
    Generated by Antigravity Visual Recap on ${new Date(diff.generatedAt).toLocaleString()} | Local & Free Forever
  </footer>

  <script>
    function switchTab(evt, tabId) {
      // Get all elements with class="tab-content" and hide them
      const tabContents = document.getElementsByClassName("tab-content");
      for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.add("hidden");
      }

      // Get all buttons in tabs header and reset styles
      const tabButtons = evt.currentTarget.parentNode.children;
      for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].className = "px-4 py-3 border-b-2 font-mono text-sm transition-all focus:outline-none flex items-center gap-2 border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700";
      }

      // Show the current tab, and add an "active" class to the button that opened the tab
      document.getElementById(tabId).classList.remove("hidden");
      evt.currentTarget.className = "px-4 py-3 border-b-2 font-mono text-sm transition-all focus:outline-none flex items-center gap-2 border-violet-500 text-violet-400 bg-violet-500/5";
    }
  </script>
</body>
</html>
`;
}

function escapeHtml(string) {
  if (!string) return '';
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
