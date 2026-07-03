/**
 * mdx.js — MDX Visual Recap Generator
 *
 * Renders a structured MDX document of a git diff using custom components
 * compatible with modern MDX-based plan/recap viewers.
 */

export function generateMdx(diff, options) {
  const { title } = options;

  // Compile file list in MDX format
  const fileListMdx = diff.files.map(file => {
    return `  <File path="${file.path}" status="${file.status}" insertions={${file.insertions}} deletions={${file.deletions}} />`;
  }).join('\n');

  // Compile diff content in MDX format
  const keyFiles = Object.keys(diff.keyFileDiffs);
  let tabsMdx = '';

  if (keyFiles.length > 0) {
    tabsMdx = `<Tabs>\n` + keyFiles.map(file => {
      const filename = file.split('/').pop();
      const hunks = diff.keyFileDiffs[file];
      
      let hunksMdx = '';
      if (hunks.length === 0) {
        hunksMdx = `    <Diff code="No details or binary file diff." />`;
      } else {
        hunksMdx = hunks.map(hunk => {
          // Escape backticks and double quotes for clean component attribute passing
          const escapedCode = hunk.lines.join('\n')
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\${/g, '\\${');
          
          return `    <Hunk header="${escapeAttribute(hunk.header)}">\n      <Diff code={\`${escapedCode}\`} />\n    </Hunk>`;
        }).join('\n');
      }

      return `  <Tab title="${filename}">\n    <FileInfo path="${file}" />\n${hunksMdx}\n  </Tab>`;
    }).join('\n') + `\n</Tabs>`;
  } else {
    tabsMdx = `*No key code changes to display.*`;
  }

  // Compile commits in MDX format
  const commitsMdx = diff.commits.length > 0
    ? diff.commits.map(c => `* **${c.sha}**: ${escapeMarkdown(c.message)}`).join('\n')
    : `*No committed commits in range (working directory changes only).*`;

  return `---
title: "${escapeAttribute(title)}"
repo: "${escapeAttribute(diff.repoName)}"
branch: "${escapeAttribute(diff.currentBranch)}"
insertions: ${diff.totalInsertions}
deletions: ${diff.totalDeletions}
generatedAt: "${diff.generatedAt}"
kind: "recap"
---

# ${title}

> Generated on ${new Date(diff.generatedAt).toLocaleDateString()}

## Conversion Origins

This codebase was migrated from a **React + TanStack Start** codebase to **Vue 3 + Vue Router** to match the target **Frappe / frappe-ui** design stack.

This visual recap tool was built in response to commercial/corporate alternatives (like Builder.io's \`/visual-recap\` skill) requiring paid cloud database tiers. Under our philosophy, developer workflow documentation shouldn't be locked behind subscription models or external servers. This generator executes entirely locally on your laptop, producing offline HTML and MDX files directly from git.

## Changes Overview

- **Total Files:** ${diff.files.length}
- **Added:** ${diff.files.filter(f => f.status === 'added').length}
- **Modified:** ${diff.files.filter(f => f.status === 'modified').length}
- **Deleted:** ${diff.files.filter(f => f.status === 'deleted').length}
- **Renamed:** ${diff.files.filter(f => f.status === 'renamed').length}

## Commit History

${commitsMdx}

## Changed Files Tree

<FileTree>
${fileListMdx}
</FileTree>

## Key Changes

${tabsMdx}
`;
}

function escapeAttribute(val) {
  if (!val) return '';
  return val.replace(/"/g, '&quot;');
}

function escapeMarkdown(val) {
  if (!val) return '';
  return val
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}
