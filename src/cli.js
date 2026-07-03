#!/usr/bin/env node
/**
 * antigravity-visual-recap — CLI entry point
 * Usage: node src/cli.js [options]
 *
 * Generates a rich HTML visual recap of git changes — entirely local,
 * no cloud services, no subscriptions, no accounts required.
 */

import { generateRecap } from './index.js';
import { generateMdx } from './mdx.js';
import { generateScrolly } from './scrolly.js';
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
  --out <path>       Output base file path (default: ./recap-output/recap)
                     Note: file extensions (.html/.mdx/.scrolly.html) will be
                     appended automatically if not specified.
  --format <type>    Output format: html, mdx, scrolly, or all (default: all)
  --open             Open the HTML report in the default browser after generating
  --title <text>     Custom title for the recap
  --help             Show this help message
  --self-test        Run a self-test on this repo

Examples:
  # Recap all changes vs origin/main in both formats
  node src/cli.js

  # Output MDX format only
  node src/cli.js --format mdx

  # Recap a specific branch
  node src/cli.js --base main --head vue-migration

  # Recap and open in browser
  node src/cli.js --open
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
  const format   = getArg('--format', 'both').toLowerCase();
  
  let outPathRaw = getArg('--out', './recap-output/recap');
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

  // Standardize output folder
  const baseOutPath = outPathRaw.replace(/\.(html|mdx)$/i, '');
  const outDir = baseOutPath.substring(0, Math.max(baseOutPath.lastIndexOf('/'), baseOutPath.lastIndexOf('\\')));
  if (outDir) {
    mkdirSync(outDir, { recursive: true });
  }

  const recapOptions = {
    title: title || `Code Recap: ${effectiveBase}..${effectiveHead}`,
    repoPath,
    base: effectiveBase,
    head: effectiveHead,
  };

  const generatedHtmlPath = `${baseOutPath}.html`;
  const generatedMdxPath = `${baseOutPath}.mdx`;

  const generatedScrollyPath = `${baseOutPath}.scrolly.html`;

  if (format === 'html' || format === 'all') {
    const html = generateRecap(diff, recapOptions);
    writeFileSync(generatedHtmlPath, html, 'utf8');
    console.log(`    📄  HTML:    ${generatedHtmlPath}`);
  }

  if (format === 'mdx' || format === 'all') {
    const mdx = generateMdx(diff, recapOptions);
    writeFileSync(generatedMdxPath, mdx, 'utf8');
    console.log(`    📄  MDX:     ${generatedMdxPath}`);
  }

  if (format === 'scrolly' || format === 'all') {
    const scrolly = generateScrolly(diff, recapOptions);
    writeFileSync(generatedScrollyPath, scrolly, 'utf8');
    console.log(`    🎬  Scrolly: ${generatedScrollyPath}`);
  }

  console.log(`\n✨  Recap generated successfully!\n`);

  if (shouldOpen) {
    const { exec } = await import('child_process');
    // Open HTML dashboard
    if (format === 'html' || format === 'all') {
      const cmd = process.platform === 'win32'
        ? `start "" "${generatedHtmlPath}"`
        : process.platform === 'darwin' ? `open "${generatedHtmlPath}"` : `xdg-open "${generatedHtmlPath}"`;
      exec(cmd);
      console.log('    🌐  Opening HTML in browser...');
    }
    // Open Scrolly dashboard in a second tab
    if (format === 'scrolly' || format === 'all') {
      await new Promise(r => setTimeout(r, 600)); // slight delay so tabs open separately
      const cmd2 = process.platform === 'win32'
        ? `start "" "${generatedScrollyPath}"`
        : process.platform === 'darwin' ? `open "${generatedScrollyPath}"` : `xdg-open "${generatedScrollyPath}"`;
      exec(cmd2);
      console.log('    🎬  Opening Scrolly in browser...');
    }
    console.log('');
  }
}

main().catch(err => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
