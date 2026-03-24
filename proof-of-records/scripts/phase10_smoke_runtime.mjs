import { POST as proofJsonPost } from "../app/api/proof-json/route.ts";
import { POST as verifyRowPost } from "../app/api/verify-row/route.ts";

async function parseJsonResponse(response) {
  return response.json();
}

const batchPayload = {
  project_context: {
    project_name: "Batch Demo",
    process_type: "Waste traceability",
    description: "Batch smoke test",
  },
  records: [
    { date: "2026-02-21T00:00:00.000Z", type: "plastic", value: 5, unit: "kg" },
    { date: "2026-02-22T00:00:00.000Z", type: "plastic", value: 7, unit: "kg" },
  ],
};

const merklePayload = {
  ...batchPayload,
  project_context: {
    project_name: "Merkle Demo",
    process_type: "Waste traceability",
    description: "Merkle smoke test",
  },
  proof_units_mode: "merkle",
};

const batchResponse = await proofJsonPost(
  new Request("http://localhost/api/proof-json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batchPayload),
  })
);
const batchJson = await parseJsonResponse(batchResponse);

const merkleResponse = await proofJsonPost(
  new Request("http://localhost/api/proof-json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(merklePayload),
  })
);
const merkleJson = await parseJsonResponse(merkleResponse);

const firstLeaf = merkleJson.merkle.leaves[0];
const normalizedRow = merklePayload.records[0];

const verifyValidResponse = await verifyRowPost(
  new Request("http://localhost/api/verify-row", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      row: normalizedRow,
      row_index: firstLeaf.index,
      proof: firstLeaf.proof,
      expected_root: merkleJson.merkle.root,
    }),
  })
);
const verifyValidJson = await parseJsonResponse(verifyValidResponse);

const badProof = [...firstLeaf.proof];
if (badProof.length > 0) {
  const lastChar = badProof[0].slice(-1);
  badProof[0] = `${badProof[0].slice(0, -1)}${lastChar === "0" ? "1" : "0"}`;
}

const verifyInvalidResponse = await verifyRowPost(
  new Request("http://localhost/api/verify-row", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      row: normalizedRow,
      row_index: firstLeaf.index,
      proof: badProof,
      expected_root: merkleJson.merkle.root,
    }),
  })
);
const verifyInvalidJson = await parseJsonResponse(verifyInvalidResponse);

console.log(
  JSON.stringify(
    {
      batch: {
        ok: batchJson.ok,
        proof_units_mode: batchJson.proof_units_mode ?? "batch",
        has_merkle: Boolean(batchJson.merkle),
      },
      merkle: {
        ok: merkleJson.ok,
        proof_units_mode: merkleJson.proof_units_mode,
        root: merkleJson.merkle?.root ?? null,
        leaf_count: merkleJson.merkle?.leaf_count ?? null,
        leaves_count: Array.isArray(merkleJson.merkle?.leaves) ? merkleJson.merkle.leaves.length : 0,
        has_object_id: Boolean(merkleJson.object_id),
        has_tx_digest: Boolean(merkleJson.tx_digest),
      },
      verify_row_valid: verifyValidJson,
      verify_row_invalid: verifyInvalidJson,
    },
    null,
    2
  )
);
