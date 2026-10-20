# quick-search

**English** | [日本語](https://github.com/oba18/inkdrop-quick-search/blob/main/README.ja.md)

A Raycast-style note finder for Inkdrop. Open it with a shortcut and narrow down notes by title and full-text search.

## Installation

Search for `quick-search` in Inkdrop's Preferences → Plugins, or run:

```sh
ipm install quick-search
```

Works with the Inkdrop 6+ desktop app. The keyboard shortcuts are for macOS (on Windows / Linux, use the Plugins menu or the command).

## Usage

| Action | What it does |
| --- | --- |
| `Cmd+O`, or Plugins › Quick Search | Open the search window (with an empty query, it lists recently updated notes) |
| `Cmd+K`, then `n` + Space | Use the same search from Inkdrop's built-in Telescope |
| `Ctrl+N` / `Ctrl+P` (or `↓` / `↑`) | Select the next / previous item (works everywhere in the `Cmd+K` Telescope) |
| `Ctrl+F` / `Ctrl+B` / `Ctrl+A` / `Ctrl+E`, etc. | Move the cursor in the input (standard macOS Emacs-style keys) |
| `Enter` | Open the note |
| `Cmd+Enter` | Open it in a separate window |
| `Shift+Enter` | Copy a link to the note |

Each row shows the note title (matches highlighted), an excerpt of the matching line in the body, tags, task priority and due date, and the notebook name.

### Task priority and due dates

Reads the syntax of the [reminder](https://github.com/oba18/inkdrop-reminder) plugin (`- [ ] … ⭐⭐ ⏰2026-10-20 15:00`; a note's own due date is a line with just `⏰…`).

- When the query matches **a task line**, that task's ⭐ and ⏰ are shown
- Otherwise, the note's due date (or the earliest due date among its open tasks) and the highest priority among its open tasks
- Overdue dates are red and today's are orange. Due dates of completed tasks and of Completed / Dropped notes are struck through
- ⭐ used as decoration in headings or tables is not treated as a priority

## How search works

- **Body**: Inkdrop's full-text search index (`db.utils.search`). Supports Japanese substring matching, English prefix matching, and space-separated AND queries
- **Title**: Note titles are kept in memory and matched as substrings (`ocker` finds `docker_generate`). The cache is rebuilt when notes change
- **Ranking**: title equals the query → title starts with the query → title contains every word (these three by most recently updated) → full-text match in the title → body-only match (by relevance)
- Completed / Dropped notes are searched too. Notes in the trash are not

## Settings

| Setting | Description |
| --- | --- |
| Notebooks to exclude from results | Comma-separated notebook names. Their sub-notebooks are excluded too |
| Maximum number of results | 50 by default |
| Language | UI language: `en` (English) / `ja` (Japanese). `auto` (default) uses Japanese if it is one of your system languages, otherwise English |

## Development

```sh
npm install
npm run build      # outputs to lib/
npm run typecheck
```

During development, put a symlink named `quick-search` to this directory in Inkdrop's packages folder (`~/Library/Application Support/inkdrop/packages/` on macOS) to load it.

## License

MIT
