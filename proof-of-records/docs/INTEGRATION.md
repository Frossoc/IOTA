# Integration

## JSON-first Proof API (`/api/proof-json`)

Use this route when your app already has normalized records and wants to generate/anchor a proof without uploading Excel.

### Request

- Method: `POST`
- URL: `/api/proof-json`
- Content-Type: `application/json`

```bash
curl -sS -X POST http://localhost:3000/api/proof-json \
  -H 'Content-Type: application/json' \
  -d '{
    "project_context": {
      "project_name": "Bios Rocks Pilot",
      "process_type": "Waste traceability",
      "description": "Monthly plastics batch"
    },
    "records": [
      {
        "date": "2026-02-21T00:00:00.000Z",
        "type": "plastic",
        "value": 5,
        "unit": "kg",
        "site": "Site A"
      },
      {
        "date": "2026-02-22T00:00:00.000Z",
        "type": "plastic",
        "value": 7,
        "unit": "kg",
        "operator": "Ops Team"
      }
    ]
  }'
```

### Optional evidence

To include photo evidence in the canonical payload, send:

- `evidence.photo_base64`
- optional `evidence.filename`
- optional `evidence.content_type`

When evidence is provided, `PINATA_JWT` is required.

### Response

Returns the same `ProofResponse` shape as `/api/proof`, including optional on-chain fields (`tx_digest`, `object_id`, `explorer`) when anchoring is enabled.
