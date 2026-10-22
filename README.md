# AgentDesk: AI support triage

An AI agent reads incoming support tickets, **looks up real customer and order data with tools**,
checks company policy, and drafts a resolution. A human reviews it in a dashboard. Nothing with a
side effect (like a refund) happens until they approve.

![stack](https://img.shields.io/badge/Next.js-14-black) ![stack](https://img.shields.io/badge/NestJS-10-red) ![stack](https://img.shields.io/badge/FastAPI-Python_3.12-009688) ![stack](https://img.shields.io/badge/BullMQ-Redis-DC382D) ![stack](https://img.shields.io/badge/Postgres-16-336791) ![ci](https://img.shields.io/badge/CI-GitHub_Actions-2088FF)

## How it works

```
 inbound webhook / dashboard
            │
            ▼
┌────────────────────┐  enqueue   ┌───────────┐  process   ┌─────────────────────┐
│ NestJS API         │───────────▶│  BullMQ   │───────────▶│ FastAPI agent       │
│ tickets, auth,     │            │  (Redis)  │            │ Claude tool-use loop│
│ approvals, tools   │◀───────────┴───────────┘            └──────────┬──────────┘
└─────────┬──────────┘   result + trace                               │
          │                      ▲  lookup_customer / lookup_order /   │
          ▼                      └──────── search_knowledge_base ──────┘
     Postgres                         (read-only /internal endpoints)
          ▲
          │ poll
┌────────────────────┐
│ Next.js dashboard  │  review draft → edit → approve / reject
└────────────────────┘
```

1. A ticket arrives (`POST /tickets/inbound` with a webhook key, or the dashboard) and a job is queued.
2. A BullMQ worker calls the agent service. Retries use exponential backoff; after 3 failures the ticket is marked `failed`.
3. The agent loops: model → tool calls → results → model, until it calls `submit_resolution`.
4. The ticket lands in **needs review** with category, priority, confidence, a draft reply, an optional proposed refund and the full tool-call trace.
5. A human edits and approves or rejects. Only on approval does the API execute the refund.

## Design decisions worth reading

- **Human in the loop by construction.** The agent has no write tools. It can only *propose* an action; the API executes it after approval.
- **Never trust the model's numbers.** On approval the API re-validates the refund against the database (order exists, status is `delivered`, amount ≤ order total).
- **Grounding guardrail.** The agent service rejects any refund proposal for an order the agent did not actually look up successfully, and validates the output schema with Pydantic. Failures surface as retryable errors.
- **Prompt-injection posture.** Ticket text is wrapped in `<ticket>` tags and declared untrusted; the agent has no destructive capability even if it were fooled. The eval suite includes an injection case.
- **Tool errors are data.** Failed lookups return JSON errors to the model so it can ask the customer for details instead of crashing.
- **Separation of concerns.** The agent service is stateless and has no database access. It reaches data only through narrow, key-protected endpoints.
- **Observable.** Every run stores its tool-call trace, shown in the UI.

## Run it

```bash
cp .env.example .env          # set ANTHROPIC_API_KEY and change the secrets
docker compose up --build
```

Open http://localhost:3000, sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
(defaults `admin@agentdesk.dev` / `admin1234`), click **Simulate inbound ticket**, pick a preset,
and watch the ticket move from *processing* to *needs review*.

Demo data (customers, orders, policies) is seeded on first boot.

### Inbound webhook

```bash
curl -X POST http://localhost:4000/tickets/inbound \
  -H "x-webhook-key: $WEBHOOK_KEY" -H "content-type: application/json" \
  -d '{"customerEmail":"alice@example.com","subject":"Refund","body":"Order ORD-1001 is broken, please refund."}'
```

### Local development

```bash
docker compose -f docker-compose.dev.yml up -d      # postgres + redis only
cd api && npm install && npm run start:dev
cd agent-service && pip install -r requirements.txt pytest && uvicorn app.main:app --reload
cd web && npm install && npm run dev
```

## Tests and evals

```bash
cd agent-service && pytest -q                 # agent loop + guardrails, no API key needed
cd agent-service && python evals/run_evals.py # live labelled tickets against the running stack
```

The unit tests drive the real agent loop with a scripted fake model, covering: happy path,
refund for an un-looked-up order, a failed lookup not grounding a refund, invalid model output,
and the step limit. The eval script runs six labelled tickets (eligible refund, out-of-window refund,
undelivered order, shipping, account, prompt injection) through the live model.

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | none | Staff login, returns JWT |
| POST | `/tickets/inbound` | `x-webhook-key` | Create ticket from external system |
| POST/GET | `/tickets`, `/tickets/:id` | JWT | Create / list / read |
| POST | `/tickets/:id/approve` | JWT | Approve (optionally with edited reply) and run proposed action |
| POST | `/tickets/:id/reject` | JWT | Reject |
| GET | `/internal/*` | `x-internal-key` | Read-only tool endpoints used by the agent |

## Roadmap

- [ ] Replace the demo staff login with a users table and roles
- [ ] Replace polling with Server-Sent Events or WebSockets
- [ ] Migrations instead of TypeORM `synchronize`
- [ ] Auto-resolve high-confidence, action-free tickets
- [ ] Track token usage and cost per ticket
- [ ] Larger eval set with LLM-as-judge scoring for reply quality

## License

MIT
