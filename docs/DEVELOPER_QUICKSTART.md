# Developer Quickstart

This guide takes a new developer from cloning the repository to running and validating the frontend.

## 1. Prerequisites

- Git
- Node.js `^20.19.0` or `>=22.12.0`
- npm, installed with Node.js

Check the installed versions:

```bash
node --version
npm --version
```

Vite 8 requires a supported Node.js version. If the installed version does not meet the requirement, install a supported Node.js release before continuing.

## 2. Clone and install

Replace `<repository-url>` with the repository URL provided by your project administrator:

```bash
git clone <repository-url>
cd <repository-directory>
npm ci
```

`npm ci` installs the exact dependency versions recorded in `package-lock.json`. If you intentionally change dependencies, update the manifest and lockfile together.

## 3. Start the frontend

```bash
npm run dev
```

Open the local address printed by Vite. The default is usually `http://localhost:5173`. Stop the server with `Ctrl+C`.

The frontend can render and demonstrate parts of the interface without a running backend. Some API calls use in-memory sample responses or simulated outcomes when the backend is unavailable; those outcomes are not persistent and are not suitable for validating real data flows.

## 4. Connect a backend

The frontend API client currently uses `http://127.0.0.1:8000` as its base URL. Start the compatible backend separately using that project's setup instructions, then confirm that its health endpoint responds at `http://127.0.0.1:8000/health`.

The current frontend does not read `VITE_API_URL` or another environment variable to configure this URL. Do not add a `.env` file expecting it to change the API destination. To use another backend URL, the frontend API client must first be updated to support configuration.

Review the [API integration specification](./API_INTEGRATION_SPEC.md) for the endpoints and payload shapes used by the frontend. Confirm the actual backend implementation and data source before treating a response as client evidence.

## 5. Quality checks

Run the available validation commands before opening a pull request:

```bash
npm run lint
npm run build
```

`npm run build` runs the TypeScript project build and generates the production bundle in `dist/`. The repository does not currently define a test script.

To inspect the production build locally after building:

```bash
npm run preview
```

Use the preview URL printed by Vite. A preview server is for local review; it is not a production deployment.

## 6. Troubleshooting

### Unsupported Node.js version

Check `node --version` and install a supported version listed in the prerequisites. Restart the terminal after changing Node.js versions.

### Dependencies do not install cleanly

Verify that `package.json` and `package-lock.json` are present, then retry `npm ci`. If a dependency change is intentional, update the lockfile with npm and include it in the same change.

### The interface reports that the backend is offline

Confirm that the backend is running and reachable at `http://127.0.0.1:8000/health`. Check the browser console and backend logs for connection or CORS errors. The frontend's base URL is currently hard-coded in `src/api/client.ts`.

### An upload or deletion appears successful with the backend stopped

Some fallback methods deliberately simulate success for interface demonstrations. Restart the backend and verify the resulting data through the backend before relying on an upload or deletion. Simulated operations are not persisted.

### Port 5173 is already in use

Vite normally selects another available port and prints the address to use. Open the address shown in the terminal.

## Further reading

- [Developer onboarding guide](./DEVELOPER_ONBOARDING_GUIDE.md)
- [Contribution guidelines](../CONTRIBUTING.md)
- [API integration specification](./API_INTEGRATION_SPEC.md)
- [Component catalog](./COMPONENT_CATALOG.md)
- [UI/UX design system](./UI_UX_DESIGN_SYSTEM.md)
- [Client handover checklist](./CLIENT_HANDOVER_CHECKLIST.md)
