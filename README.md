# Proof of Records — Hackathon Project

This repository contains multiple projects.
The hackathon submission is located in:

`/proof-of-records`

## Quick Start

```bash
git clone https://github.com/Frossoc/IOTA.git
cd IOTA/proof-of-records
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## What To Review

Primary product routes:

- `/`
- `/upload`
- `/verify`
- `/dashboard`

Public proof route:

- `/proof/[id]`

## Notes

- The project uses environment variables documented in `/proof-of-records/.env.example`
- The intended demo network is `testnet`
- Do not commit real `.env.local` values
