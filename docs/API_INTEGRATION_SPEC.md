# API Integration Specification

The backend endpoints this frontend calls, grouped by page. The backend's Low-Level Design (`social-value-infoproj/docs/LOW_LEVEL_DESIGN_DOCUMENT_LLD.md`) is the authoritative specification, including request and response shapes for `/generator/run`.

## Connection details

- **Base URL:** resolved in [`src/api/client.ts`](../src/api/client.ts): `/api-proxy` in development (forwarded by Vite), otherwise `VITE_API_URL`, otherwise the Render backend for a deployed site.
- **Authentication:** every call except `/health`, `/auth/login` and `/auth/status` sends `Authorization: Bearer <JWT>`. A 401 returns the user to the sign-in screen.
- **Content types:** JSON, except `multipart/form-data` for `/documents/ingest` and `/generator/extract`.
- **Errors:** the backend returns `{"detail": "<reason>"}`; the frontend shows the reason.
- **CORS:** when frontend and backend origins differ, the backend's `CORS_ORIGINS` must include the frontend.

## Endpoints

| Area | Method and path | Used for |
| --- | --- | --- |
| Sign-in | `POST /auth/login`, `GET /auth/me`, `GET /auth/status` | Sign-in and current user |
| Users | `POST /auth/register` | Creating a user (superadmin) |
| Initiative Generator | `GET /generator/options`, `GET /generator/knowledge` | Form choices; track record, measures, MAC map, partners, documents |
| | `POST /generator/parse` | Reading the tender sentence into the form (no AI) |
| | `POST /generator/extract`, `GET /generator/documents/{id}/text` | Text of an uploaded buyer document, or of a repository document |
| | `POST /generator/run` | Generating, valuing and checking initiatives; the result includes `model` |
| | `GET/POST /generator/runs`, `GET/PUT/DELETE /generator/runs/{id}` | Saved runs under "Recent tenders" |
| AI model | `GET/PUT /admin/ai` | AI model card in diagnostics (superadmin) |
| Repository | `GET /documents`, `POST /documents/ingest`, `DELETE /documents/{id}`, `POST /documents/{id}/restore`, `GET /documents/{id}/chunks` | Past bid documents |
| Evidence Search | `POST /search` | Searching past bid passages |
| TOMs Catalog | `GET/POST /calculations/metrics`, `PUT/DELETE /calculations/metrics/{code}`, `POST /calculations/reset-defaults` | Measure catalogue |
| Regional Partners | `GET/POST /calculations/partners`, `PUT/DELETE /calculations/partners/{id}` | Partner list |
| Value Tuner | `GET /calculations/initiatives`, `POST /calculations/package`, `POST /calculations/recommend` | What-if values |
| Diagnostics | `GET /health`, `GET /audit/logs`, `GET /audit/summary` | System health and audit log |

The `/responses/*` calls belong to the earlier prompt-based builder and are not used by the Initiative Generator.

## Local fallback behaviour

Some older calls (TOMs Catalog, Value Tuner, Regional Partners) fall back to sample data shipped with the frontend when the backend cannot be reached. That data is illustrative: never present it as evidence, approved partners or official TOM values. The Initiative Generator has no such fallback: if the backend or every AI provider is unavailable, it shows the error.

## Related documentation

- [Developer quickstart](./DEVELOPER_QUICKSTART.md)
- [Developer onboarding guide](./DEVELOPER_ONBOARDING_GUIDE.md)
- [TypeScript API models](../src/types/index.ts) and [`src/api/generator.ts`](../src/api/generator.ts)
