# Phase 1 Smoke Checks (Supabase persistence)

## A) Baseline (Supabase env missing or disabled)

Expected:
- endpoint returns `ok: true`
- anchoring still works
- `proof_db_id` is omitted/null
- `warnings` includes `supabase_persist_failed`

```bash
curl -sS -X POST http://localhost:3002/api/proof \
  -F 'file=@tmp-test.xlsx' \
  -F 'mapping={"date":"date","type":"type","value":"value","unit":"unit"}'

curl -sS -X POST http://localhost:3002/api/proof-json \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/phase1-proofjson-body.json
```

## B) Supabase env configured

Set server env (or `.env.local`) and restart Next.js:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional `SUPABASE_SCHEMA` (default `public`)

Expected:
- endpoint returns `ok: true`
- `proof_db_id` is present (uuid)
- no `supabase_persist_failed` warning

```bash
curl -sS -X POST http://localhost:3002/api/proof-json \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/phase1-proofjson-body.json > /tmp/phase1-proofjson-with-db.json

node -e "
const fs=require('fs');
const r=JSON.parse(fs.readFileSync('/tmp/phase1-proofjson-with-db.json','utf8'));
console.log(JSON.stringify({
  ok:r.ok,
  proof_db_id:r.proof_db_id || null,
  warnings:r.warnings || []
},null,2));
if(!(typeof r.proof_db_id==='string' && r.proof_db_id.length>0)) process.exit(2);
"
```
