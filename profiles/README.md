# Profiles

Profiles are optional overlays for the portable AI Dev Office framework.

Use the config/profile merge contract in `docs/config-profile-merge-contract.md` to select a profile and layer it on top of `office.config.yaml`.

## Included Profiles

- `generic.yaml`: default profile for non-Go projects
- `go-microservice.yaml`: Go projects that use shared dependency alignment
- `games-labs.yaml`: current Games Labs workspace overlay
- `frontend-nextjs.yaml`: Next.js frontend projects
- `frontend-nuxt.yaml`: Nuxt frontend projects

## Practical Rule

Start with `generic.yaml` unless the target project has a clear reason to use a more specific overlay.
