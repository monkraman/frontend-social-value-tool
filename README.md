# Social Value RFP Response Builder

Frontend for a social value bid-response and planning tool. The application is built with React, TypeScript, and Vite.

## Getting started

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- npm (included with Node.js)

### Install and run

```bash
git clone <repository-url>
cd <repository-directory>
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

For complete setup, backend, troubleshooting, and validation instructions, see the [developer quickstart](./docs/DEVELOPER_QUICKSTART.md). Before making changes, review [contribution guidelines](./CONTRIBUTING.md).

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server. |
| `npm run lint` | Runs Oxlint. |
| `npm run build` | Runs the TypeScript project build and creates the production bundle in `dist/`. |
| `npm run preview` | Serves the production bundle locally for review. |

## Backend and demonstration behavior

The frontend API client currently calls `http://127.0.0.1:8000`. The API base URL is defined in [`src/api/client.ts`](./src/api/client.ts); it is not currently configurable through an environment variable.

Some API client methods return sample data or simulate successful operations when the backend is unavailable. These responses are intended for local interface development only. Simulated uploads and deletions are not persisted, and sample data must not be represented as verified client evidence or production results. See the [developer quickstart](./docs/DEVELOPER_QUICKSTART.md) and [API integration specification](./docs/API_INTEGRATION_SPEC.md).

## Project documentation

- [Developer quickstart](./docs/DEVELOPER_QUICKSTART.md): clone, install, run, backend setup, and troubleshooting.
- [Developer onboarding guide](./docs/DEVELOPER_ONBOARDING_GUIDE.md): architecture and development conventions.
- [API integration specification](./docs/API_INTEGRATION_SPEC.md): frontend API endpoints and expected data shapes.
- [Component catalog](./docs/COMPONENT_CATALOG.md): component responsibilities and usage.
- [UI/UX design system](./docs/UI_UX_DESIGN_SYSTEM.md): theme tokens and interface conventions.
- [Documentation policy and pull request template](./docs/DOCUMENTATION_POLICY_AND_PR_TEMPLATE.md): contribution and review checklist.
- [Client handover checklist](./docs/CLIENT_HANDOVER_CHECKLIST.md): pre-delivery validation checklist.
- [Developer task roadmap](./docs/DEVELOPER_TASKS_ROADMAP.md): proposed frontend work items.
