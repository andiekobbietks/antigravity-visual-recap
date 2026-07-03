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
                     Note: file extensions (.html/.mdx) will be appended automatically
                     if not specified.
  --format <type>    Output format: html, mdx, or both (default: both)
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

  if (format === 'html' || format === 'both') {
    const html = generateRecap(diff, recapOptions);
    writeFileSync(generatedHtmlPath, html, 'utf8');
    console.log(`    📄  HTML: ${generatedHtmlPath}`);
  }

  if (format === 'mdx' || format === 'both') {
    const mdx = generateMdx(diff, recapOptions);
    writeFileSync(generatedMdxPath, mdx, 'utf8');
    console.log(`    📄  MDX:  ${generatedMdxPath}`);
  }

  console.log(`\n✨  Recap generated successfully!\n`);

  if (shouldOpen && (format === 'html' || format === 'both')) {
    const { exec } = await import('child_process');
    const openCmd = process.platform === 'win32'
      ? `start "" "${generatedHtmlPath}"`
      : process.platform === 'darwin'
        ? `open "${generatedHtmlPath}"`
        : `xdg-open "${generatedHtmlPath}"`;
    exec(openCmd);
    console.log('    🌐  Opening HTML report in browser...\n');
  }
}

main().catch(err => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
