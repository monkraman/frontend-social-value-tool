# Developer Onboarding Guide

This guide introduces the frontend structure, key implementation boundaries, and conventions for developers working on the Social Value RFP Response Builder.

For clone and install instructions, see the [developer quickstart](./DEVELOPER_QUICKSTART.md). For contribution and review requirements, see the [contribution guidelines](../CONTRIBUTING.md).

## 1. Application overview

This repository contains a React and TypeScript frontend built with Vite. It provides an interface for entering tender requirements, reviewing generated response packages, simulating initiative volumes, managing documents, and searching evidence.

The frontend communicates with a separate backend through the API client in [`src/api/client.ts`](../src/api/client.ts). Backend availability and data persistence must be verified independently; frontend fallback behavior is intended for local demonstrations, not production data.

## 2. Repository structure

```text
src/
├── api/
│   └── client.ts                 # Backend requests and local demonstration fallbacks
├── components/                   # Main application views
│   ├── Documents.tsx
│   ├── PromptStudio.tsx
│   ├── Search.tsx
│   ├── Sidebar.tsx
│   └── Tuner.tsx
├── constants/                    # Theme, defaults, and prompt presets
├── hooks/                        # Shared state and application behavior
├── types/
│   └── index.ts                  # TypeScript domain and API types
├── utils/                        # Parsing, formatting, and export helpers
├── App.tsx                       # Application shell
├── index.css                     # Global styles and CSS variables
└── main.tsx                      # React entry point
```

The `docs/` directory contains the [API integration specification](./API_INTEGRATION_SPEC.md), [component catalog](./COMPONENT_CATALOG.md), [design system](./UI_UX_DESIGN_SYSTEM.md), [developer quickstart](./DEVELOPER_QUICKSTART.md), and project delivery references.

## 3. Application areas

- **Prompt Studio**: Collects a natural-language opportunity prompt and displays Core, Enhanced, and Localised response package data.
- **Bid Tuner**: Changes initiative volumes and recalculates totals using the backend or the client's local demonstration rate card.
- **Documents**: Lists, uploads, and deletes documents through API client methods. Local fallback results are simulated and are not persisted.
- **Semantic Search**: Sends a query and requested result count to the backend; a sample result set is returned when the backend is unavailable.
- **Sidebar**: Provides view navigation, theme control, and backend status.

The project currently uses a small set of page-level components rather than a separate feature or shared-UI directory. Follow the existing structure unless a change justifies a broader refactor.

## 4. Data and calculation boundaries

The API client currently targets `http://127.0.0.1:8000`. The base URL is hard-coded in [`src/api/client.ts`](../src/api/client.ts); no environment variable is currently used to configure it.

When backend requests fail, client methods may return sample data or simulated outcomes:

- Response generation returns a locally constructed sample response.
- Document listing returns sample document records.
- Upload and delete methods can report simulated success.
- TOMs metrics and search can return local sample data.
- Package calculation uses a local demonstration rate card.

These fallbacks support interface development. They do not prove that a partner, document, metric rate, calculation, or search result is verified, and simulated document operations do not persist. Do not use fallback output as client evidence.

For any real bid or client-facing output, confirm the source and approval status of the data and rate card with the backend and relevant domain owners. The frontend alone does not establish compliance or validate the provenance of a result.

## 5. Theme and component conventions

- Theme definitions are in [`src/constants/theme.ts`](../src/constants/theme.ts); global styles and CSS variables are in [`src/index.css`](../src/index.css).
- Reuse existing CSS variables and component styles before adding new visual tokens.
- Keep components focused and use explicit TypeScript types for props and API data.
- Prefer existing helpers in `src/utils/` for formatting and export behavior.
- Use the existing React hooks in `src/hooks/` for shared stateful behavior.
- Keep user-facing text and developer documentation in clear, professional English.

See the [component catalog](./COMPONENT_CATALOG.md) and [UI/UX design system](./UI_UX_DESIGN_SYSTEM.md) for more detail.

## 6. Local development and validation

From the repository root:

```bash
npm ci
npm run dev
npm run lint
npm run build
```

The development server prints its local URL in the terminal. The build command runs the TypeScript project build before producing the Vite bundle.

There is no test script configured in `package.json` at this time. See the [developer quickstart](./DEVELOPER_QUICKSTART.md) for backend setup and troubleshooting.

## 7. Pull request expectations

Before submitting a change:

1. Keep the change focused and preserve current behavior unless the change explicitly requires otherwise.
2. Update relevant documentation when APIs, setup, architecture, or user-visible behavior changes.
3. Run `npm run lint` and `npm run build`.
4. For UI changes, check relevant viewport sizes and both themes.
5. Do not commit credentials, client evidence, generated build output, or local-only configuration.

Use the [contribution checklist](../CONTRIBUTING.md) and [documentation policy](./DOCUMENTATION_POLICY_AND_PR_TEMPLATE.md).
