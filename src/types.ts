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
  /** Add/remove/pair event and draw entries. Distinct from creating the participant:
   *  a director barred from creating competitors can still enter existing ones. */
  canModifyEntries?: boolean;
  /** Ratings, scale items and computed results (seeding scales, dynamic ratings). */
  canModifyRatings?: boolean;

  // ── Events ──
  canCreateEvents?: boolean;
  canDeleteEvents?: boolean;
  canModifyEventFormat?: boolean;

  // ── Draws ──
  canCreateDraws?: boolean;
  canDeleteDraws?: boolean;
  canUseDraftPositioning?: boolean;
  canUseManualPositioning?: boolean;
  /** Assign/remove draw positions, seeding cascades, sub-orders, lucky-loser advancement.
   *  Separate from `canCreateDraws`: placing players is a different act from making the draw. */
  canAssignPositions?: boolean;
  /** Attach or remove structures (qualifying, playoffs, consolation, ad-hoc rounds) and rename them. */
  canModifyStructures?: boolean;
  /** Restrict draw types to this list (factory drawType constants). Empty = all allowed. */
  allowedDrawTypes?: string[];
  /** Restrict creation methods. Empty = all allowed. */
  allowedCreationMethods?: string[];

  // ── Scheduling ──
  canModifySchedule?: boolean;
  canUseBulkScheduling?: boolean;
  /** Create/apply/rebase named scheduling scenarios (what-if planning). */
  canModifyScheduleScenarios?: boolean;

  // ── Venues ──
  canCreateVenues?: boolean;
  canDeleteVenues?: boolean;
  canModifyCourtAvailability?: boolean;
  /** Practice-court registrations and default practice capacity. */
  canManagePracticeCourts?: boolean;

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
  /** Link/unlink tournaments for shared-facility scheduling. */
  canLinkTournaments?: boolean;
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
 * A sanctioning rulebook the provider may file applications under.
 *
 * `governingBodyId` is the factory's sanctioning-policy key — the value that selects which
 * lifecycle rules apply (`'itf'`, `'usta'`, `'generic'` are the policies the factory ships).
 * It is NOT "who runs the software": most providers only ever file under one body, and the
 * courthive-ams sanctioning wizard hides the field entirely when exactly one is configured.
 *
 * Absent or empty → the applicant chooses from every rulebook the factory ships.
 */
export interface AllowedGoverningBody {
  /** Factory sanctioning policy id stored on the sanctioning record. */
  governingBodyId: string;
  /** Human-friendly label used in the applicant's select. */
  displayName?: string;
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
  /**
   * Sanctioning rulebooks this provider may file under. Absent or empty → every rulebook the
   * factory ships. When exactly one is configured the applicant is not asked at all.
   */
  allowedGoverningBodies?: AllowedGoverningBody[];
  /**
   * College divisions offerable on a sanctioning application (`'DI'`, `'DII'`, `'NAIA'`, …).
   *
   * College play is an ITA concern, not a universal one, so this is deliberately absent for
   * almost every provider — and absent means the courthive-ams wizard does not render the
   * College Division field AT ALL, rather than showing an irrelevant dropdown. Only a
   * provisioner that runs college competition (today: the ITA) sets the cap that permits it.
   */
  allowedCollegeDivisions?: string[];
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
  | 'canModifyEntries'
  | 'canModifyRatings'
  | 'canAssignPositions'
  | 'canModifyStructures'
  | 'canModifyScheduleScenarios'
  | 'canManagePracticeCourts'
  | 'canLinkTournaments'
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
  /** Universe of sanctioning rulebooks the provider may file applications under. */
  allowedGoverningBodies?: AllowedGoverningBody[];
  /**
   * Universe of college divisions the provider may offer. Provisioner-owned by design: this is
   * how a college federation (the ITA) enables college classification for the providers it
   * owns, while every other provider inherits nothing and never sees the field.
   */
  allowedCollegeDivisions?: string[];
}

/**
 * Granular fields the provider may opt to publish on participants.
 * Default for every field is `false` — privacy-first. Each toggle
 * relaxes a single attribute that the default privacy policy
 * (`POLICY_PRIVACY_DEFAULT`) otherwise strips from public payloads.
 */
/**
 * A reference to a NAMED participant-privacy policy owned by the factory's
 * policy catalog, rather than a copy of the policy itself.
 *
 * Why a reference and not an object: the ITA is a single provisioner over
 * ~1,032 member-institution providers. Storing the same policy object in
 * every provider's settings makes 1,032 copies of one decision — the drift
 * shape this ecosystem has repeatedly paid for. A name resolves to one
 * definition that can be corrected in one place.
 *
 * There is deliberately no `kind` discriminator here, unlike
 * `RankingPointsPolicy`. That enum classifies WHO owns a ranking policy
 * (BASIC / CUSTOM / NATIONAL), which is a real distinction for rankings. A
 * privacy policy is just a named attribute filter; inventing a classifier
 * would be ceremony with no consumer.
 *
 * Resolution is the consumer's job — provider-config does not know the
 * catalog. `resolveParticipantPrivacy()` reports WHICH policy applies and
 * what floor constrains it; the factory owns the attribute schema and
 * performs the intersection.
 */
export interface ParticipantPrivacyPolicyRef {
  /** Catalog name, e.g. `'ITA'`. Required when the ref is declared. */
  name: string;
  /** Optional version string for traceability across catalog revisions. */
  version?: string;
}

export interface ProviderParticipantPrivacy {
  /** Allow `person.addresses[0].city / .state` through to the public
   *  participants endpoint (full street / postal code stay stripped). */
  cityState?: boolean;
  /**
   * Allow `person.sex` through to public participant payloads.
   *
   * `POLICY_PRIVACY_DEFAULT` strips it, deliberately, and that default does not
   * change. This is the per-provider opt-in — the ITA needs gender to reach its
   * public college pages, and for a long time CFS achieved that by mutating the
   * shared factory fixture in place, which loosened privacy for every other
   * provider in the process.
   *
   * ⚠️ Consumers must open **both** person blocks — the top-level
   * `participant.person` AND `participant.individualParticipants.person`.
   * Opening only the first genders a standalone individual while stripping the
   * members of a PAIR or TEAM, which is invisible until someone looks at a
   * doubles rubber.
   */
  sex?: boolean;
}

/**
 * Provider-admin-owned crowd-scoring configuration. Governs whether the
 * crowd poll/promote surface (TMX reconciliation + courthive-public relay
 * submit) is active for the provider's tournaments.
 *
 * Absent → enabled (see `resolveCrowdScoringEnabled` +
 * `CROWD_SCORING_ENABLED_BY_DEFAULT`). The default is deliberately ON so the
 * feature works without per-provider setup; it may be flipped to opt-in later
 * once more providers onboard.
 */
export interface ProviderCrowdScoringConfig {
  /** Explicit switch. `false` disables the crowd surface for this provider;
   *  `true` / absent leaves it on. */
  enabled?: boolean;
}

/**
 * Provisioner-owned configuration — the "ceiling" the provider
 * cannot exceed. Provider admin writes to ProviderConfigSettings
 * may not violate caps.
 *
 * NOTE: the boolean `participantPrivacy` toggles live on
 * `ProviderConfigSettings`, NOT here. Privacy governs the provider's
 * relationship with its own participants — a reseller has no standing to
 * dictate it.
 *
 * `participantPrivacyPolicyRef` is the deliberate exception (CA, 2026-08-21).
 * The rationale above assumes the provisioner is a RESELLER. A governing body
 * over member institutions is a different relationship: the ITA is one
 * provisioner over ~1,032 schools that will not configure their own privacy,
 * and a federation setting a privacy FLOOR for its members is legitimate where
 * a reseller dictating one is not. The floor may only be TIGHTENED by the
 * provider, never loosened — see `resolveParticipantPrivacy()`.
 */
export interface ProviderConfigCaps {
  branding?: ProviderBranding;
  permissions?: ProviderCapsPermissions;
  policies?: ProviderCapsPolicies;
  /**
   * Provisioner-set participant-privacy toggles.
   *
   * Same deliberate exception as `participantPrivacyPolicyRef` below: the
   * boolean toggles are provider-owned because a RESELLER has no standing to
   * dictate privacy, but a governing body over member institutions is a
   * different relationship. The ITA is one provisioner over ~1,032 schools that
   * will not each configure their own — setting it once here is the point.
   *
   * A provider may always be MORE private: `resolveParticipantPrivacy` requires
   * the cap to enable an attribute AND the provider not to have disabled it.
   */
  participantPrivacy?: ProviderParticipantPrivacy;
  /**
   * Provisioner-imposed participant-privacy FLOOR, as a catalog reference.
   * A provider may declare its own policy in settings, but the effective
   * policy must be at least as restrictive as this one. Enforcement of
   * "at least as restrictive" belongs to the consumer that can resolve both
   * policies to attribute maps — provider-config reports the obligation, it
   * cannot compute it.
   */
  participantPrivacyPolicyRef?: ParticipantPrivacyPolicyRef;
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
   * Provider-admin-owned branding. Merged field-by-field OVER any
   * `caps.branding` the provisioner set (settings wins where present;
   * `themeTokens` maps merge key-by-key). This lets a provider white-label
   * itself without provisioner credentials. There is no lock mechanism yet —
   * a provisioner cannot force a branding value the provider can't override;
   * add one here + in `computeEffectiveConfig` if brand enforcement is needed.
   */
  branding?: ProviderBranding;
  /**
   * Granular privacy toggles for what the provider opts to publish
   * about its participants. Owned by the provider-admin alone —
   * provisioner has no say here. Each toggle relaxes a single
   * attribute that the default privacy policy strips. Default per
   * field is `false` (privacy-first).
   */
  participantPrivacy?: ProviderParticipantPrivacy;
  /**
   * Provider-admin-owned crowd-scoring switch. Owned by the provider alone —
   * the provisioner has no caps surface here. Absent → enabled (default ON,
   * see `resolveCrowdScoringEnabled`).
   */
  crowdScoring?: ProviderCrowdScoringConfig;
  /**
   * The provider's selected participant-privacy POLICY — a complete factory
   * `POLICY_TYPE_PARTICIPANT` attribute-filter (inner shape, i.e. the value
   * under the `participant` key: `{ policyName, participant: {...} }`), chosen
   * from the policy catalog. This is the richer successor to the boolean
   * `participantPrivacy` toggles: it is attached to the provider's
   * tournamentRecords so the factory strips/allows attributes during
   * participant queries. Kept opaque here (validated structurally) so the
   * factory owns the attribute schema.
   */
  participantPrivacyPolicy?: Record<string, any>;
  /**
   * The provider's selected participant-privacy policy as a CATALOG REFERENCE
   * — the preferred form. Use this rather than `participantPrivacyPolicy`
   * unless the provider genuinely needs a one-off that no catalog entry
   * expresses; an inline object is a private copy that nothing can correct
   * centrally.
   *
   * Declaring BOTH on the same tier is a configuration error, not a
   * precedence question — `validateSettings` rejects it rather than inventing
   * a winner.
   */
  participantPrivacyPolicyRef?: ParticipantPrivacyPolicyRef;
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
  crowdScoring?: ProviderCrowdScoringConfig;
  participantPrivacyPolicy?: Record<string, any>;
  participantPrivacyPolicyRef?: ParticipantPrivacyPolicyRef;
  /** Provisioner-imposed floor, surfaced so consumers can enforce it. */
  participantPrivacyPolicyFloor?: ParticipantPrivacyPolicyRef;
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
  | 'canUseChat'
  | 'canModifyEntries'
  | 'canModifyRatings'
  | 'canAssignPositions'
  | 'canModifyStructures'
  | 'canModifyScheduleScenarios'
  | 'canManagePracticeCourts'
  | 'canLinkTournaments';

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
  'canModifyEntries',
  'canModifyRatings',
  'canAssignPositions',
  'canModifyStructures',
  'canModifyScheduleScenarios',
  'canManagePracticeCourts',
  'canLinkTournaments',
] as const;

export const ARRAY_PERMISSION_KEYS: ReadonlyArray<ArrayPermissionKey> = [
  'allowedDrawTypes',
  'allowedCreationMethods',
  'allowedScoringApproaches',
] as const;

// Every key here MUST be intersected in `mergePolicies` — a key listed but not merged is
// silently dropped from the effective config, which is how `allowedTierSystems` shipped
// unreachable to both TMX's tier select and the courthive-ams sanctioning wizard. There is a
// conformance test over this list precisely so the next addition cannot repeat it.
export const ARRAY_POLICY_KEYS: ReadonlyArray<keyof ProviderPolicyDefaults> = [
  'allowedMatchUpFormats',
  'allowedCategories',
  'allowedTierSystems',
  'allowedGoverningBodies',
  'allowedCollegeDivisions',
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
