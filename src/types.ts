/**
 * Provider configuration types — canonical source of truth.
 *
 * Two-tier model:
 *   - ProviderConfigCaps      (provisioner-owned: white-label,
 *                              permission ceilings, allowed universes)
 *   - ProviderConfigSettings  (provider-admin-owned: may-disable,
 *                              narrowing, operational policy + defaults)
 *   - ProviderConfigData      (effective shape, computed by merging
 *                              caps ∩ settings — what TMX consumes)
 *
 * See `Mentat/planning/TMX_PROVIDER_CONFIG_FEATURES.md` for the full
 * design rationale, the field-ownership matrix, and the merge rules.
 */

// ── Sub-types (shared across caps + settings + effective) ──

export interface ProviderBranding {
  /** URL or data-URI for navbar logo (replaces "TMX" text) */
  navbarLogoUrl?: string;
  /** Alt text for navbar logo */
  navbarLogoAlt?: string;
  /** Max height in px for navbar logo (default: 32) */
  navbarLogoHeight?: number;
  /** URL or data-URI for splash/login screen logo (replaces CourtHive hex) */
  splashLogoUrl?: string;
  /** Application name shown in page title and nav bar (default: "TMX") */
  appName?: string;
  /** Optional accent color override (CSS color value) */
  accentColor?: string;
  /**
   * Per-token CSS custom-property overrides applied to
   * `document.documentElement` at boot and on provider switch.
   * Keys must be CSS custom-property names starting with `--tmx-` or
   * `--chc-` (the TMX / courthive-components token families). Values
   * are CSS color / length / font strings.
   *
   * Example:
   *   { '--tmx-accent-blue': '#1a5276', '--tmx-bg-primary': '#f4f6f8' }
   */
  themeTokens?: Record<string, string>;
  /**
   * Optional URL to a provider-hosted stylesheet that the client
   * appends to `<head>` so it cascades over the bundled CSS. Escape
   * hatch for theming beyond the token surface (fonts, layout,
   * animations). Prefer `themeTokens` when possible — the URL hatch
   * adds a network dependency and requires curating against
   * bundle-internal selectors.
   */
  stylesheetUrl?: string;
}

export interface ProviderPermissions {
  // ── Participants ──
  canCreateCompetitors?: boolean;
  canCreateOfficials?: boolean;
  canDeleteParticipants?: boolean;
  canImportParticipants?: boolean;
  canEditParticipantDetails?: boolean;

  // ── Events ──
  canCreateEvents?: boolean;
  canDeleteEvents?: boolean;
  canModifyEventFormat?: boolean;

  // ── Draws ──
  canCreateDraws?: boolean;
  canDeleteDraws?: boolean;
  canUseDraftPositioning?: boolean;
  canUseManualPositioning?: boolean;
  /** Restrict draw types to this list (factory drawType constants). Empty = all allowed. */
  allowedDrawTypes?: string[];
  /** Restrict creation methods. Empty = all allowed. */
  allowedCreationMethods?: string[];

  // ── Scheduling ──
  canModifySchedule?: boolean;
  canUseBulkScheduling?: boolean;

  // ── Venues ──
  canCreateVenues?: boolean;
  canDeleteVenues?: boolean;
  canModifyCourtAvailability?: boolean;

  // ── Scoring ──
  canEnterScores?: boolean;
  canModifyCompletedScores?: boolean;
  allowedScoringApproaches?: string[];

  // ── Publishing ──
  canPublish?: boolean;
  canUnpublish?: boolean;

  // ── Settings ──
  canModifyTournamentDetails?: boolean;
  canModifyPolicies?: boolean;
  canAccessProviderAdmin?: boolean;

  // ── Communication ──
  /** Tournament chat. Defaults to `true` (enabled) — a provider may set it
   *  false to disable chat across its tournaments. */
  canUseChat?: boolean;
}

export interface AllowedCategory {
  ageCategoryCode: string;
  categoryName?: string;
}

/**
 * A named federation tier system the provider supports for
 * `Tournament.tournamentTier` (e.g. `'ITF_JUNIOR'` with display name
 * `'ITF Junior'`). Surfaced as a select in the TMX edit-tournament
 * drawer when present in `allowedTierSystems`; absent the drawer falls
 * back to a free-form text input.
 *
 * `values?: string[]` constrains the tier *value* field to a fixed list
 * (e.g. `'J1' … 'J500'` for ITF Junior). When omitted, value stays
 * free-form — useful for sports like ATP/WTA whose federations introduce
 * new tier names mid-year.
 *
 * Schema: `Mentat/planning/TOURNAMENT_LEVEL_AND_TIER.md` Phase 2.5.
 */
export interface AllowedTierSystem {
  /** Federation namespace stored on `Tournament.tournamentTier.system`. */
  system: string;
  /** Human-friendly label used in the drawer's select. */
  displayName?: string;
  /** Optional fixed value list — when present, the value field also becomes a select. */
  values?: string[];
}

/**
 * Per-print-type composition policies. Opaque to the server — the
 * shape is owned by pdf-factory's `CompositionConfig` type, validated
 * client-side by the editor. Stored as JSON in
 * `providerConfigSettings.policies.printPolicies`.
 *
 * Keys are pdf-factory `PrintType` values (`'draw'`, `'schedule'`,
 * `'playerList'`, `'courtCard'`, `'signInSheet'`, `'matchCard'`).
 */
export type PrintPoliciesByType = Record<string, unknown>;

/**
 * Closed enum classifying *who* is responsible for the ranking-points
 * policy this provider uses to compute its rank lists. Not a pointer
 * to a specific policy fixture in the factory — those vary per provider
 * within each category.
 *
 *   - BASIC    — factory-bundled default. Public providers + anyone
 *                who hasn't set up their own policy. Suitable for
 *                exhibitions, demo data, and providers that haven't
 *                yet authored their own scheme.
 *   - CUSTOM   — provider has set up their own policy outside the
 *                factory (e.g. seasonal series, club-specific rules).
 *                The `name` / `version` fields identify it.
 *   - NATIONAL — actual national governing body (USTA, ITF, etc.)
 *                using their officially-sanctioned policy. Distinct
 *                from CUSTOM because the policy carries federation
 *                authority + downstream consumers (federation reports,
 *                qualifying ladders) may treat NATIONAL rankings with
 *                extra weight.
 *
 * Pre-config-field providers (no declared policy) resolve to BASIC
 * via `resolveRankingPointsPolicy()`.
 */
export type RankingPointsPolicyKind = 'BASIC' | 'CUSTOM' | 'NATIONAL';

export const RANKING_POINTS_POLICY_KINDS: readonly RankingPointsPolicyKind[] = ['BASIC', 'CUSTOM', 'NATIONAL'] as const;

export interface RankingPointsPolicy {
  /** Closed-enum classifier; required when the field is declared. */
  kind: RankingPointsPolicyKind;
  /**
   * Human label identifying the specific policy (e.g. 'USTA Junior 2025',
   * 'BOBOCA seasonal v2'). Optional for BASIC (BASIC is the basic);
   * recommended for CUSTOM + NATIONAL so downstream consumers and
   * operators can disambiguate without inspecting bundle internals.
   */
  name?: string;
  /** Optional version string for traceability across re-publishes. */
  version?: string;
}

export interface ProviderPolicyDefaults {
  /** Scheduling policy applied to new tournaments */
  schedulingPolicy?: any;
  /** Scoring policy */
  scoringPolicy?: any;
  /** Seeding policy */
  seedingPolicy?: any;
  /**
   * Ranking-points policy this provider uses for rank-list computation.
   * Optional — absence means "no declared policy"; the resolver
   * (`resolveRankingPointsPolicy`) returns `{ kind: 'BASIC' }` for that
   * case to preserve back-compat with providers that pre-date this
   * field (e.g. BOBOCA, which has been on BASIC since the rankings
   * service shipped). TMX policy-picker UI should constrain to the
   * declared policy when set; courthive-rankings should apply the
   * matching policy at ingest; the per-provider /pub/#/rankings detail
   * page reads the bundle's policy.name/version to describe what was
   * applied.
   */
  rankingPointsPolicy?: RankingPointsPolicy;
  /** Restrict matchUp formats to this list (format codes) */
  allowedMatchUpFormats?: string[];
  /** Restrict event categories to this list */
  allowedCategories?: AllowedCategory[];
  /**
   * Federation tier systems the provider supports for
   * `Tournament.tournamentTier`. When non-empty, TMX's edit-tournament
   * drawer renders the tier system as a select (with optional
   * per-system value enumeration) instead of a free-form text input.
   * Absent or empty → today's free-form behaviour. Pre-existing tiers
   * whose system isn't in the list render as a disabled fallback
   * option so we never silently drop one.
   */
  allowedTierSystems?: AllowedTierSystem[];
  /** Per-print-type composition policies (pdf-factory CompositionConfig per type) */
  printPolicies?: PrintPoliciesByType;
}

export interface ProviderDefaults {
  /** Default event type for new events */
  defaultEventType?: string;
  /** Default draw type for new draws */
  defaultDrawType?: string;
  /** Default creation method */
  defaultCreationMethod?: string;
  /** Default gender */
  defaultGender?: string;
  /**
   * Default UI language for users who haven't explicitly chosen one.
   * BCP47 tag (e.g., 'en', 'cs', 'fr', 'pt-BR'). Applied at TMX boot
   * when settings.languageExplicit is not true. Falls through to
   * navigator.language → 'en' if absent or unavailable.
   * See Mentat/planning/I18N_DELIVERY.md.
   */
  defaultLanguage?: string;
  /**
   * Default PDF font id for generated tournament documents, chosen from the
   * CFS font catalog (`GET /fonts`) — e.g. 'dejavu-sans' or 'liberation-sans'
   * for Central-European (Latin-2) coverage. End users may override it in TMX
   * settings; both fall back to the built-in helvetica when unset/unknown.
   * See Mentat/planning/PDF_CE_FONT_SUPPORT.md.
   */
  defaultPdfFont?: string;
}

/**
 * Which scoring app courthive-public launches for a per-matchUp
 * "Score this match" action.
 *   EPIXODIC — CourtHive Epixodic deep-link (the default when unset)
 *   EMBEDDED — courthive-public's own in-page `/track` scoring shell
 *   EXTERNAL — a provider's own app via `urlTemplate` (e.g. IONSport)
 */
export type ScoringLaunchApp = 'EPIXODIC' | 'EMBEDDED' | 'EXTERNAL';

export interface ScoringLaunchConfig {
  app: ScoringLaunchApp;
  /**
   * Required when `app === 'EXTERNAL'`. A URL with any of the supported
   * placeholders — `${tournamentId}`, `${matchUpId}`, `${eventId}`,
   * `${drawId}` — substituted at launch time via `resolveScoringLaunchUrl`.
   * Ignored for EPIXODIC / EMBEDDED.
   */
  urlTemplate?: string;
}

export interface ProviderIntegrations {
  ssoProvider?: string;
  /**
   * Provider-declared scoring-app launch target for courthive-public.
   * Caps-owned (provisioner controls integrations). Absent → EPIXODIC.
   */
  scoringLaunch?: ScoringLaunchConfig;
}

// ── Cap-tier schema (provisioner-owned) ──

/**
 * Caps-eligible permission keys. Subset of ProviderPermissions —
 * branding, integrations, policies.allowedX live elsewhere on the
 * caps shape.
 */
export type CappablePermissionKey =
  // Boolean caps
  | 'canCreateCompetitors'
  | 'canCreateOfficials'
  | 'canDeleteParticipants'
  | 'canImportParticipants'
  | 'canEditParticipantDetails'
  | 'canCreateEvents'
  | 'canDeleteEvents'
  | 'canModifyEventFormat'
  | 'canCreateDraws'
  | 'canDeleteDraws'
  | 'canUseDraftPositioning'
  | 'canUseManualPositioning'
  | 'canModifySchedule'
  | 'canUseBulkScheduling'
  | 'canCreateVenues'
  | 'canDeleteVenues'
  | 'canModifyCourtAvailability'
  | 'canEnterScores'
  | 'canModifyCompletedScores'
  | 'canPublish'
  | 'canUnpublish'
  | 'canModifyTournamentDetails'
  | 'canModifyPolicies'
  | 'canAccessProviderAdmin'
  | 'canUseChat'
  // Array (allowed-universe) caps
  | 'allowedDrawTypes'
  | 'allowedCreationMethods'
  | 'allowedScoringApproaches';

export type ProviderCapsPermissions = Pick<ProviderPermissions, CappablePermissionKey>;

export interface ProviderCapsPolicies {
  /** Universe of matchUpFormat codes the provider may use */
  allowedMatchUpFormats?: string[];
  /** Universe of event categories the provider may offer */
  allowedCategories?: AllowedCategory[];
  /**
   * Universe of federation tier systems the provider may surface in
   * its drawer. Provider-side `allowedTierSystems` must be a subset of
   * this list when the caps list is non-empty.
   */
  allowedTierSystems?: AllowedTierSystem[];
}

/**
 * Granular fields the provider may opt to publish on participants.
 * Default for every field is `false` — privacy-first. Each toggle
 * relaxes a single attribute that the default privacy policy
 * (`POLICY_PRIVACY_DEFAULT`) otherwise strips from public payloads.
 */
export interface ProviderParticipantPrivacy {
  /** Allow `person.addresses[0].city / .state` through to the public
   *  participants endpoint (full street / postal code stay stripped). */
  cityState?: boolean;
}

/**
 * Provisioner-owned configuration — the "ceiling" the provider
 * cannot exceed. Provider admin writes to ProviderConfigSettings
 * may not violate caps.
 *
 * NOTE: `participantPrivacy` lives on `ProviderConfigSettings`,
 * NOT here. Privacy governs the provider's relationship with its
 * own participants — a reseller has no standing to dictate it.
 */
export interface ProviderConfigCaps {
  branding?: ProviderBranding;
  permissions?: ProviderCapsPermissions;
  policies?: ProviderCapsPolicies;
  integrations?: ProviderIntegrations;
}

// ── Settings-tier schema (provider-admin-owned) ──

/**
 * Provider-admin-owned configuration — the day-to-day tuning the
 * provider does within the cap ceiling. May disable booleans that
 * caps allow; may narrow allowedX arrays; owns operational policies
 * and defaults entirely.
 */
export interface ProviderConfigSettings {
  permissions?: ProviderPermissions;
  policies?: ProviderPolicyDefaults;
  defaults?: ProviderDefaults;
  /**
   * Granular privacy toggles for what the provider opts to publish
   * about its participants. Owned by the provider-admin alone —
   * provisioner has no say here. Each toggle relaxes a single
   * attribute that the default privacy policy strips. Default per
   * field is `false` (privacy-first).
   */
  participantPrivacy?: ProviderParticipantPrivacy;
}

// ── Effective shape (delivered to TMX) ──

/**
 * The merged shape TMX consumes. TMX has no awareness of the
 * caps/settings split — it only sees the result of
 * `computeEffectiveConfig(caps, settings)`.
 */
export interface ProviderConfigData {
  branding?: ProviderBranding;
  permissions?: ProviderPermissions;
  policies?: ProviderPolicyDefaults;
  defaults?: ProviderDefaults;
  integrations?: ProviderIntegrations;
  participantPrivacy?: ProviderParticipantPrivacy;
}

// ── Helper enumerations for the merge function and validators ──

export type BooleanPermissionKey =
  | 'canCreateCompetitors'
  | 'canCreateOfficials'
  | 'canDeleteParticipants'
  | 'canImportParticipants'
  | 'canEditParticipantDetails'
  | 'canCreateEvents'
  | 'canDeleteEvents'
  | 'canModifyEventFormat'
  | 'canCreateDraws'
  | 'canDeleteDraws'
  | 'canUseDraftPositioning'
  | 'canUseManualPositioning'
  | 'canModifySchedule'
  | 'canUseBulkScheduling'
  | 'canCreateVenues'
  | 'canDeleteVenues'
  | 'canModifyCourtAvailability'
  | 'canEnterScores'
  | 'canModifyCompletedScores'
  | 'canPublish'
  | 'canUnpublish'
  | 'canModifyTournamentDetails'
  | 'canModifyPolicies'
  | 'canAccessProviderAdmin'
  | 'canUseChat';

export type ArrayPermissionKey = 'allowedDrawTypes' | 'allowedCreationMethods' | 'allowedScoringApproaches';

export const BOOLEAN_PERMISSION_KEYS: ReadonlyArray<BooleanPermissionKey> = [
  'canCreateCompetitors',
  'canCreateOfficials',
  'canDeleteParticipants',
  'canImportParticipants',
  'canEditParticipantDetails',
  'canCreateEvents',
  'canDeleteEvents',
  'canModifyEventFormat',
  'canCreateDraws',
  'canDeleteDraws',
  'canUseDraftPositioning',
  'canUseManualPositioning',
  'canModifySchedule',
  'canUseBulkScheduling',
  'canCreateVenues',
  'canDeleteVenues',
  'canModifyCourtAvailability',
  'canEnterScores',
  'canModifyCompletedScores',
  'canPublish',
  'canUnpublish',
  'canModifyTournamentDetails',
  'canModifyPolicies',
  'canAccessProviderAdmin',
  'canUseChat',
] as const;

export const ARRAY_PERMISSION_KEYS: ReadonlyArray<ArrayPermissionKey> = [
  'allowedDrawTypes',
  'allowedCreationMethods',
  'allowedScoringApproaches',
] as const;

export const ARRAY_POLICY_KEYS: ReadonlyArray<keyof ProviderPolicyDefaults> = [
  'allowedMatchUpFormats',
  'allowedCategories',
  'allowedTierSystems',
] as const;

/**
 * Permissions that default to `false` when no value is set.
 * Most permissions default to `true` (permissive); this set lists
 * the exceptions where the absence of an explicit decision should
 * be treated as "denied".
 */
export const PERMISSIONS_DEFAULT_FALSE: ReadonlySet<keyof ProviderPermissions> = new Set([
  'canModifyCompletedScores',
  'canAccessProviderAdmin',
]);
