/**
 * computeEffectiveConfig — merge ProviderConfigCaps and
 * ProviderConfigSettings into the effective ProviderConfigData
 * shape that TMX consumes.
 *
 * Merge rules (per the field-ownership matrix in
 * `Mentat/planning/TMX_PROVIDER_CONFIG_FEATURES.md`):
 *
 *   branding              settings overrides caps field-by-field
 *                         (themeTokens maps merge key-by-key); no lock tier
 *   integrations          caps owns
 *   defaults              settings owns
 *   policies.scheduling/scoring/seedingPolicy
 *                         settings owns
 *   permissions.canX
 *     (booleans)          (caps[X] ?? defaultForX) AND (settings[X] ?? defaultForX)
 *   permissions.allowedX
 *     (arrays)            intersect(caps[X], settings[X])
 *                         empty caps array  → unrestricted (settings wins)
 *                         empty settings    → unrestricted within caps
 *   policies.allowedMatchUpFormats / allowedCategories
 *                         intersect(caps, settings)
 *
 * Most boolean permissions default to `true` (permissive). The
 * exceptions (default `false`) are listed in `PERMISSIONS_DEFAULT_FALSE`.
 */

import {
  ARRAY_PERMISSION_KEYS,
  BOOLEAN_PERMISSION_KEYS,
  PERMISSIONS_DEFAULT_FALSE,
  type AllowedCategory,
  type ProviderBranding,
  type ProviderConfigCaps,
  type ProviderConfigData,
  type ProviderConfigSettings,
  type ProviderPermissions,
  type ProviderPolicyDefaults,
  type RankingPointsPolicy,
} from './types';

export function computeEffectiveConfig(
  caps: ProviderConfigCaps = {},
  settings: ProviderConfigSettings = {},
): ProviderConfigData {
  return {
    branding: mergeBranding(caps.branding, settings.branding),
    permissions: mergePermissions(caps.permissions, settings.permissions),
    policies: mergePolicies(caps.policies, settings.policies),
    defaults: settings.defaults,
    integrations: caps.integrations,
    // participantPrivacy is provider-owned (settings tier only). The
    // provisioner has no caps surface here — privacy is between the
    // provider and its participants. Default = false (privacy-first)
    // when absent.
    participantPrivacy: { cityState: settings.participantPrivacy?.cityState === true },
    // The selected privacy POLICY (settings-owned) is passed through verbatim.
    // It is attached to tournamentRecords for the factory to apply; consumers
    // that need the provider's default privacy read it here.
    participantPrivacyPolicy: settings.participantPrivacyPolicy,
  };
}

function defaultForPermission(key: keyof ProviderPermissions): boolean {
  return !PERMISSIONS_DEFAULT_FALSE.has(key);
}

/**
 * Merge branding tiers: provider-owned `settings.branding` overrides
 * provisioner `caps.branding` field-by-field (settings wins where it defines a
 * value). `themeTokens` maps merge key-by-key so a provider can add tokens
 * without dropping provisioner-seeded ones. Returns `undefined` when neither
 * tier defines any branding — preserving the prior "no branding" contract.
 *
 * No lock mechanism: caps.branding is a default/fallback, not a ceiling. If
 * brand enforcement is later required, gate individual fields here.
 */
export function mergeBranding(
  caps: ProviderBranding | undefined,
  settings: ProviderBranding | undefined,
): ProviderBranding | undefined {
  if (!caps && !settings) return undefined;

  const merged: ProviderBranding = { ...caps, ...settings };

  const themeTokens = { ...caps?.themeTokens, ...settings?.themeTokens };
  if (Object.keys(themeTokens).length > 0) merged.themeTokens = themeTokens;

  return merged;
}

export function mergePermissions(
  caps: Partial<ProviderPermissions> = {},
  settings: Partial<ProviderPermissions> = {},
): ProviderPermissions {
  const out: ProviderPermissions = {};

  for (const key of BOOLEAN_PERMISSION_KEYS) {
    const def = defaultForPermission(key);
    const capValue = caps[key] ?? def;
    const settingValue = settings[key] ?? def;
    out[key] = capValue && settingValue;
  }

  for (const key of ARRAY_PERMISSION_KEYS) {
    const merged = intersectStringList(caps[key], settings[key]);
    if (merged !== undefined) out[key] = merged;
  }

  return out;
}

export function mergePolicies(
  caps: Partial<ProviderPolicyDefaults> = {},
  settings: Partial<ProviderPolicyDefaults> = {},
): ProviderPolicyDefaults {
  const out: ProviderPolicyDefaults = {
    schedulingPolicy: settings.schedulingPolicy,
    scoringPolicy: settings.scoringPolicy,
    seedingPolicy: settings.seedingPolicy,
    // rankingPointsPolicy is settings-owned (provider declares its policy).
    // Caps don't constrain it today — when they do (e.g. provisioner
    // restricts a tier-1 provider to NATIONAL only), add the intersection
    // check here following the allowedMatchUpFormats pattern.
    rankingPointsPolicy: settings.rankingPointsPolicy,
  };

  const formats = intersectStringList(caps.allowedMatchUpFormats, settings.allowedMatchUpFormats);
  if (formats !== undefined) out.allowedMatchUpFormats = formats;

  const cats = intersectCategoryList(caps.allowedCategories, settings.allowedCategories);
  if (cats !== undefined) out.allowedCategories = cats;

  return out;
}

/**
 * Resolve the effective ranking-points policy for a provider. Pre-config-
 * field providers (no declared policy) default to BASIC for back-compat —
 * BOBOCA's existing bundle already reports `policy.name: "BASIC"`, so
 * treating undeclared as BASIC keeps that surface stable.
 *
 * Consumers (courthive-rankings ingest, TMX policy-picker UI, the
 * /pub/#/rankings detail page) should call this rather than reading
 * `settings.rankingPointsPolicy` directly so the default is uniform.
 */
export function resolveRankingPointsPolicy(settings: Partial<ProviderPolicyDefaults> | undefined): RankingPointsPolicy {
  const declared = settings?.rankingPointsPolicy;
  if (declared?.kind) return declared;
  return { kind: 'BASIC' };
}

/**
 * Intersection rule for "allowed-X" string arrays:
 *   - both undefined           → undefined (no restriction)
 *   - one undefined or empty   → use the other (empty = unrestricted)
 *   - both non-empty           → array intersection
 *
 * Empty array is treated as "unrestricted" because that is how
 * existing TMX consumers interpret it: leaving the picker empty
 * should not silently disable everything.
 */
function intersectStringList(a?: string[], b?: string[]): string[] | undefined {
  if (a === undefined && b === undefined) return undefined;
  if (a === undefined || a.length === 0) return b;
  if (b === undefined || b.length === 0) return a;
  const setB = new Set(b);
  return a.filter((item) => setB.has(item));
}

/** Categories intersect by `ageCategoryCode`. */
function intersectCategoryList(a?: AllowedCategory[], b?: AllowedCategory[]): AllowedCategory[] | undefined {
  if (a === undefined && b === undefined) return undefined;
  if (a === undefined || a.length === 0) return b;
  if (b === undefined || b.length === 0) return a;
  const codesB = new Set(b.map((c) => c.ageCategoryCode));
  return a.filter((c) => codesB.has(c.ageCategoryCode));
}
