<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FieldOps — Agent Guide

## Stack
- **Next.js 16**, React 19, App Router, TypeScript (strict)
- **better-sqlite3** — synchronous SQLite, NOT async. `getDb()` returns a Promise but all `query()` and `run()` calls are sync.
- **pdftotext** (poppler CLI) — used to extract PDF text via `execSync`. No npm PDF library.
- **Tailwind CSS v4** — config is in `postcss.config.mjs`, not `tailwind.config.js`
- **Radix UI** primitives for dialogs, dropdowns, selects, tabs, toasts, tooltips

## Key Files
| File | Purpose |
|---|---|
| `src/lib/db.ts` | SQLite layer — `getDb()`, `query<T>()`, `run()` |
| `src/lib/types.ts` | All shared TypeScript interfaces |
| `src/lib/pdf-parser.ts` | ARM PDF parsing via `pdftotext -layout` |
| `src/lib/fuzzy-match.ts` | Fuse.js product name matching |
| `src/lib/units.ts` | Unit detection and mL conversion |
| `src/components/Sidebar.tsx` | Navigation sidebar |
| `src/components/Logo.tsx` | FieldOps SVG logo |

## Database Conventions
- All quantities stored internally in **mL** (convert on display using `src/lib/units.ts`)
- All IDs are **UUIDs** (`uuid` package)
- Timestamps are **ISO strings** via SQLite `datetime('now')`
- `flagged` on `inventory_requirements` is an integer (0/1), not boolean
- Schema migrations are handled inline in `initializeSchema()` via `PRAGMA table_info`

## API Conventions
- All routes live in `src/app/api/`
- Use `NextRequest` / `NextResponse` from `next/server`
- Always `await getDb()` before calling `query()` or `run()`
- Return `NextResponse.json({ error: '...' }, { status: 4xx })` for errors

## PDF Parsing
- Requires `pdftotext` (poppler) on the host — check availability before assuming it works
- Parser looks for "Product quantities required" section header
- Each product line format: `AMOUNT UNIT PRODUCT_NAME [FORMULATION_INFO]`
- Amounts in the PDF already include the 25% overage — do not add it again

## Important Gotchas
- `better-sqlite3` is **synchronous** — do not add `await` to `query()` or `run()` calls
- `getDb()` is async only because it was designed for future Postgres compatibility
- The `Project` type has `crop` and `application_timings` fields added via migration — older DBs may not have them but the schema handles this automatically
