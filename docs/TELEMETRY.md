# Real-device telemetry

Forge measures what browser emulation cannot prove: real viewport/DPR combinations, coarse hardware hints, sustained frame rate, slow frames, Web Vitals candidates, long tasks and WebGL status.

Analytics mode displays a consent control and respects stored denial. `respectDnt` prevents collection when the browser sends Do Not Track. Essential mode is available only for deployments whose legal and privacy requirements permit performance monitoring without an analytics choice.

Payloads contain a random per-page session UUID, project ID, page path, coarse device values and numeric performance measurements. They do not contain names, email addresses, advertising identifiers or raw user-agent strings. The ingestion route validates every field, caps request size and rate-limits individual session IDs.

Set `FORGE_TELEMETRY_WEBHOOK_URL` to an owned HTTPS ingestion service for durable aggregate reporting. Without a webhook, validated events are emitted as structured server logs. Studio displays the most recent samples saved locally on the current device; it is not an aggregate analytics database.


## Certification loop

Studio aggregates validated local events into a release-confidence summary: session count, median and p95 FPS, slow-frame rate, WebGL failures and quality distribution. A release is marked pass only when observed median FPS meets the Forge target and no WebGL failure events are present. This is a directional gate, not a substitute for testing the exact target-device matrix; durable fleet aggregation still belongs in the configured HTTPS webhook.
