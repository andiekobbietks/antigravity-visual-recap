#!/usr/bin/env node
/**
 * antigravity-visual-recap — CLI entry point
 * Usage: node src/cli.js [options]
 *
 * Generates a rich HTML visual recap of git changes — entirely local,
 * no cloud services, no subscriptions, no accounts required.
 */

import { generateRecap } from './index.js';
import { collectDiff } from './collect.js';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         antigravity-visual-recap  v1.0.0            ║
║   Local visual code recap — no cloud, no cost       ║
╚══════════════════════════════════════════════════════╝

Usage:
  node src/cli.js [options]

Options:
  --repo <path>      Path to git repo (default: current directory)
  --base <ref>       Base git ref (default: origin/main)
  --head <ref>       Head git ref (default: HEAD)
  --out <path>       Output HTML file (default: ./recap-output/recap.html)
  --open             Open the report in the default browser after generating
  --title <text>     Custom title for the recap
  --help             Show this help message
  --self-test        Run a self-test on this repo

Examples:
  # Recap all changes vs origin/main
  node src/cli.js

  # Recap a specific branch
  node src/cli.js --base main --head vue-migration

  # Recap a specific commit
  node src/cli.js --base HEAD~1 --head HEAD

  # Recap and open in browser
  node src/cli.js --open

  # Recap a different repo
  node src/cli.js --repo /path/to/other-repo --base main --head feature/my-branch
`);
}

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const getArg = (flag, fallback) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : fallback;
  };

  const repoPath = resolve(getArg('--repo', process.cwd()));
  const base     = getArg('--base', 'origin/main');
  const head     = getArg('--head', 'HEAD');
  const outPath  = resolve(getArg('--out', './recap-output/recap.html'));
  const title    = getArg('--title', null);
  const shouldOpen = args.includes('--open');
  const selfTest   = args.includes('--self-test');

  const effectiveBase = selfTest ? 'HEAD~1' : base;
  const effectiveHead = selfTest ? 'HEAD'   : head;

  console.log('\n🔍  Collecting git diff...');
  console.log(`    Repo: ${repoPath}`);
  console.log(`    Range: ${effectiveBase}..${effectiveHead}\n`);

  let diff;
  try {
    diff = await collectDiff(repoPath, effectiveBase, effectiveHead);
  } catch (err) {
    console.error('❌  Failed to collect diff:', err.message);
    console.error('    Make sure the repo path is correct and the refs exist.');
    process.exit(1);
  }

  if (diff.files.length === 0) {
    console.log('⚠️   No changes found between those refs. Nothing to recap.');
    process.exit(0);
  }

  console.log(`✅  Found ${diff.files.length} changed files across ${diff.commits.length} commit(s)\n`);
  console.log('🎨  Generating visual recap...');

  const html = generateRecap(diff, {
    title: title || `Code Recap: ${effectiveBase}..${effectiveHead}`,
    repoPath,
    base: effectiveBase,
    head: effectiveHead,
  });

  // Write output
  const outDir = outPath.replace(/[^/\\]+$/, '');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, html, 'utf8');

  console.log(`\n✨  Recap generated!\n`);
  console.log(`    📄  ${outPath}\n`);

  if (shouldOpen) {
    const { exec } = await import('child_process');
    const openCmd = process.platform === 'win32'
      ? `start "" "${outPath}"`
      : process.platform === 'darwin'
        ? `open "${outPath}"`
        : `xdg-open "${outPath}"`;
    exec(openCmd);
    console.log('    🌐  Opening in browser...\n');
  }
}

main().catch(err => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
