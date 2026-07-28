# nycdata

A developer-first CLI and MCP server for discovering, inspecting, querying, and profiling **live NYC Open Data**.

`nycdata` sits above NYC's Socrata APIs. It does not mirror datasets or replace NYC as the source of truth. It makes the path from project idea to verified API integration faster and less error-prone.

Repository: https://github.com/HT224/nycdata

## Status

Early MVP (`0.2.0`). Implemented CLI commands:

- `search`
- `describe`
- `query`
- `profile`

The MCP server exposes the same capabilities to coding agents. Planned next: generated types, saved queries, and deterministic client generation.

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
nycdata-mcp
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

## MCP server

`nycdata-mcp` runs a local stdio MCP server with four read-only tools:

- `search_datasets`
- `describe_dataset`
- `query_dataset`
- `profile_dataset`

Each tool uses the same live NYC Open Data client as the CLI. Query results are capped at 1,000 rows per call, profile samples are capped at 1,000 rows, and proximity radii are capped at 50 km.

After building the package, configure an MCP client to run:

```json
{
  "mcpServers": {
    "nycdata": {
      "command": "node",
      "args": ["/absolute/path/to/nycdata/dist/mcp.js"],
      "env": {
        "SOCRATA_APP_TOKEN": ""
      }
    }
  }
}
```

The token entry is optional. The server writes protocol messages to stdout and diagnostics to stderr.

### Agent workflow

An agent can:

1. search for candidate datasets;
2. inspect the chosen dataset's actual fields and row semantics;
3. run a small live query;
4. profile data quality;
5. build application code from verified results instead of guessed schemas.

## Architecture

The CLI is a thin presentation layer over reusable TypeScript modules:

- `client.ts` — catalog, metadata, and SODA requests
- `query.ts` — dataset validation and SoQL URL construction
- `profile.ts` — bounded data-quality analysis
- `format.ts` — table, JSON, and CSV output
- `mcp.ts` — stdio MCP transport and safe tool schemas
- `index.ts` — public core exports for future CLI/MCP/scaffold consumers

See [plan.md](./plan.md) for scope, principles, milestones, and deferred work.

## Development

```bash
npm run check
npm run test:live-mcp
```

`check` runs lint, TypeScript checks, unit/in-memory MCP tests, and the production build. `test:live-mcp` launches the built stdio server through a real MCP client and calls all four tools against live NYC data.

## Data source

- Portal: https://opendata.cityofnewyork.us/
- Catalog: https://data.cityofnewyork.us/
- API documentation: https://dev.socrata.com/

Dataset schemas and update patterns vary by agency. Always inspect and profile a dataset before treating rows as canonical entities.

## License

MIT
