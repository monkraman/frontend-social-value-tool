# API Integration Specification

This document describes the HTTP endpoints and payloads consumed by the frontend API client in [`src/api/client.ts`](../src/api/client.ts). It is a frontend integration reference, not a substitute for the backend's authoritative API specification.

Confirm endpoint behavior, validation, authentication, and production data sources against the deployed backend before relying on an integration.

## Connection details

- **Current base URL:** `http://127.0.0.1:8000`
- **Configuration:** The URL is hard-coded in `src/api/client.ts`; the frontend does not currently read `VITE_API_URL` or another environment variable.
- **Content types:** JSON for request and response generation, package calculation, and search; multipart form data for document ingestion.
- **Cross-origin access:** When frontend and backend origins differ, the backend must allow the frontend origin through its CORS configuration.

## Endpoints used by the frontend

### Health check

`GET /health`

The response is used to report whether the backend is reachable. The frontend accepts any successful HTTP response and does not validate a particular response schema.

### Generate response packages

`POST /responses/generate`

Request body (`OpportunityRequest`):

```json
{
  "client": "Example Council",
  "location": "Example City",
  "contract_value_gbp": 10000000,
  "contract_duration_years": 3,
  "social_value_weighting_percent": 10,
  "priorities": ["Digital inclusion", "Youth employment"],
  "top_k": 5
}
```

The frontend expects a `ResponseGenerationResult` containing an opportunity summary, `core_package`, `enhanced_package`, `localised_package`, `assumptions`, `validation_required`, and `retrieved_evidence_chunks`. Each package includes initiatives and may include a financial calculation. Refer to [`src/types/index.ts`](../src/types/index.ts) for the current TypeScript model.

The frontend marks a successful HTTP response as non-mock. This flag does not independently verify the provenance, correctness, or approval status of backend data.

### List documents

`GET /documents`

Returns an array of `DocumentItem` values. The frontend uses the document ID, filename, type, creation timestamp, chunk count, and optional metadata.

### Ingest a document

`POST /documents/ingest`

Send `multipart/form-data` with a `file` field containing the selected file. The frontend displays the returned `message` when present. The backend is responsible for file validation, storage, processing, and any ingestion errors.

### Delete a document

`DELETE /documents/{id}`

The frontend treats a successful HTTP status as deletion success. The backend should return a non-success status when it cannot delete the requested document.

### List calculation metrics

`GET /calculations/metrics`

Returns an array of `TOMsMetric` values, including a code, name, theme, unit, unit value in GBP, and description. Values shown by the local fallback are illustrative and must not be treated as an approved rate card.

### Calculate a package

`POST /calculations/package`

Request body:

```json
{
  "package_name": "Interactive Custom Model",
  "contract_value_gbp": 10000000,
  "duration_years": 3,
  "target_weighting_percent": 10,
  "initiatives": [
    {
      "initiative_name": "Digital skills workshops",
      "toms_code": "NT8",
      "annual_volume": 12
    }
  ]
}
```

The frontend expects a `PackageCalculation` response. The request field names above reflect the payload sent by the current frontend client.

### Search evidence

`POST /search`

Request body:

```json
{
  "query": "digital inclusion initiatives",
  "top_k": 4
}
```

The frontend expects a `SearchResponse` with the query, total result count, and results containing a chunk ID, similarity, content, filename, and document ID.

## Local fallback behavior and limitations

The API client catches request failures, including unsuccessful HTTP responses, and several methods substitute local demonstration data. Specifically:

- Response generation, document listing, metric listing, package calculation, and search have local fallback behavior.
- Upload can return a simulated success message.
- Delete reports failure for a non-success HTTP response but treats a network failure as success.

These fallbacks are not backend responses and do not persist document changes. Some fallback records and search results are hard-coded examples. Do not use them as verified evidence, compliance statements, approved partner information, or official TOMs values.

## Related documentation

- [Developer quickstart](./DEVELOPER_QUICKSTART.md)
- [Developer onboarding guide](./DEVELOPER_ONBOARDING_GUIDE.md)
- [TypeScript API models](../src/types/index.ts)
