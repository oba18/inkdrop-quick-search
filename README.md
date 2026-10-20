# quick-search

**English** | [日本語](#日本語)

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

---

# 日本語

[English](#quick-search) | **日本語**

Raycast のような窓でノートを探す Inkdrop プラグインです。ショートカットで開き、タイトルと本文の全文検索でノートを絞り込んで開けます。

## インストール

Inkdrop の「設定 → Plugins」で `quick-search` を検索してインストールするか、ターミナルで:

```sh
ipm install quick-search
```

Inkdrop 6 以降のデスクトップ版で動きます。ショートカットは macOS 用です（Windows / Linux ではメニュー「Plugins」やコマンドから使えます）。

## 使い方

| 操作 | 動作 |
| --- | --- |
| `Cmd+O`、メニュー Plugins › Quick Search | 検索窓を開く（何も入力しなければ最近更新したノート） |
| `Cmd+K` のあと `n` + スペース | 同じ検索を Inkdrop 標準の Telescope から使う |
| `Ctrl+N` / `Ctrl+P`（`↓` / `↑` も可） | 次 / 前の候補を選ぶ（`Cmd+K` の Telescope 全体で有効） |
| `Ctrl+F` / `Ctrl+B` / `Ctrl+A` / `Ctrl+E` など | 入力欄のカーソル移動（macOS 標準の Emacs 風キー） |
| `Enter` | ノートを開く |
| `Cmd+Enter` | 別ウィンドウで開く |
| `Shift+Enter` | ノートへのリンクをコピー |

各行には、ノートのタイトル（一致した箇所をハイライト）、本文で一致した行の抜粋、タグ、タスクの優先度と期限、ノートブック名が表示されます。

### タスクの優先度と期限

[reminder](https://github.com/oba18/inkdrop-reminder) プラグインの書式（`- [ ] … ⭐⭐ ⏰2026-10-20 15:00`、ノートの期限は `⏰…` だけの行）を読み取ります。

- 検索語が**タスクの行**に一致したときは、そのタスクの ⭐ と ⏰
- それ以外は、ノートの期限（なければ未完了タスクで最も早い期限）と、未完了タスクの最高の優先度
- 期限は、過ぎていれば赤、今日ならオレンジで表示します。完了したタスクや Completed / Dropped のノートの期限は取り消し線になります
- 見出しや表に飾りとして書いた ⭐ は優先度として扱いません

## 検索のしくみ

- **本文**: Inkdrop の全文検索インデックス（`db.utils.search`）。日本語の部分一致、英単語の前方一致、スペース区切りの AND 検索に対応しています
- **タイトル**: ノートのタイトルをメモリに保持し、部分一致で探します（`ocker` で `docker_generate` も見つかります）。ノートが変更されると作り直します
- **並び順**: タイトルが検索語と同じ → 検索語で始まる → 全ての語を含む（この3つは更新日の新しい順）→ 全文検索でタイトルに一致 → 本文だけに一致（関連度順）
- Completed / Dropped のノートも検索対象です。ゴミ箱のノートは出ません

## 設定

| 項目 | 内容 |
| --- | --- |
| 検索結果に出さないノートブック | ノートブック名をカンマ区切りで。配下のノートブックも除外されます |
| 表示する件数の上限 | 既定 50 件 |
| Language | 表示言語。`en`（英語）/ `ja`（日本語）。既定の `auto` はシステムの言語に日本語が含まれていれば日本語、それ以外は英語 |

## 開発

```sh
npm install
npm run build      # lib/ に出力
npm run typecheck
```

開発中は、Inkdrop のプラグインフォルダ（macOS では `~/Library/Application Support/inkdrop/packages/`）に `quick-search` という名前でこのディレクトリへのシンボリックリンクを置くと読み込まれます。

## ライセンス

MIT
