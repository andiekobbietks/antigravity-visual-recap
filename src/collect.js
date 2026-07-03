/**
 * collect.js — git diff collection utilities
 *
 * Runs git commands and parses the output into structured data.
 * No external dependencies — pure Node.js child_process.
 */

import { execSync } from 'child_process';

/**
 * Run a git command in the given repo and return stdout as a string.
 */
function git(repoPath, args) {
  try {
    return execSync(`git -C "${repoPath}" ${args}`, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024, // 50 MB — large repos need this
    }).trim();
  } catch (err) {
    // Some git commands return non-zero on empty results
    return err.stdout ? err.stdout.trim() : '';
  }
}

/**
 * Check if a ref exists in the repo.
 */
function refExists(repoPath, ref) {
  try {
    execSync(`git -C "${repoPath}" rev-parse --verify ${ref}`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Collect all diff data between two git refs.
 * Returns a structured object ready for the renderer.
 */
export async function collectDiff(repoPath, base, head) {
  // Validate refs
  if (!refExists(repoPath, head)) {
    throw new Error(`Head ref "${head}" does not exist in repo at ${repoPath}`);
  }

  // If base doesn't exist (e.g. origin/main on a fresh clone), fall back to first commit
  const effectiveBase = refExists(repoPath, base)
    ? base
    : git(repoPath, 'rev-list --max-parents=0 HEAD');

  const range = `${effectiveBase}..${head}`;

  // --- Commits in range ---
  const logRaw = git(repoPath, `log --oneline ${range}`);
  const commits = logRaw
    ? logRaw.split('\n').map(line => {
        const [sha, ...rest] = line.split(' ');
        return { sha, message: rest.join(' ') };
      })
    : [];

  // --- File change summary ---
  const nameStatusRaw = git(repoPath, `diff --name-status ${range}`);
  const files = nameStatusRaw
    ? nameStatusRaw.split('\n').filter(Boolean).map(line => {
        const [status, ...paths] = line.split('\t');
        const from = paths[0] || '';
        const to   = paths[1] || from;
        return {
          status: normaliseStatus(status),
          path: to,
          from: status.startsWith('R') ? from : null,
        };
      })
    : [];

  // --- Stat (insertions / deletions per file) ---
  const statRaw = git(repoPath, `diff --stat ${range}`);
  const statMap = parseStatMap(statRaw);

  // Attach stats to files
  const filesWithStats = files.map(f => ({
    ...f,
    insertions: statMap[f.path]?.insertions ?? 0,
    deletions:  statMap[f.path]?.deletions  ?? 0,
  }));

  // --- Per-file diffs for key files ---
  // Limit to the 10 most impactful files (most insertions+deletions) to keep output manageable
  const sorted = [...filesWithStats]
    .filter(f => f.status !== 'deleted')
    .sort((a, b) => (b.insertions + b.deletions) - (a.insertions + a.deletions))
    .slice(0, 10);

  const diffs = {};
  for (const file of sorted) {
    try {
      const fileDiff = git(repoPath, `diff ${range} -- "${file.path}"`);
      diffs[file.path] = fileDiff ? parseDiffHunks(fileDiff) : [];
    } catch {
      diffs[file.path] = [];
    }
  }

  // --- Repo info ---
  const repoName = git(repoPath, 'rev-parse --show-toplevel').split(/[/\\]/).pop();
  const currentBranch = git(repoPath, 'rev-parse --abbrev-ref HEAD');
  const headSha = git(repoPath, `rev-parse --short ${head}`);
  const baseSha = refExists(repoPath, effectiveBase)
    ? git(repoPath, `rev-parse --short ${effectiveBase}`)
    : effectiveBase;

  // --- Summary stats ---
  const totalInsertions = filesWithStats.reduce((s, f) => s + f.insertions, 0);
  const totalDeletions  = filesWithStats.reduce((s, f) => s + f.deletions,  0);

  return {
    repoName,
    currentBranch,
    base: effectiveBase,
    head,
    headSha,
    baseSha,
    range,
    commits,
    files: filesWithStats,
    keyFileDiffs: diffs,
    totalInsertions,
    totalDeletions,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseStatus(rawStatus) {
  if (!rawStatus) return 'modified';
  const s = rawStatus[0].toUpperCase();
  switch (s) {
    case 'A': return 'added';
    case 'D': return 'deleted';
    case 'R': return 'renamed';
    case 'C': return 'copied';
    case 'M': return 'modified';
    default:  return 'modified';
  }
}

function parseStatMap(statRaw) {
  const map = {};
  if (!statRaw) return map;
  for (const line of statRaw.split('\n')) {
    // Example: " src/views/HomeView.vue | 42 +++---"
    const match = line.match(/^\s+(.+?)\s+\|\s+\d+\s+([+-]*)/);
    if (!match) continue;
    const path = match[1].trim();
    const plusMinus = match[2];
    map[path] = {
      insertions: (plusMinus.match(/\+/g) || []).length,
      deletions:  (plusMinus.match(/-/g)  || []).length,
    };
  }
  return map;
}

function parseDiffHunks(rawDiff) {
  const lines = rawDiff.split('\n');
  const hunks = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (current) hunks.push(current);
      current = { header: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) hunks.push(current);
  return hunks;
}
