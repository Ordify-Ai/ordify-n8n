# n8n-nodes-ordify

n8n community node for Ordify A2A and Jobs APIs.

## Features

- List available crews (`GET /a2a/available`)
- Get crew schema (`GET /a2a/{crew_id}`)
- Execute crew (`POST /a2a/{crew_id}`)
- Get job status (`GET /jobs/{job_id}`)
- Get job result (`GET /jobs/{job_id}/result`)

## Prerequisites

- Ordify API key from:
  - `POST /generate-api-key`
  - `GET /api-keys`
- Backend supports `api-key` auth on `/a2a/*` and `/jobs/*` endpoints.

## Local Development

```bash
cd n8n-nodes-ordify
npm install
npm run build
```

## Install in n8n

### Local package install

```bash
# From your n8n installation environment
npm install /absolute/path/to/n8n-nodes-ordify
```

### npm registry install

```bash
npm install n8n-nodes-ordify
```

## Credentials

Create **Ordify API** credentials in n8n:

- Base URL: `https://r.ordify.ai/` (or your deployment URL)
- API Key: generated from Ordify

## Example Flow

1. Use **Ordify** node with operation **Execute Crew**.
2. Capture returned `job_id`.
3. Use **Ordify** node with operation **Get Job Status** until complete.
4. Use **Ordify** node with operation **Get Job Result**.

## Notes

- This node is designed for asynchronous job execution.
- For best reliability, poll every 3-10 seconds.
