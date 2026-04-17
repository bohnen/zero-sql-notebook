# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository is **pre-implementation**: it currently contains only a specification draft (`spec_draft.md`, written in Japanese) and a reference implementation under `ref/`. No application code, `package.json`, or build system has been created yet. The first implementation work will bootstrap the project from scratch, using the reference as a starting point.

## Product Goal (from `spec_draft.md`)

A Jupyter-style **SQL notebook** that renders Markdown and executes SQL code blocks against [TiDB Cloud Zero](https://zero.tidbapi.com), deployed as a static Netlify site (SPA, no backend beyond Netlify Functions). Key invariants from the spec:

- **Notebook file format is Markdown.** SQL lives in ` ```sql ` fenced blocks; variables live in ` ```env ` fenced blocks (`KEY=VALUE` lines). Variables are expanded into SQL via `${VAR}` **client-side before execution** and are notebook-global.
- **Storage is browser-local.** Notebooks persist to `localStorage`. Import paths: Markdown file upload, or GitHub Gist URL. Sharing path: create a Gist (via the user's GitHub OAuth), then load via `?gist_id=…` query param — reading a shared notebook requires no auth.
- **TiDB Cloud Zero lifecycle is automatic.** On first run, if no connection info is in `localStorage`, provision a new instance; cache the connection string + `expiresAt`; reprovision automatically when expired. Instances have a 30-day TTL.
- Keep the UI intentionally minimal — per the spec, do not add rich features beyond SQL editing and execution.

## Reference Implementation: `ref/tidb-cloud-zero-browser/`

A working single-page TiDB Cloud Zero SQL editor (not a notebook). Treat it as the canonical source for **how to talk to TiDB Cloud Zero** — the same API wiring will be reused by the notebook. It is a separate git submodule/clone and should not be edited as part of notebook work.

### Architecture at a glance

```
Browser (index.html, vanilla JS, no bundler)
   │
   ├── POST /api/instance   ──► Netlify Function  ──► POST https://zero.tidbapi.com/v1alpha1/instances
   │   (provision / fetch cached TiDB instance)       returns { connectionString, expiresAt }
   │
   └── POST /api/sql        ──► Netlify Function  ──► POST https://http-<host>/v1beta/sql
       { host, username, password, database, query }  (Basic auth, TiDB-Database header)
```

### Key mechanics worth knowing

- **Two-layer instance cache.** The client caches `{ connectionString, expiresAt }` in `localStorage` under `tidb-zero-instance-v1` (L1). The `/api/instance` function *also* keeps a module-level `cached` variable (L2) that survives across warm Netlify invocations. Both layers evict when less than 5 minutes remain (`isExpired` in `api/instance.js` and `netlify/functions/instance.mjs`). `POST /api/instance` with `{ force: true }` bypasses and re-provisions.
- **Two function runtimes present.** `api/*.js` uses the Vercel-style `(req, res)` handler signature; `netlify/functions/*.mjs` uses the Netlify Edge `(req) => Response` signature with an explicit `export const config = { path: "/api/..." }`. The Netlify build (`netlify.toml` → `functions = "netlify/functions"`) is the one actually deployed — the `api/` copies exist for parity with a Vercel-style deploy. **Keep the two in sync if you modify one.**
- **SQL endpoint expects the host stripped of protocol.** `parseConnectionString` in `index.html` turns a TiDB Cloud Zero connection URL into `{ host, username, password, database }`, and the function reconstructs the upstream URL as `https://http-${host}/v1beta/sql`.
- **Statement splitting is client-side and naive.** `splitStatements` in `index.html` strips `--` comments and splits on `;`. Multi-statement runs are sequenced with `runMultiple`, and only the last result is rendered as a table.
- **No CORS on the upstream API** is assumed — all TiDB traffic goes through the Netlify function, never direct from the browser.
- **Deploy config** (`netlify.toml`) publishes the repo root as-is and sets permissive CORS headers. There is no build step.

## Likely First Steps When Implementing

1. Decide whether to start from a copy of `ref/tidb-cloud-zero-browser/` or build fresh. The `/api/instance` and `/api/sql` functions are directly reusable — the notebook's new surface area is the Markdown editor, block-level run buttons, env-block variable substitution, localStorage notebook CRUD, and Gist import/export + OAuth.
2. When adding a build system or framework, update this file with the actual `build`/`dev`/`test` commands — right now there are none to document.
3. The spec targets Netlify; keep the `netlify/functions/*.mjs` runtime as the source of truth and drop `api/*.js` unless a Vercel deploy is also planned.

## Non-Obvious Conventions

- The spec document and most in-repo prose are **Japanese**. Preserve Japanese in user-facing copy unless the user asks otherwise; code identifiers and comments in the reference are English.
- The target deploy URL referenced in the spec is `https://sql-notebook.netlify.app/` (shared-notebook links use this origin with `?gist_id=…`).
