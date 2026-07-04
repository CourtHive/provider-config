# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mentat Orchestration (READ FIRST)

Before doing anything else, read `../Mentat/CLAUDE.md`, `../Mentat/TASKS.md`, `../Mentat/standards/coding-standards.md`, and every file in `../Mentat/in-flight/`. Mentat is the orchestration layer for the entire CourtHive ecosystem; its standards override per-repo conventions when they conflict. If you are about to start **building** (not just planning), you must claim a surface in `../Mentat/in-flight/` and run the air-traffic-control conflict check first. See the parent `../CLAUDE.md` "Mentat Orchestration" section for the full protocol.

## Project Overview

`@courthive/provider-config` is the canonical, pure-TypeScript source of truth for CourtHive provider configuration. It defines the config types (capabilities/permissions, branding, participant-privacy, scoring-launch, defaults, policies), the merge that turns a two-tier config into an effective config, structural + caps-respect validators, and the mutation-gating map.

**No runtime dependencies.** It ships types, constants, and pure functions only — no URLs, no fetch, no server awareness (URL template substitution is the sole "network-adjacent" concern, and it is pure string work). This keeps it safe to import from every consumer:

- `TMX` — runtime `providerConfig` singleton, mutation gating, branding + participant-privacy application
- `competition-factory-server` — server-side validation, executionQueue permission gating
- `competition-factory-server/admin-client` and the `courthive-ams` console — caps + settings editor UIs

The full design rationale, field-ownership matrix, and merge rules live in `../Mentat/planning/TMX_PROVIDER_CONFIG_FEATURES.md`.

## Commands

```bash
pnpm install              # Install dependencies (pnpm only)
pnpm build                # rm -rf dist && tsc → dist/
pnpm check-types          # TypeScript type check (tsc --noEmit)
pnpm test                 # Vitest single run (vitest --run)
pnpm lint                 # ESLint (eslint src --max-warnings 0)
pnpm format               # Prettier on src/**/*.ts
```

`pnpm build` runs a plain `tsc` (no bundler) — output is `dist/index.js` + `dist/index.d.ts`, published as CommonJS-consumable ESM per `package.json` `exports`.

## Architecture

The public surface is re-exported from `src/index.ts`. Source is small and flat:

```
src/
  index.ts                -- single public entry point; re-exports everything
  types.ts                -- canonical interfaces, key unions, and KEYS constants
  effective-config.ts     -- computeEffectiveConfig + mergePermissions/mergePolicies + resolvers
  scoring-launch.ts       -- ScoringLaunch constants + resolveScoringLaunchUrl (pure substitution)
  mutation-permissions.ts -- MUTATION_PERMISSIONS map + isMutationAllowed predicate
  validators.ts           -- validateCaps / validateSettings (structural + caps-respect)
```

### Two-tier config + caps ∩ settings model

Provider config is split by owner:

- **`ProviderConfigCaps`** (provisioner-owned) — the ceiling: branding defaults, permission ceilings, allowed universes, integrations.
- **`ProviderConfigSettings`** (provider-admin-owned) — tuning within the ceiling: may disable booleans caps allow, may narrow `allowedX` arrays, owns operational policies, defaults, branding overrides, and participant privacy.
- **`ProviderConfigData`** (effective) — what TMX consumes; it never sees the split.

`computeEffectiveConfig(caps, settings)` performs the merge:

- **Booleans**: `(caps[X] ?? default) && (settings[X] ?? default)` — both tiers must allow. Most permissions default `true`; the exceptions in `PERMISSIONS_DEFAULT_FALSE` default `false`.
- **`allowedX` arrays**: intersection, where an empty/absent array on either side means "unrestricted".
- **Branding**: settings overrides caps field-by-field; `themeTokens` merge key-by-key (settings token wins on collision). No lock tier — caps.branding is a fallback, not a ceiling.
- **Ownership**: `integrations` = caps-owned; `defaults`, operational policies, `participantPrivacy`, and `participantPrivacyPolicy` = settings-owned.

`validateSettings(settings, caps)` mirrors the same model as `exceedsCap` issues: it rejects a settings write that enables a boolean the cap forbids or lists an `allowedX` value outside the cap's universe. `validateCaps(caps)` is structural only. Both are pure and return `ValidationIssue[]` — they never throw.

When adding a new permission or config field, update it in the matching places or writes get rejected / merges no-op: the interface in `types.ts`, the relevant KEY constant (`BOOLEAN_PERMISSION_KEYS` / `ARRAY_PERMISSION_KEYS` / `ARRAY_POLICY_KEYS`), the allowed-key sets in `validators.ts`, and (if the field is a permission ceiling) `CappablePermissionKey`. A new gate-worthy mutation goes in `MUTATION_PERMISSIONS`.

## Code Style

- **Package manager**: pnpm only — never `npm install` in this repo.
- **Module/target**: TypeScript compiled with `tsc`; Node `>=20`.
- **Commits**: Conventional Commits (commitlint + husky pre-commit via lint-staged run ESLint + Prettier).
- **Imports**: sort longest-first (ecosystem-wide convention; lint does not auto-fix this).
- **Lint discipline**: zero warnings (`--max-warnings 0`) — fix all before commit.
- **Purity**: keep the package free of runtime dependencies and server/URL awareness.
- **No AI attribution** in commits, PRs, or source — see the parent `../CLAUDE.md` directive.

## Ecosystem Standards

This repo follows CourtHive ecosystem coding standards documented in the Mentat orchestration repo at `../Mentat/standards/coding-standards.md`, which override per-repo conventions when they conflict.
