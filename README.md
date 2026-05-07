# @courthive/provider-config

Canonical types, KEYS, validators, `computeEffectiveConfig`, and
`MUTATION_PERMISSIONS` for CourtHive provider configuration.

Pure TypeScript, no runtime dependencies. Consumed by:

- `competition-factory-server` — server-side validation, executionQueue gating
- `competition-factory-server/admin-client` — caps + settings editors
- `TMX` — runtime singleton, mutation gating

## Two-tier provider config model

- `ProviderConfigCaps` — provisioner-owned: white-label, permission ceilings, allowed universes
- `ProviderConfigSettings` — provider-admin-owned: may-disable, narrowing, operational policy + defaults
- `ProviderConfigData` — effective shape, computed by `computeEffectiveConfig(caps, settings)`

## Exports

```ts
import {
  // Types
  type ProviderConfigCaps,
  type ProviderConfigSettings,
  type ProviderConfigData,
  type ProviderPermissions,
  type ProviderBranding,
  type ValidationIssue,
  // KEYS
  BOOLEAN_PERMISSION_KEYS,
  ARRAY_PERMISSION_KEYS,
  PERMISSIONS_DEFAULT_FALSE,
  // Functions
  computeEffectiveConfig,
  validateCaps,
  validateSettings,
  // Mutation gate
  MUTATION_PERMISSIONS,
  isMutationAllowed,
} from '@courthive/provider-config';
```

See `Mentat/planning/TMX_PROVIDER_CONFIG_FEATURES.md` for the full
design rationale, the field-ownership matrix, and the merge rules.

## Build / test

```bash
pnpm build         # tsc → dist/
pnpm test          # vitest --run
pnpm check-types   # tsc --noEmit
```

## License

MIT
