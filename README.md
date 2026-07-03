# Maple Atlas

Maple Atlas is the public dashboard for MapleScope. It turns Maple Forge
exports into a searchable view of Canadian federal grants and contributions.

Current milestone: `v0.1.0`

## Features

- Search by recipient, project, program, department, city, or province
- Filter records by province and department
- Explore funding totals through an interactive Canadian region map
- Compare funding totals across departments
- Review individual funding agreements and their source data
- Run entirely as a static website with no backend or authentication

Atlas currently uses Forge's deterministic 500-record development sample.
Totals shown in the dashboard describe that sample, not all federal funding.

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
src/data.ts          data loading and aggregation
src/types.ts         shared Forge record shape
src/App.tsx          dashboard and record details
src/styles.css       responsive visual design
```

Atlas is intentionally client-only for v0.1.0. A database, API, accounts,
alerts, and automated claims about recipients are out of scope.

## Data source and licence

The data originates from the Government of Canada
[Proactive Disclosure - Grants and Contributions dataset](https://open.canada.ca/data/en/dataset/432527ab-7aac-45b5-81d6-7597107a7013).

Contains information licensed under the Open Government Licence - Canada.

Project code is licensed under the MIT License.
