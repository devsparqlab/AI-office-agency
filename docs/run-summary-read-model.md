# Review Read Model

Read-only projection that powers the dashboard Review layer (Slice 1).

## Principle

The dashboard **renders** signals; it does **not** infer them. Every field is a
projection of a field that a producer emits under a schema contract. Anything
that could only be derived from free-form prose (summaries, error reasons,
review text) is intentionally **excluded** until a producer emits it as a
contracted signal (a later slice).

## Source of truth

| Read-model field | Provenance | Contract |
|---|---|---|
| `phase` | `runs/<id>/status.yaml` → `phase` | [status.schema.yaml](../schemas/status.schema.yaml) enum |
| `verdict` | `runs/<id>/reviewer-output.yaml` → `review_verdict` | [reviewer-output.schema.yaml](../schemas/reviewer-output.schema.yaml) enum |
| `lastReviewedAt` | `status.yaml` → `updated_at` (only when a reviewer-output exists) | — |

Values that don't match the enum **exactly** are dropped to `null` — no
substring/fuzzy matching, no guessing. A typo or a future enum value never
leaks through as a real signal.

## Derived fields (projections, not inference)

- `inReviewQueue` = `phase ∈ {review, in_review}`
- `verdictNeedsAttention` = `verdict ∈ {changes_requested, escalate, infra_failure}`
- `needsReview` = `inReviewQueue || verdictNeedsAttention`

The queue rule (`needsReview`) is **server-owned**, so the client never
re-derives it. Output shape: [run-summary.schema.yaml](../schemas/run-summary.schema.yaml).

## API

`GET /api/review` → `ReviewModelResponse` (read-only):

```json
{
  "generatedAt": "<iso>",
  "total": 81,
  "needsReviewCount": 4,
  "reviews": [ /* ReviewSummary[], needsReview first */ ]
}
```

## Not in scope (later slices)

- Risk / confidence panels — need a producer contract first (Slice 2).
- Human decisions / approve (`decision.yaml`) — write-back is Slice 4; the read
  model stays strictly read-only.
