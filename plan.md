# nycdata implementation plan

## Objective

Build an open-source, developer-first CLI that shortens the path from “I have an NYC project idea” to a verified live-data integration. NYC Open Data remains the source of truth; the CLI handles discovery, schema inspection, safe querying, profiling, and eventually application scaffolding.

## Product principles

1. **Live by default** — query NYC's APIs rather than copying datasets into a proprietary store.
2. **Inspect before generating** — never invent field names or assume one row equals one entity.
3. **Transparent queries** — show or expose the SoQL sent to Socrata.
4. **Composable core** — CLI and future MCP server use the same client and domain logic.
5. **Bounded operations** — profiling and samples must avoid accidental full-dataset downloads.
6. **Credential-safe** — optional Socrata tokens come from the environment and never enter generated source.

## MVP scope

### `search`

- Search the live NYC Socrata catalog.
- Return dataset ID, name, agency, category, freshness, and description.
- Support table and JSON output.

### `describe`

- Retrieve live dataset metadata.
- Show columns, API field names, Socrata types, descriptions, row count when available, update time, and endpoints.
- Support table and JSON output.

### `query`

- Query any dataset by stable ID.
- Support `$select`, `$where`, `$group`, `$order`, `$limit`, and `$offset`.
- Add a convenience `--near LAT,LNG --radius METERS --location-field FIELD`.
- Support table, JSON, and CSV output.
- Print the final request URL with `--show-url`.

### `profile`

- Fetch a bounded sample plus a live row count.
- Report sample null rate, sample cardinality, inferred date/geographic fields, and example values.
- Clearly label sample-derived statistics.

## Architecture

```text
src/cli.ts
  command parsing and presentation
       |
src/client.ts
  catalog, metadata, and SODA HTTP access
       |
src/query.ts        src/profile.ts        src/format.ts
SoQL construction  bounded analysis      terminal/JSON/CSV
       |
NYC Socrata APIs (live source of truth)
```

The public exports in `src/index.ts` form the future shared core for:

- an MCP server;
- a Next.js/TypeScript scaffold generator;
- saved query definitions;
- TypeScript/Zod and Python/Pydantic type generation.

## Milestones

1. Scaffold TypeScript package, executable, tests, linting, and docs.
2. Implement HTTP client, error handling, and optional app-token support.
3. Implement `search`, `describe`, `query`, and `profile`.
4. Verify commands against restaurant inspections, 311, and crash datasets.
5. Publish repository after security review and explicit approval.
6. Add `scaffold` and MCP adapters after the core commands prove useful.

## Definition of done for v0.1

- All four MVP commands work against live NYC Open Data.
- Query construction and data normalization have automated tests.
- Lint, typecheck, tests, and production build pass.
- README contains install instructions and copy-paste examples.
- No credentials, static dataset snapshots, or local paths are committed.

## Explicitly deferred

- Generic support for every Socrata city.
- Full local data mirroring.
- Natural-language-to-SoQL generation.
- Application templates and MCP transport.
- Publishing to npm, GitHub, or another external system without approval.
