# @courthive/provider-config

Canonical types, KEYS, validators, `computeEffectiveConfig`, and
`MUTATION_PERMISSIONS` for CourtHive provider configuration.

Pure TypeScript, no runtime dependencies. Part of the
[CourtHive](https://github.com/CourtHive) ecosystem.

Consumed by:

- `competition-factory-server` — server-side validation, executionQueue gating
- `competition-factory-server/admin-client` — caps + settings editors
- `courthive-ams` console — provider caps/settings management UI
- `TMX` — runtime singleton, mutation gating, branding + privacy application

## Install

```bash
pnpm add @courthive/provider-config
```

Inside the CourtHive monorepo this package is pnpm-only — local sibling
links resolved via `pnpm.overrides` won't survive an `npm install`.

## Two-tier provider config model

Provider configuration is split into two owner tiers plus a computed
effective shape:

- **`ProviderConfigCaps`** — provisioner-owned. The ceiling a provider
  cannot exceed: white-label branding defaults, permission ceilings,
  allowed universes (draw types, categories, tier systems), and
  integrations (SSO, scoring launch).
- **`ProviderConfigSettings`** — provider-admin-owned. Day-to-day tuning
  within the cap ceiling: may disable booleans that caps allow, may
  narrow `allowedX` arrays, and owns operational policies, defaults,
  branding overrides, and participant privacy entirely.
- **`ProviderConfigData`** — the effective shape TMX consumes, produced
  by `computeEffectiveConfig(caps, settings)`. TMX has no awareness of
  the caps/settings split — it only ever sees the merged result.

The permission-cap override model is a **cap ∩ settings intersection**:
a boolean is enabled in the effective config only when _both_ tiers
allow it, and an `allowedX` universe is intersected across both tiers.
See "Effective-config computation" below.

## Exports

Everything is exported from the package root (`./dist/index.js`,
types at `./dist/index.d.ts`).

### Types

| Export                                                                | Purpose                                                                                                                 |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ProviderConfigCaps`                                                  | Provisioner-owned ceiling (branding, permissions, policies, integrations)                                               |
| `ProviderConfigSettings`                                              | Provider-admin-owned settings (permissions, policies, defaults, branding, participantPrivacy, participantPrivacyPolicy) |
| `ProviderConfigData`                                                  | Computed effective shape delivered to TMX                                                                               |
| `ProviderBranding`                                                    | White-label branding fields                                                                                             |
| `ProviderPermissions`                                                 | Full permission surface (booleans + allowed arrays)                                                                     |
| `ProviderCapsPermissions`                                             | `Pick` of `ProviderPermissions` limited to cappable keys                                                                |
| `ProviderCapsPolicies`                                                | Caps-tier allowed universes (formats, categories, tier systems)                                                         |
| `ProviderPolicyDefaults`                                              | Settings-tier operational policies + allowed lists                                                                      |
| `ProviderDefaults`                                                    | New-entity defaults (event type, draw type, language, PDF font, ...)                                                    |
| `ProviderIntegrations`                                                | SSO provider + scoring-launch config                                                                                    |
| `ProviderParticipantPrivacy`                                          | Granular privacy toggles (currently `cityState`)                                                                        |
| `ProviderBranding`, `AllowedCategory`, `AllowedTierSystem`            | Sub-types shared across tiers                                                                                           |
| `RankingPointsPolicy`, `RankingPointsPolicyKind`                      | Ranking-points policy classifier                                                                                        |
| `PrintPoliciesByType`                                                 | Opaque per-print-type pdf-factory composition policies                                                                  |
| `ScoringLaunchConfig`, `ScoringLaunchApp`                             | Scoring-app launch target                                                                                               |
| `ScoringLaunchContext`                                                | Placeholder values for URL substitution                                                                                 |
| `BooleanPermissionKey`, `ArrayPermissionKey`, `CappablePermissionKey` | Permission-key unions                                                                                                   |
| `ValidationIssue`, `ValidationIssueCode`                              | Validator result shape                                                                                                  |

### Constants

| Export                        | Value / purpose                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `BOOLEAN_PERMISSION_KEYS`     | Ordered list of all boolean permission keys                                                         |
| `ARRAY_PERMISSION_KEYS`       | `allowedDrawTypes`, `allowedCreationMethods`, `allowedScoringApproaches`                            |
| `ARRAY_POLICY_KEYS`           | `allowedMatchUpFormats`, `allowedCategories`, `allowedTierSystems`                                  |
| `PERMISSIONS_DEFAULT_FALSE`   | `Set` of permissions that default to `false` (`canModifyCompletedScores`, `canAccessProviderAdmin`) |
| `RANKING_POINTS_POLICY_KINDS` | `['BASIC', 'CUSTOM', 'NATIONAL']`                                                                   |
| `SCORING_LAUNCH_APPS`         | `['EPIXODIC', 'EMBEDDED', 'EXTERNAL']`                                                              |
| `SCORING_LAUNCH_PLACEHOLDERS` | `['tournamentId', 'matchUpId', 'eventId', 'drawId']`                                                |
| `DEFAULT_SCORING_LAUNCH`      | `{ app: 'EPIXODIC' }`                                                                               |
| `MUTATION_PERMISSIONS`        | Map of factory mutation method → `keyof ProviderPermissions`                                        |

### Functions

| Export                       | Signature                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `computeEffectiveConfig`     | `(caps?: ProviderConfigCaps, settings?: ProviderConfigSettings) => ProviderConfigData`                           |
| `mergePermissions`           | `(caps?: Partial<ProviderPermissions>, settings?: Partial<ProviderPermissions>) => ProviderPermissions`          |
| `mergePolicies`              | `(caps?: Partial<ProviderPolicyDefaults>, settings?: Partial<ProviderPolicyDefaults>) => ProviderPolicyDefaults` |
| `resolveRankingPointsPolicy` | `(settings?: Partial<ProviderPolicyDefaults>) => RankingPointsPolicy`                                            |
| `validateCaps`               | `(caps: unknown) => ValidationIssue[]`                                                                           |
| `validateSettings`           | `(settings: unknown, caps?: ProviderConfigCaps) => ValidationIssue[]`                                            |
| `isMutationAllowed`          | `(method: string, permissions?: ProviderPermissions) => boolean`                                                 |
| `resolveScoringLaunchUrl`    | `(urlTemplate: string, ctx: ScoringLaunchContext) => string`                                                     |
| `scoringLaunchPlaceholders`  | `(urlTemplate: string) => string[]`                                                                              |

> Note: `computeEffectiveConfig` calls into `mergeBranding` internally,
> but `mergeBranding` is not exported from the package root — its
> field-by-field / token-merge behaviour is documented below as part
> of `computeEffectiveConfig`.

```ts
import {
  // Types
  type ProviderConfigCaps,
  type ProviderConfigSettings,
  type ProviderConfigData,
  type ProviderPermissions,
  type ProviderBranding,
  type ScoringLaunchConfig,
  type ValidationIssue,
  // KEYS + constants
  BOOLEAN_PERMISSION_KEYS,
  ARRAY_PERMISSION_KEYS,
  PERMISSIONS_DEFAULT_FALSE,
  SCORING_LAUNCH_APPS,
  DEFAULT_SCORING_LAUNCH,
  // Functions
  computeEffectiveConfig,
  mergePermissions,
  mergePolicies,
  resolveRankingPointsPolicy,
  resolveScoringLaunchUrl,
  validateCaps,
  validateSettings,
  // Mutation gate
  MUTATION_PERMISSIONS,
  isMutationAllowed,
} from '@courthive/provider-config';
```

## Types

### `ProviderBranding`

White-label branding, applied by TMX at boot and on provider switch.
All fields optional.

| Field              | Type                     | Purpose                                                                                                                  |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `navbarLogoUrl`    | `string`                 | URL or data-URI for the navbar logo (replaces "TMX" text)                                                                |
| `navbarLogoAlt`    | `string`                 | Alt text for the navbar logo                                                                                             |
| `navbarLogoHeight` | `number`                 | Max navbar-logo height in px (default 32)                                                                                |
| `splashLogoUrl`    | `string`                 | URL/data-URI for the splash/login logo (replaces the CourtHive hex)                                                      |
| `appName`          | `string`                 | App name in page title + nav bar (default "TMX")                                                                         |
| `accentColor`      | `string`                 | Accent color override (CSS color value)                                                                                  |
| `themeTokens`      | `Record<string, string>` | Per-token CSS custom-property overrides applied to `document.documentElement`. Keys must start with `--tmx-` or `--chc-` |
| `stylesheetUrl`    | `string`                 | URL to a provider-hosted stylesheet appended to `<head>` (escape hatch beyond `themeTokens`)                             |

### `ProviderPermissions`

Full permission surface. Boolean fields plus three `allowedX` string
arrays. Most booleans default to `true` (permissive); the exceptions
listed in `PERMISSIONS_DEFAULT_FALSE` default to `false`.

Boolean keys (grouped by area):

- **Participants** — `canCreateCompetitors`, `canCreateOfficials`, `canDeleteParticipants`, `canImportParticipants`, `canEditParticipantDetails`
- **Events** — `canCreateEvents`, `canDeleteEvents`, `canModifyEventFormat`
- **Draws** — `canCreateDraws`, `canDeleteDraws`, `canUseDraftPositioning`, `canUseManualPositioning`
- **Scheduling** — `canModifySchedule`, `canUseBulkScheduling`
- **Venues** — `canCreateVenues`, `canDeleteVenues`, `canModifyCourtAvailability`
- **Scoring** — `canEnterScores`, `canModifyCompletedScores` (default `false`)
- **Publishing** — `canPublish`, `canUnpublish`
- **Settings** — `canModifyTournamentDetails`, `canModifyPolicies`, `canAccessProviderAdmin` (default `false`)
- **Communication** — `canUseChat` (tournament chat; defaults to `true`, a provider may set it `false` to disable chat across its tournaments)

Array keys: `allowedDrawTypes`, `allowedCreationMethods`,
`allowedScoringApproaches`. An empty array means "unrestricted".

### `ProviderParticipantPrivacy` and `participantPrivacyPolicy`

Two provider-admin-owned (settings tier only — the provisioner has no
say) surfaces for participant privacy:

- **`participantPrivacy`** (`ProviderParticipantPrivacy`) — granular
  boolean toggles that relax individual attributes the default privacy
  policy strips from public payloads. Currently one field, `cityState`,
  which lets `person.addresses[0].city / .state` through (street and
  postal code stay stripped). Default per field is `false` (privacy-first).
- **`participantPrivacyPolicy`** (`Record<string, any>`) — the richer
  successor: a complete factory `POLICY_TYPE_PARTICIPANT` attribute-filter
  (inner shape). Kept opaque here (validated structurally as a plain
  object) so the factory owns the attribute schema. Attached to the
  provider's tournamentRecords so the factory strips/allows attributes
  during participant queries.

### `ScoringLaunchConfig` and `ScoringLaunchApp`

Provider-declared scoring-app launch target for courthive-public's
per-matchUp "Score this match" action. Lives on
`caps.integrations.scoringLaunch` (caps-owned — provisioner controls
integrations).

```ts
type ScoringLaunchApp = 'EPIXODIC' | 'EMBEDDED' | 'EXTERNAL';

interface ScoringLaunchConfig {
  app: ScoringLaunchApp;
  urlTemplate?: string; // required when app === 'EXTERNAL'
}
```

Launch modes:

- **`EPIXODIC`** — CourtHive Epixodic deep-link. The default when nothing
  is declared (`DEFAULT_SCORING_LAUNCH = { app: 'EPIXODIC' }`).
- **`EMBEDDED`** — courthive-public's own in-page `/track` scoring shell.
- **`EXTERNAL`** — a provider's own app via `urlTemplate`, with
  `${tournamentId}`, `${matchUpId}`, `${eventId}`, `${drawId}`
  placeholders substituted at launch time by `resolveScoringLaunchUrl`.

```ts
import { resolveScoringLaunchUrl } from '@courthive/provider-config';

const url = resolveScoringLaunchUrl('https://score.example.com/m/${matchUpId}?t=${tournamentId}', {
  matchUpId: 'mu-1',
  tournamentId: 't-9',
});
// → 'https://score.example.com/m/mu-1?t=t-9'
// Values are URI-component-encoded; unknown/absent placeholders → ''.
```

### `RankingPointsPolicy`

Classifies who owns the ranking-points policy the provider uses:
`kind` is one of `'BASIC' | 'CUSTOM' | 'NATIONAL'` (required when the
field is declared), plus optional `name` and `version`. Undeclared
providers resolve to `{ kind: 'BASIC' }` via `resolveRankingPointsPolicy`
for back-compat.

## Effective-config computation

`computeEffectiveConfig(caps, settings)` merges the two tiers into the
`ProviderConfigData` TMX consumes. Both arguments default to `{}`.

Merge rules by field:

| Field                                                     | Rule                                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `branding`                                                | settings overrides caps field-by-field; `themeTokens` merge key-by-key                        |
| `permissions` (booleans)                                  | `(caps[X] ?? defaultForX) && (settings[X] ?? defaultForX)` — both tiers must allow            |
| `permissions` (arrays)                                    | `intersect(caps[X], settings[X])` — empty on either side = unrestricted                       |
| `policies.allowedMatchUpFormats` / `allowedCategories`    | intersected across caps + settings                                                            |
| `policies.scheduling/scoring/seeding/rankingPointsPolicy` | settings owns                                                                                 |
| `defaults`                                                | settings owns                                                                                 |
| `integrations`                                            | caps owns                                                                                     |
| `participantPrivacy`                                      | settings owns; normalized to `{ cityState: settings.participantPrivacy?.cityState === true }` |
| `participantPrivacyPolicy`                                | settings owns; passed through verbatim                                                        |

Array intersection semantics (`allowedX` and allowed policy lists): if
either side is `undefined` or empty, the other side wins (empty = "no
restriction"); if both are non-empty, the result is their intersection.
Categories intersect by `ageCategoryCode`.

### Worked example — permission caps ∩ settings

```ts
import { computeEffectiveConfig } from '@courthive/provider-config';

const caps = {
  permissions: {
    canDeleteEvents: false, // provisioner forbids delete-events
    canEnterScores: true,
    allowedDrawTypes: ['SINGLE_ELIMINATION', 'ROUND_ROBIN', 'COMPASS'],
  },
};

const settings = {
  permissions: {
    canEnterScores: false, // provider chooses to disable
    canDeleteEvents: true, // provider tries to enable (blocked by cap)
    allowedDrawTypes: ['ROUND_ROBIN', 'FEED_IN'], // narrows within cap
  },
};

const effective = computeEffectiveConfig(caps, settings);

effective.permissions.canDeleteEvents; // false — cap forbids, AND wins
effective.permissions.canEnterScores; // false — settings disabled, AND wins
effective.permissions.allowedDrawTypes; // ['ROUND_ROBIN'] — intersection
effective.permissions.canCreateEvents; // true — unset both sides, permissive default
effective.permissions.canModifyCompletedScores; // false — PERMISSIONS_DEFAULT_FALSE
```

### Worked example — branding merge (settings-over-caps)

`branding` has no lock tier: `caps.branding` is a provisioner-seeded
default/fallback, and `settings.branding` (provider-admin-owned) wins
field-by-field where it defines a value. `themeTokens` maps merge
key-by-key so a provider can add tokens without dropping
provisioner-seeded ones — and on a key collision, the settings token
wins.

```ts
const caps = {
  branding: {
    appName: 'Provisioner Default',
    navbarLogoUrl: 'https://cdn.example.com/provisioner.png',
    themeTokens: { '--tmx-accent-blue': '#003366', '--tmx-bg-primary': '#ffffff' },
  },
};

const settings = {
  branding: {
    appName: 'Acme Tennis', // overrides caps value
    themeTokens: { '--tmx-accent-blue': '#1a5276' }, // overrides one token
  },
};

const { branding } = computeEffectiveConfig(caps, settings);

branding.appName; // 'Acme Tennis'                        (settings wins)
branding.navbarLogoUrl; // 'https://cdn.example.com/provisioner.png' (caps preserved)
branding.themeTokens; // { '--tmx-accent-blue': '#1a5276',   (settings token wins)
//   '--tmx-bg-primary': '#ffffff' }    (caps token preserved)
```

When neither tier defines any branding, the effective `branding` is
`undefined`, preserving the "no branding" contract.

## Validators

Both validators are pure functions — they throw nothing and return an
array of `ValidationIssue`. The caller decides whether issues are a hard
reject (HTTP 400) or informational warnings.

```ts
interface ValidationIssue {
  path: string; // dotted path, e.g. "permissions.allowedDrawTypes"
  code: ValidationIssueCode; // 'unknownField' | 'wrongType' | 'exceedsCap'
  message: string;
  disallowedValues?: string[]; // set for exceedsCap
}
```

- **`validateCaps(caps)`** — structural check on a caps write. Rejects
  unknown top-level keys (only `branding`, `permissions`, `policies`,
  `integrations` allowed), wrong types, unknown branding/permission/
  policy/integration keys, and out-of-prefix `themeTokens`.
- **`validateSettings(settings, caps)`** — structural check plus
  caps-respect. In addition to the structural checks it flags
  `exceedsCap` when a settings write would exceed the provisioner
  ceiling: enabling a boolean the cap set to `false`, or including
  `allowedX` / allowed-policy values outside the cap's universe.

```ts
import { validateSettings } from '@courthive/provider-config';

const issues = validateSettings(
  { permissions: { canDeleteEvents: true } },
  { permissions: { canDeleteEvents: false } }, // caps forbid it
);
// issues → [{ path: 'permissions.canDeleteEvents', code: 'exceedsCap',
//             message: 'canDeleteEvents cannot be enabled — provisioner cap forbids it' }]
```

The settings validator also structurally validates the interior policy
shapes (`schedulingPolicy`, `scoringPolicy`, `seedingPolicy`,
`rankingPointsPolicy`) against the field universes accepted by the
factory engine, and validates `integrations.scoringLaunch` (valid
`app`, known placeholders, `urlTemplate` required for `EXTERNAL`).

## Mutation gating

`MUTATION_PERMISSIONS` maps factory mutation method names to the
permission key that gates them. `isMutationAllowed(method, permissions)`
returns whether a mutation is permitted:

- Methods not in the map are allowed by default.
- Boolean permissions gate directly (undefined → `true`, permissive).
- Array permissions are _not_ enforced here — they have richer semantics
  checked at a different layer (e.g. when the draw type itself is
  selected).

```ts
import { isMutationAllowed } from '@courthive/provider-config';

isMutationAllowed('deleteEvents', { canDeleteEvents: false }); // false
isMutationAllowed('addEvent', {}); // true (permissive)
isMutationAllowed('someUngatedMethod', {}); // true (not in map)
```

Used by TMX `mutationRequest()` as a UI defense layer and by the server
`executionQueue` as defense in depth against replayed WebSocket payloads.

## Build / test

```bash
pnpm build         # rm -rf dist && tsc → dist/
pnpm test          # vitest --run
pnpm check-types   # tsc --noEmit
pnpm lint          # eslint src --max-warnings 0
pnpm format        # prettier --write "src/**/*.ts"
```

## License

MIT
