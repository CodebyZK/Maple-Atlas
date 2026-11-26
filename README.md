# Maple Atlas

Maple Atlas is the public dashboard for MapleScope. It turns Maple Forge
exports into a searchable view of Canadian federal grants and contributions.

Current milestone: `v0.1.0`

## Features

- Search by recipient, project, program, department, description, city, or province
- Narrow keyword search by all words, any word, exact phrase, and target field
- Filter records by province, department, start/end/active date range, and funding range
- Sort all matching records by date or funding value (newest first by default)
- Explore funding totals through an interactive basemap with region heat circles and top location pins
- Compare funding totals across departments
- Review individual funding agreements and their source data
- Open a recipient profile: totals, funding by year, departments, programs,
  and largest agreements, with an optional Maple Beacon AI summary
- Run entirely as a static website with no backend or authentication

By default, Atlas uses Forge's deterministic 500-record development sample, so
the dashboard totals describe only that sample. When `VITE_DATA_API_URL` is
configured, Atlas switches to the paginated data service and displays totals
and dataset lineage returned by that service.

## Setup

Node.js 20 or newer is required.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite.

## Commands

```powershell
npm run dev
npm test
npm run build
```

## Full dataset API

Set `VITE_DATA_API_URL` at build time to move filtering, aggregation, and
pagination out of the browser:

```powershell
$env:VITE_DATA_API_URL = "https://data.example.ca/v1/"
npm run dev
```

Atlas sends `GET {VITE_DATA_API_URL}/grants` with these query parameters:

- `query`
- `search_mode` (`all`, `any`, or `phrase`)
- `search_field` (`all`, `recipient`, `project`, `program`, `department`, `description`, or `location`)
- `province`
- `department`
- `date_field` (`start`, `end`, or `active`)
- `start_date`
- `end_date`
- `minimum_value`
- `maximum_value`
- `sort` (`date_desc`, `date_asc`, `value_desc`, or `value_asc`)
- `page`
- `page_size`

Each agreement is counted once, at its latest amendment: amendment rows
restate the agreement's full value. The API applies this for Forge schema
2.0.0 datasets, and the sample fallback drops records whose
`is_latest_amendment` is `false`.

The response must match `GrantQueryResult` in `src/types.ts`. It contains the
bounded `records` page, page metadata, global matching totals, department
totals, province and territory totals, top location totals, filter options, and
Forge dataset lineage. Region totals must apply search, department, date, and
funding filters while ignoring the selected province so users can move directly
between map regions.

Without `VITE_DATA_API_URL`, Atlas uses the committed 500-record sample through
the same client interface. This fallback is intended for tests and local
development only.

## Recipient profiles and Beacon

With a Forge schema 2.1.0 dataset, a grant's details link to its recipient
profile (`GET {VITE_DATA_API_URL}/recipients/{recipient_id}`). The sample
fallback builds the same profile in the browser.

Set `VITE_BEACON_API_URL` (production: `/api/beacon/v1`) to show the Maple
Beacon card. Visitors can generate a summary when none is cached; Atlas then
polls Beacon every three seconds until it is ready. Without the variable,
profiles show no AI card.

For local development, `npm run dev` proxies `/api/beacon` to Beacon on port
8100 and `/api` to the Data API on port 8000, matching production Nginx:

```powershell
$env:VITE_DATA_API_URL = "/api/v1"
$env:VITE_BEACON_API_URL = "/api/beacon/v1"
npm run dev
```

## Updating the data

Forge is the source of truth for the shared grant schema. After building Forge,
copy its sample into Atlas. This command expects both repositories to be checked
out as sibling directories:

```text
maple/
├── atlas/
└── forge/
```

```powershell
Copy-Item ..\forge\data\samples\grants.sample.json public\data\grants.sample.json
```

Do not hand-edit the copied sample.

## Architecture

```text
public/data/         versioned Forge sample
src/data.ts          fallback sample loading and aggregation
src/dataClient.ts    paginated HTTP client and local fallback adapter
src/types.ts         shared Forge and API response shapes
src/App.tsx          asynchronous dashboard and record details
src/styles.css       responsive visual design
```

Atlas is intentionally client-only for v0.1.0. A database, API, accounts,
alerts, and automated claims about recipients are out of scope.

## Data source and licence

The data originates from the Government of Canada
[Proactive Disclosure - Grants and Contributions dataset](https://open.canada.ca/data/en/dataset/432527ab-7aac-45b5-81d6-7597107a7013).

Contains information licensed under the Open Government Licence - Canada.

Project code is licensed under the MIT License.
