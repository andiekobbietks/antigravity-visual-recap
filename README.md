# antigravity-visual-recap

> **A 100% free, offline, local-first visual code recap tool.**
> Instantly generate beautiful, interactive HTML reports from your local `git diff` and commit history without sending your codebase or summaries to any third-party cloud.

---

## 📖 The Origin Story

Builder.io published a popular agent skill called `/visual-recap` to help developers review code changes using high-level summaries, file trees, and annotated diff tabs. 

However, their implementation is designed around **Agent-Native Plans**, a hosted SaaS backend database. If you use it, you must pay for a subscription to host, render, and share the recap pages. If you're offline or don't want to pay, the system blocks you.

We believe that **developer documentation and workflow automation should be open, private, and free**. This project was created on a laptop to serve as a drop-in offline alternative. It runs entirely on your local machine, parsing your local git diffs, and compiles a single self-contained responsive HTML report styled with modern typography, glassmorphism aesthetics, interactive file lists, and diff views.

---

## ✨ Features

- **No Cloud, No Accounts:** Runs 100% offline. Zero tracking, zero logins, zero cost.
- **Single-File Output:** Generates one compiled HTML file containing everything (styles, scripts, and content) — easy to open anywhere or host as static assets.
- **Git Integration:** Auto-discovers changes, logs, file statistics (additions/deletions), and hunks from any git repository.
- **Beautiful UX:** High-fidelity, responsive UI featuring:
  - Interactive file list tree with change badges
  - Git commit history log
  - Tabbed code diff explorer displaying line additions and deletions
  - Dark mode design inspired by modern premium IDEs

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v18.0.0 or higher)
- [Git](https://git-scm.com/)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/andiekobbietks/antigravity-visual-recap.git
   cd antigravity-visual-recap
   ```

2. Make the CLI globally available or run it directly:
   ```bash
   npm link
   # or run directly:
   node src/cli.js
   ```

---

## 💻 Usage

```bash
recap [options]
```

### Options

| Option | Description | Default |
|---|---|---|
| `--repo <path>` | Path to the target git repository | Current directory |
| `--base <ref>` | Base git ref to compare against | `origin/main` |
| `--head <ref>` | Head git ref to compare from | `HEAD` |
| `--out <path>` | Destination path for the generated HTML report | `./recap-output/recap.html` |
| `--title <text>` | Custom header title for the report | `Code Recap: <base>..<head>` |
| `--open` | Open the report automatically in your default browser | `false` |
| `--help` | Show the help menu | — |

### Examples

**1. Recap uncommitted work in the current repo:**
```bash
node src/cli.js --base HEAD --head HEAD
```

**2. Compare your feature branch to main and open the report:**
```bash
node src/cli.js --base main --head vue-migration --open
```

**3. Generate a report for a specific commit range:**
```bash
node src/cli.js --base HEAD~3 --head HEAD --out ./reports/sprint-recap.html
```

---

## 🎨 UI Architecture

The output is crafted using:
- **Inter & JetBrains Mono:** Premium web typography loaded from Google Fonts.
- **Tailwind CSS:** Responsive utility layout, cards, and styling.
- **Interactive JavaScript:** Built-in tab switching logic requiring zero framework runtime dependencies.

---

## 🛡️ License

MIT License. Free to use, modify, and share forever.
*Created with ❤️ using Antigravity.*
