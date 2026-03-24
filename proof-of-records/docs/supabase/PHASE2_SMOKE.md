# Phase 2 Smoke

## 1) Create test client + API key rows

```sql
insert into public.clients_por (name, slug)
values ('Biosphere Test', 'biosphere-test')
on conflict (slug) do update set name = excluded.name
returning id;
```

Pick a plaintext key (example):

```text
por_test_1234567890abcdef.demo_secret_key_001
```

Compute SHA-256 (hex) in Node:

```bash
node -e "const c=require('node:crypto'); const k='por_test_1234567890abcdef.demo_secret_key_001'; console.log(c.createHash('sha256').update(k,'utf8').digest('hex'));"
```

Insert key row:

```sql
insert into public.api_keys_por (
  client_id,
  key_prefix,
  key_hash,
  env,
  is_active,
  quota_per_minute,
  quota_per_day
) values (
  '<CLIENT_UUID>',
  'por_test_1234567890abcdef',
  '<SHA256_HEX>',
  'testnet',
  true,
  2,
  100
);
```

## 2) curl examples (with and without x-api-key)

No key:

```bash
curl -sS -X POST http://localhost:3002/api/proof-json \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/phase1-proofjson-body.json
```

Valid key:

```bash
curl -sS -X POST http://localhost:3002/api/proof-json \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: por_test_1234567890abcdef.demo_secret_key_001' \
  --data-binary @/tmp/phase1-proofjson-body.json
```

## 3) Expected behavior by mode

- `API_KEY_AUTH_MODE=off`
  - Missing key: `200`
  - Invalid key: `200` (request allowed)
- `API_KEY_AUTH_MODE=soft`
  - Missing/invalid key: `200` (request allowed, warning internally)
- `API_KEY_AUTH_MODE=required`
  - Missing key: `401`
  - Invalid key: `401`
  - Valid key: `200`

## 4) 429 rate-limit check (required mode)

With a key configured as `quota_per_minute=2`, call 3 times quickly:

```bash
for i in 1 2 3; do
  curl -i -sS -X POST http://localhost:3002/api/proof-json \
    -H 'Content-Type: application/json' \
    -H 'x-api-key: por_test_1234567890abcdef.demo_secret_key_001' \
    --data-binary @/tmp/phase1-proofjson-body.json | head -n 1
done
```

Expected: third request returns `HTTP/1.1 429` with `Retry-After` header.
