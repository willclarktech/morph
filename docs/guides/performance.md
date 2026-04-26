# Performance Notes

This page collects what we know about running generated apps at scale. We have not benchmarked Morph end-to-end yet — treat numbers as informed estimates, not measurements.

## Storage backends

The choice of `<APP>_STORAGE` dominates latency for entity-heavy workloads.

| Backend | Latency profile | Persistence | Concurrent writers |
|---------|-----------------|-------------|---------------------|
| `memory` | sub-microsecond | none (lost on restart) | single process |
| `jsonfile` | full file rewrite per save | yes, on disk | single process |
| `sqlite` | typical SQL latencies; bun:sqlite is in-process | yes | single process unless WAL |
| `redis` | network round-trip per op | yes | many |
| `eventsourced` | replay from event store on read | yes | depends on event store |

Reach for `sqlite` for single-instance deployments, `redis` (or another networked store) once you horizontally scale.

`jsonfile` is intended for development only — it rewrites the entire file on every save. Don't ship it.

## Event store growth

The event store grows monotonically; nothing prunes old events by default. For long-lived deployments:

- Pick the right backend up front (`memory` for tests, `jsonfile` for dev, `redis` for production).
- If you build subscribers that replay history on cold start, expect that replay to lengthen as the store grows. Snapshot patterns aren't generated yet — you'd build them in `impls/`.

## SSE and streaming

Generated APIs expose Server-Sent Events for any operation that emits domain events. SSE is a long-lived HTTP connection — sit it behind a reverse proxy that supports streaming (nginx, Caddy, Cloudflare with the right settings).

For multi-instance deployments, the in-memory event emitter doesn't fan out across nodes. The `redis` event-store option uses Redis pub/sub for cross-instance broadcast, which is the right backend for >1 process.

## Generation time

Generation is mechanical and fast — a 100-operation schema regenerates in seconds. The slow steps in `regenerate:morph` are TypeScript compilation and prettier, not Morph itself.

If you find generation taking >30s for a normal-sized schema, file a bug.

## What we haven't measured

- Real-world throughput numbers per backend.
- Memory footprint of a generated app at idle vs. under load.
- Effect runtime overhead — Morph leans on Effect for handler composition and DI; the cost is small but non-zero.
- Cold-start times for serverless deployments.
- SSE connection scaling beyond a few hundred concurrent clients.

If you benchmark anything in this list, please open an issue with the methodology and numbers — we'll fold it in.
