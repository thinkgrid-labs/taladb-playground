# TalaDB Playground

Interactive demo for [TalaDB](https://github.com/thinkgrid-labs/taladb) — a local-first document and vector database built in Rust.

**Live demo:** https://taladb-playground.vercel.app/

## What's inside

- **Notes** — create, search, and delete notes stored in TalaDB via OPFS. Demonstrates document CRUD, full-text search, category filtering, secondary indexes, and live query subscriptions.
- **Semantic Search** — 15 articles embedded with `all-MiniLM-L6-v2` (runs entirely on-device via `@huggingface/transformers`). Demonstrates vector indexing, `findNearest`, and hybrid filter + vector ranking.

## Stack

- React + Vite
- `taladb` + `@taladb/web` (WASM + OPFS via Dedicated Worker)
- `@huggingface/transformers` v3 for on-device embeddings

## Local development

```bash
pnpm install
pnpm dev
```

> Requires the published `@taladb/web` package which ships the WASM binary.
> To test against a local build of TalaDB, run `scripts/dev-playground.sh` from the monorepo root.
