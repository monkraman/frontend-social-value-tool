# Client Handover Checklist

Use this checklist to record the results of pre-delivery validation. Mark an item complete only after it has been tested in the target environment. The frontend repository alone does not establish backend readiness, data provenance, or regulatory compliance.

## 1. Build and repository readiness

- [ ] Install dependencies from the lockfile with `npm ci`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Confirm the intended source branch and release revision.
- [ ] Confirm that no credentials, local configuration, or unintended generated files are included.

## 2. Backend and data readiness

- [ ] Confirm the deployed backend URL and its compatibility with the frontend API contract.
- [ ] Confirm authentication, authorization, CORS, and deployment configuration with the backend owner.
- [ ] Verify health, generation, document, calculation, and search requests against the deployed backend.
- [ ] Verify that document uploads and deletions persist and are reflected by the backend.
- [ ] Verify that every production data source, delivery partner, and TOMs rate is approved and traceable.
- [ ] Confirm that sample fallback data is disabled or clearly identified in the client delivery environment.
- [ ] Confirm error handling for unavailable services, invalid requests, and backend errors.

The frontend API base URL is currently hard-coded to `http://127.0.0.1:8000` in `src/api/client.ts`. Confirm that this is suitable for the intended environment before handover.

## 3. User interface verification

- [ ] Submit a representative opportunity and verify each response package.
- [ ] Verify the package-switching, calculation, and export interactions.
- [ ] Change initiative volumes in the tuner and confirm the displayed calculation.
- [ ] Test document upload, listing, and deletion with a connected backend.
- [ ] Run a search and verify the result source and displayed metadata.
- [ ] Verify theme controls and relevant responsive layouts.
- [ ] Check keyboard navigation, focus visibility, accessible names, and error/status messaging.

## 4. Browser and viewport coverage

Record the actual browser versions and viewport sizes tested:

| Browser and version | Viewport | Result | Notes |
| --- | --- | --- | --- |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## 5. Delivery record

| Field | Value |
| --- | --- |
| Release revision |  |
| Validation date |  |
| Frontend owner |  |
| Backend owner |  |
| Outstanding issues or limitations |  |
| Client acceptance reference |  |
