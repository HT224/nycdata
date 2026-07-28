# nycdata

A developer-first CLI for discovering, inspecting, querying, and profiling **live NYC Open Data**.

`nycdata` sits above NYC's Socrata APIs. It does not mirror datasets or replace NYC as the source of truth. It makes the path from project idea to verified API integration faster and less error-prone.

## Status

Early MVP (`0.1.0`). Implemented commands:

- `search`
- `describe`
- `query`
- `profile`

Planned next: app scaffolding, generated types, saved queries, and an MCP adapter backed by the same core.

## Requirements

- Node.js 20+
- No credentials required for normal public reads
- Optional Socrata application token for higher rate limits

## Install locally

```bash
npm install
npm run build
npm link
nycdata --help
```

For development without linking:

```bash
npm run dev -- search "restaurant inspections"
```

## Optional token

```bash
export SOCRATA_APP_TOKEN="your-token"
```

The token is sent through the `X-App-Token` header. It is never added to URLs or generated output.

## Discover datasets

```bash
nycdata search "restaurant inspections"
nycdata search "motor vehicle crashes" --limit 5
nycdata search "311 complaints" --format json
```

## Inspect schema and metadata

```bash
nycdata describe 43nn-pn8j
nycdata describe erm2-nwe9 --format json
```

## Query live data

```bash
nycdata query 43nn-pn8j --limit 5

nycdata query 43nn-pn8j \
  --select "camis,dba,boro,grade,grade_date" \
  --where "boro = 'Brooklyn' AND grade = 'A'" \
  --order "grade_date DESC" \
  --limit 10

nycdata query 43nn-pn8j \
  --near "40.6895,-73.9724" \
  --radius 1000 \
  --location-field location \
  --limit 10 \
  --show-url
```

Formats:

```bash
nycdata query h9gi-nx95 --limit 10 --format table
nycdata query h9gi-nx95 --limit 10 --format json
nycdata query h9gi-nx95 --limit 10 --format csv
```

## Profile before building

```bash
nycdata profile 43nn-pn8j
nycdata profile erm2-nwe9 --sample-size 250 --format json
```

Profiles are intentionally bounded. Row counts are queried live; null rates and cardinality are explicitly sample-derived so the CLI does not download an entire dataset by accident.

## Architecture

The CLI is a thin presentation layer over reusable TypeScript modules:

- `client.ts` — catalog, metadata, and SODA requests
- `query.ts` — dataset validation and SoQL URL construction
- `profile.ts` — bounded data-quality analysis
- `format.ts` — table, JSON, and CSV output
- `index.ts` — public core exports for future CLI/MCP/scaffold consumers

See [plan.md](./plan.md) for scope, principles, milestones, and deferred work.

## Development

```bash
npm run check
```

This runs lint, TypeScript checks, tests, and the production build.

## Data source

- Portal: https://opendata.cityofnewyork.us/
- Catalog: https://data.cityofnewyork.us/
- API documentation: https://dev.socrata.com/

Dataset schemas and update patterns vary by agency. Always inspect and profile a dataset before treating rows as canonical entities.

## License

MIT
