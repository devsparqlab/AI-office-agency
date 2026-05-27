# Profiles

Optional overlays merge into `office.config.yaml` at runtime. See `docs/config-profile-merge-contract.md`.

```bash
./ai-dev-office/run-agent.sh --profile generic TASK-001 pm
OFFICE_PROFILE=games-labs ./ai-dev-office/run-agent.sh TASK-001 reviewer
```

## Included profiles

| Profile | Use when |
|---------|----------|
| [generic.yaml](generic.yaml) | Non-Go or neutral projects; dependency guard off |
| [go-microservice.yaml](go-microservice.yaml) | Go services without monorepo guard scripts |
| [games-labs.yaml](games-labs.yaml) | Games Lab Go monorepo — see [games-labs.md](games-labs.md) |
| [frontend-nextjs.yaml](frontend-nextjs.yaml) | Next.js frontend |
| [frontend-nuxt.yaml](frontend-nuxt.yaml) | Nuxt frontend |

Start with `generic` unless a more specific overlay is clearly needed.

Local overrides: `profiles/<name>.local.yaml` (gitignored).
