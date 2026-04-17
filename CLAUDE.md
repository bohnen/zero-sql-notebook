# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Jupyter-style **SQL notebook** SPA that executes against [TiDB Cloud Zero](https://zero.tidbapi.com). Markdown is the on-disk format; SQL lives in ` ```sql ` fences, per-notebook variables in ` ```env ` fences. Deployed as a static Netlify site with a handful of Netlify Functions for the proxies that must hide a secret or dodge CORS.

M1〜M5 are merged; the spec (`spec.md`, Japanese) stays authoritative for invariants. The pre-implementation reference lives at `ref/tidb-cloud-zero-browser/` and is **not tracked** (`.gitignore`); treat it as read-only source material.

## Dev loop

Package manager is **pnpm** (`packageManager: pnpm@10.33.0`). Node `>= 18`.

| 目的 | コマンド |
| --- | --- |
| 開発サーバ起動 (Netlify + Vite) | `pnpm dev` → `http://localhost:8888` |
| 型チェック | `pnpm typecheck` (svelte-check) |
| Lint + format check | `pnpm lint` |
| フォーマット適用 | `pnpm format` |
| ユニットテスト | `pnpm test` (vitest) |
| 本番ビルド | `pnpm build` (`typecheck && vite build`) |

前 commit に `pnpm lint && pnpm test && pnpm build` を通す。

## Branch + PR workflow (required)

`main` は production。直接 push しない — Netlify が自動で production にデプロイしてしまうので、**feature ブランチ → PR → Deploy Preview 確認 → merge** の順で進める。

```sh
# 作業開始
git checkout -b feat/<short-description>

# 編集 → commit
# ...

# push & PR
git push -u origin feat/<short-description>
gh pr create --fill      # or --title/--body

# CI/Deploy Preview で確認してから merge
gh pr merge --squash

# 同期
git checkout main && git pull --ff-only
```

PR を開くと `.github/PULL_REQUEST_TEMPLATE.md` が本文に入る。タグ (`m6`, `m7` …) は **merge 後の main HEAD** に打つ。

### Deploy Preview と GitHub OAuth の落とし穴

Deploy Preview URL は `https://deploy-preview-<n>--<site>.netlify.app/` と毎回変わる。GitHub OAuth App は callback URL を 1 件しか持てないため、preview では **Gist Share / Update / ログイン系は動かない**。preview で確認するのは UI・SQL 実行・プロジェクト取り込みまで。Gist 周りの回帰は production(merge 後)か `pnpm dev` で確認する。

## Architecture (M5 時点)

```
 Browser (Svelte 5 + CodeMirror 6, Vite build → /dist)
   │
   ├── /api/instance           TiDB Zero instance provision/cache
   ├── /api/sql                SQL proxy (Basic auth 組立)
   ├── /api/oauth/config       公開 client_id を返す
   ├── /api/oauth/token        code → access_token 交換 (client_secret をサーバ隠蔽)
   │
   ├── api.github.com (direct)            Gist CRUD / repo contents
   └── raw.githubusercontent.com (direct) project notebook 本体取得
```

クライアントは 4 種類の runes ストアに状態を分散:
- `src/lib/state/notebook.svelte.ts` — 複数ノートブックと順序 (`notebook-order-v1`)
- `src/lib/state/results.svelte.ts` — 実行結果(セッション内メモリ、永続化しない)
- `src/lib/state/instance.svelte.ts` — TiDB インスタンス状態
- `src/lib/state/project.svelte.ts` — GitHub プロジェクト読込中の状態
- `src/lib/state/share.svelte.ts` — `?gist_id=` で開いた読取専用共有
- `src/lib/state/ui.svelte.ts` — サイドバー折畳等の UI prefs
- `src/lib/state/runners.ts` / `toast.svelte.ts` — run 登録と Undo toast

## 主要な再利用ポイント

- Markdown パース/シリアライズ: `src/lib/notebook/parse.ts` / `serialize.ts` / `frontmatter.ts`(`title` + `gist_id` のみ)
- SQL 実行: `src/lib/execute/run.ts`(`runCell`、401/403 の 1 回自動リトライあり)と `split.ts`(素朴な `;` 分割)
- 変数展開: `src/lib/env/parse.ts` + `expand.ts`(文書順・後勝ち、未定義はクライアント側エラー)
- 結果出力: `src/lib/result/export.ts`(CSV RFC 4180 / Markdown テーブル / 1,000 行制限)
- Gist: `src/lib/gist/client.ts`(secret gist デフォルト)
- GitHub project: `src/lib/project/github.ts` + `manifest.ts`(`project.yaml` は title + notebooks 配列のみ)
- Svelte action: `src/editor/codemirror.ts`(Mod-Enter は `Prec.highest` で奪う)、`src/editor/autosize.ts`(textarea 自動拡縮)

## Non-obvious conventions

- **UI コピーは日本語**。spec / 既存メッセージを踏襲。コード識別子とコメントは英語。
- **実行結果は永続化しない**(spec §1.2)。runes ストアはセッション内のみでリロードで消える。localStorage にも Markdown にも書き戻さない。
- **CodeMirror の `Mod-Enter` は `Prec.highest` 必須**。デフォルトの `insertBlankLine` に奪われる。
- **box-sizing: border-box** をグローバル適用済。新しい input/textarea を書くときは `width:100%` + padding が安全に効く。
- **Co-Authored-By トレーラの注意**: Netlify が private repo で「複数 contributor」を検知すると build が止まる。repo が private のまま Claude を co-author に入れる場合はプラン or repo を public にする。
- **CSP の connect-src**: `api.github.com` と `raw.githubusercontent.com` は許可済。新しい upstream を追加するときは `netlify.toml` の CSP 更新を忘れない。

## Common operations

- M5 の動作確認用 public repo: `https://github.com/tadapin/zero-notebook-example`
  - `http://localhost:8888/?github=tadapin/zero-notebook-example` で開ける
- Netlify CLI からデプロイ(ほぼ不要、PR 経由で良い): `pnpm exec netlify deploy --build [--prod]`
- スモークドキュメント: `docs/m1-smoke.md` 〜 `docs/m5-smoke.md`(機能別に項目一覧)

## What NOT to do

- `main` に直接 push(production を触ってしまう)
- `ref/` を編集(別クローン扱い)
- Markdown / localStorage に実行結果を書き戻す(spec 非スコープ)
- `api/*.js`(Vercel 互換版)を復活させる — Netlify Functions (`.mjs`) 一本で運用
- CodeMirror のラッパライブラリ(`svelte-codemirror-editor` 等)へ乗り換える — vanilla action で直接持ったほうが HMR / 状態管理が素直
