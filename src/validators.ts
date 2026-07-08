/**
 * Provider config validators — runtime checks for caps and settings
 * writes. Returns a list of `ValidationIssue` per invalid field so
 * the admin-client UI can surface errors inline.
 *
 * Two validators:
 *   - `validateCaps(caps)`            structural check on caps writes
 *   - `validateSettings(settings, caps)` structural + caps-respect
 *
 * Both are pure functions; throw nothing, return issues. Caller
 * decides whether issues are a hard reject (HTTP 400) or
 * informational warnings.
 */

import {
  ARRAY_PERMISSION_KEYS,
  BOOLEAN_PERMISSION_KEYS,
  RANKING_POINTS_POLICY_KINDS,
  type ArrayPermissionKey,
  type BooleanPermissionKey,
  type ProviderConfigCaps,
} from './types';
import { SCORING_LAUNCH_APPS, SCORING_LAUNCH_PLACEHOLDERS, scoringLaunchPlaceholders } from './scoring-launch';

export interface ValidationIssue {
  /** Dotted path to the offending field, e.g. "permissions.allowedDrawTypes" */
  path: string;
  /** Machine-readable issue code */
  code: ValidationIssueCode;
  /** Human-readable explanation */
  message: string;
  /** For exceedsCap, the disallowed values */
  disallowedValues?: string[];
}

export type ValidationIssueCode = 'unknownField' | 'wrongType' | 'exceedsCap';

// ── Allowed top-level keys ──

const CAPS_TOP_LEVEL_KEYS = new Set(['branding', 'permissions', 'policies', 'integrations']);
const SETTINGS_TOP_LEVEL_KEYS = new Set([
  'branding',
  'permissions',
  'policies',
  'defaults',
  'participantPrivacy',
  'participantPrivacyPolicy',
  'crowdScoring',
]);
const PARTICIPANT_PRIVACY_KEYS = new Set(['cityState']);
const CROWD_SCORING_KEYS = new Set(['enabled']);

const BRANDING_KEYS = new Set([
  'navbarLogoUrl',
  'navbarLogoAlt',
  'navbarLogoHeight',
  'splashLogoUrl',
  'appName',
  'accentColor',
  'themeTokens',
  'stylesheetUrl',
]);

/**
 * Allowed CSS custom-property prefixes for `branding.themeTokens`.
 * Rejecting outside-prefix tokens prevents accidental leakage into
 * unrelated CSS variable namespaces (third-party libraries, the
 * browser's own `--*` vars).
 */
const THEME_TOKEN_PREFIXES = ['--tmx-', '--chc-'];

const CAPS_PERMISSION_KEY_SET = new Set<string>([...BOOLEAN_PERMISSION_KEYS, ...ARRAY_PERMISSION_KEYS]);
const SETTINGS_PERMISSION_KEY_SET = CAPS_PERMISSION_KEY_SET;

const CAPS_POLICY_KEYS = new Set(['allowedMatchUpFormats', 'allowedCategories', 'allowedTierSystems']);
const SETTINGS_POLICY_KEYS = new Set([
  'schedulingPolicy',
  'scoringPolicy',
  'seedingPolicy',
  'rankingPointsPolicy',
  'allowedMatchUpFormats',
  'allowedCategories',
  'allowedTierSystems',
]);

const SETTINGS_DEFAULTS_KEYS = new Set([
  'defaultEventType',
  'defaultDrawType',
  'defaultCreationMethod',
  'defaultGender',
  'defaultLanguage',
  'defaultPdfFont',
]);

const INTEGRATIONS_ALLOWED_KEYS = new Set(['ssoProvider', 'scoringLaunch']);
const SCORING_LAUNCH_KEYS = new Set(['app', 'urlTemplate']);
const SCORING_LAUNCH_APP_SET: Set<string> = new Set(SCORING_LAUNCH_APPS);
const SCORING_LAUNCH_PLACEHOLDER_SET: Set<string> = new Set(SCORING_LAUNCH_PLACEHOLDERS);

// ── Caps validator ──

export function validateCaps(caps: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(caps)) {
    issues.push({ path: '', code: 'wrongType', message: 'caps must be an object' });
    return issues;
  }

  for (const key of Object.keys(caps)) {
    if (!CAPS_TOP_LEVEL_KEYS.has(key)) {
      issues.push({
        path: key,
        code: 'unknownField',
        message: `unknown caps top-level key "${key}"; expected one of branding/permissions/policies/integrations`,
      });
    }
  }

  validateBranding(caps.branding, 'branding', issues);
  validateCapsPermissions(caps.permissions, 'permissions', issues);
  validateCapsPolicies(caps.policies, 'policies', issues);
  validateIntegrations(caps.integrations, 'integrations', issues);

  return issues;
}

// ── Settings validator (with caps-respect) ──

export function validateSettings(settings: unknown, caps: ProviderConfigCaps = {}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(settings)) {
    issues.push({ path: '', code: 'wrongType', message: 'settings must be an object' });
    return issues;
  }

  for (const key of Object.keys(settings)) {
    if (!SETTINGS_TOP_LEVEL_KEYS.has(key)) {
      issues.push({
        path: key,
        code: 'unknownField',
        message: `unknown settings top-level key "${key}"; expected one of branding/permissions/policies/defaults`,
      });
    }
  }

  // branding is provider-editable (settings tier); same structural rules as
  // caps.branding — no caps-ceiling check because branding has no lock tier.
  validateBranding(settings.branding, 'branding', issues);
  // participantPrivacyPolicy is an opaque factory policy object — validate only
  // that it is a plain object; the factory owns its attribute schema.
  if (settings.participantPrivacyPolicy !== undefined && !isPlainObject(settings.participantPrivacyPolicy)) {
    issues.push({
      path: 'participantPrivacyPolicy',
      code: 'wrongType',
      message: 'participantPrivacyPolicy must be an object',
    });
  }
  validateSettingsPermissions(settings.permissions, caps.permissions, 'permissions', issues);
  validateSettingsPolicies(settings.policies, caps.policies, 'policies', issues);
  validateDefaults(settings.defaults, 'defaults', issues);
  validateParticipantPrivacy(settings.participantPrivacy, 'participantPrivacy', issues);
  validateCrowdScoring(settings.crowdScoring, 'crowdScoring', issues);

  return issues;
}

// ── Crowd scoring (settings tier only) ──

function validateCrowdScoring(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!CROWD_SCORING_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown crowdScoring key "${key}"` });
      continue;
    }
    const v = (value as Record<string, unknown>)[key];
    if (v !== undefined && typeof v !== 'boolean') {
      issues.push({ path: `${path}.${key}`, code: 'wrongType', message: `${path}.${key} must be a boolean` });
    }
  }
}

// ── Participant privacy (settings tier only) ──

function validateParticipantPrivacy(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!PARTICIPANT_PRIVACY_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown participantPrivacy key "${key}"` });
      continue;
    }
    const v = (value as Record<string, unknown>)[key];
    if (v !== undefined && typeof v !== 'boolean') {
      issues.push({ path: `${path}.${key}`, code: 'wrongType', message: `${path}.${key} must be a boolean` });
    }
  }
}

// ── Branding ──

function validateBranding(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!BRANDING_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown branding key "${key}"` });
      continue;
    }
    const v = value[key];
    if (key === 'navbarLogoHeight') {
      if (typeof v !== 'number') {
        issues.push({ path: `${path}.${key}`, code: 'wrongType', message: `${key} must be a number` });
      }
    } else if (key === 'themeTokens') {
      validateThemeTokens(v, `${path}.themeTokens`, issues);
    } else if (typeof v !== 'string') {
      issues.push({ path: `${path}.${key}`, code: 'wrongType', message: `${key} must be a string` });
    }
  }
}

function validateThemeTokens(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isPlainObject(value)) {
    issues.push({
      path,
      code: 'wrongType',
      message: `themeTokens must be an object of { '--tmx-*' | '--chc-*': string }`,
    });
    return;
  }
  for (const tokenName of Object.keys(value)) {
    if (!THEME_TOKEN_PREFIXES.some((prefix) => tokenName.startsWith(prefix))) {
      issues.push({
        path: `${path}.${tokenName}`,
        code: 'unknownField',
        message: `themeTokens key "${tokenName}" is outside the allowed prefixes (${THEME_TOKEN_PREFIXES.join(', ')})`,
      });
      continue;
    }
    if (typeof value[tokenName] !== 'string') {
      issues.push({
        path: `${path}.${tokenName}`,
        code: 'wrongType',
        message: `themeTokens value for "${tokenName}" must be a string`,
      });
    }
  }
}

// ── Permissions: caps ──

function validateCapsPermissions(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!CAPS_PERMISSION_KEY_SET.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown permission key "${key}"` });
      continue;
    }
    validatePermissionShape(key, value[key], path, issues);
  }
}

function validatePermissionShape(key: string, v: unknown, parentPath: string, issues: ValidationIssue[]): void {
  if ((ARRAY_PERMISSION_KEYS as ReadonlyArray<string>).includes(key)) {
    if (!isStringArray(v)) {
      issues.push({ path: `${parentPath}.${key}`, code: 'wrongType', message: `${key} must be an array of strings` });
    }
  } else if (typeof v !== 'boolean') {
    issues.push({ path: `${parentPath}.${key}`, code: 'wrongType', message: `${key} must be a boolean` });
  }
}

// ── Permissions: settings (with caps-respect) ──

function validateSettingsPermissions(
  settingsPerms: unknown,
  capsPerms: ProviderConfigCaps['permissions'] = {},
  path: string,
  issues: ValidationIssue[],
): void {
  if (settingsPerms === undefined) return;
  if (!isPlainObject(settingsPerms)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }

  for (const key of Object.keys(settingsPerms)) {
    if (!SETTINGS_PERMISSION_KEY_SET.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown permission key "${key}"` });
      continue;
    }
    const v = settingsPerms[key];
    validatePermissionShape(key, v, path, issues);

    if ((ARRAY_PERMISSION_KEYS as ReadonlyArray<string>).includes(key)) {
      checkArrayCap(key as ArrayPermissionKey, v, capsPerms, path, issues);
    } else {
      checkBooleanCap(key as BooleanPermissionKey, v, capsPerms, path, issues);
    }
  }
}

function checkBooleanCap(
  key: BooleanPermissionKey,
  value: unknown,
  capsPerms: ProviderConfigCaps['permissions'] = {},
  parentPath: string,
  issues: ValidationIssue[],
): void {
  if (capsPerms[key] === false && value === true) {
    issues.push({
      path: `${parentPath}.${key}`,
      code: 'exceedsCap',
      message: `${key} cannot be enabled — provisioner cap forbids it`,
    });
  }
}

function checkArrayCap(
  key: ArrayPermissionKey,
  value: unknown,
  capsPerms: ProviderConfigCaps['permissions'] = {},
  parentPath: string,
  issues: ValidationIssue[],
): void {
  const capsUniverse = capsPerms[key];
  if (capsUniverse === undefined || capsUniverse.length === 0) return;
  if (!isStringArray(value)) return;
  const allowed = new Set(capsUniverse);
  const disallowed = value.filter((item) => !allowed.has(item));
  if (disallowed.length > 0) {
    issues.push({
      path: `${parentPath}.${key}`,
      code: 'exceedsCap',
      message: `${key} contains values outside the provisioner-allowed universe`,
      disallowedValues: disallowed,
    });
  }
}

// ── Policies: caps ──

function validateCapsPolicies(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!CAPS_POLICY_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown caps policy key "${key}"` });
      continue;
    }
    if (key === 'allowedMatchUpFormats') {
      if (!isStringArray(value[key])) {
        issues.push({ path: `${path}.${key}`, code: 'wrongType', message: `${key} must be an array of strings` });
      }
    } else if (key === 'allowedCategories') {
      if (!isCategoryArray(value[key])) {
        issues.push({
          path: `${path}.${key}`,
          code: 'wrongType',
          message: `${key} must be an array of { ageCategoryCode, categoryName? } objects`,
        });
      }
    } else if (key === 'allowedTierSystems') {
      if (!isTierSystemArray(value[key])) {
        issues.push({
          path: `${path}.${key}`,
          code: 'wrongType',
          message: `${key} must be an array of { system, displayName?, values? } objects`,
        });
      }
    }
  }
}

// ── Policies: settings (with caps-respect on intersect-able fields) ──

function validateSettingsPolicies(
  settingsPolicies: unknown,
  capsPolicies: ProviderConfigCaps['policies'] = {},
  path: string,
  issues: ValidationIssue[],
): void {
  if (settingsPolicies === undefined) return;
  if (!isPlainObject(settingsPolicies)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }

  for (const key of Object.keys(settingsPolicies)) {
    if (!SETTINGS_POLICY_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown policy key "${key}"` });
      continue;
    }
    const v = settingsPolicies[key];
    if (key === 'allowedMatchUpFormats') {
      if (!isStringArray(v)) {
        issues.push({ path: `${path}.${key}`, code: 'wrongType', message: `${key} must be an array of strings` });
        continue;
      }
      const universe = capsPolicies.allowedMatchUpFormats;
      if (universe && universe.length > 0) {
        const allowed = new Set(universe);
        const disallowed = v.filter((item) => !allowed.has(item));
        if (disallowed.length > 0) {
          issues.push({
            path: `${path}.${key}`,
            code: 'exceedsCap',
            message: `${key} contains formats outside the provisioner-allowed universe`,
            disallowedValues: disallowed,
          });
        }
      }
    } else if (key === 'allowedCategories') {
      if (!isCategoryArray(v)) {
        issues.push({
          path: `${path}.${key}`,
          code: 'wrongType',
          message: `${key} must be an array of { ageCategoryCode, categoryName? } objects`,
        });
        continue;
      }
      const universe = capsPolicies.allowedCategories;
      if (universe && universe.length > 0) {
        const allowedCodes = new Set(universe.map((c) => c.ageCategoryCode));
        const disallowed = v.filter((c) => !allowedCodes.has(c.ageCategoryCode)).map((c) => c.ageCategoryCode);
        if (disallowed.length > 0) {
          issues.push({
            path: `${path}.${key}`,
            code: 'exceedsCap',
            message: `${key} contains categories outside the provisioner-allowed universe`,
            disallowedValues: disallowed,
          });
        }
      }
    } else if (key === 'allowedTierSystems') {
      if (!isTierSystemArray(v)) {
        issues.push({
          path: `${path}.${key}`,
          code: 'wrongType',
          message: `${key} must be an array of { system, displayName?, values? } objects`,
        });
        continue;
      }
      const universe = capsPolicies.allowedTierSystems;
      if (universe && universe.length > 0) {
        const allowedSystems = new Set(universe.map((t) => t.system));
        const disallowed = v.filter((t) => !allowedSystems.has(t.system)).map((t) => t.system);
        if (disallowed.length > 0) {
          issues.push({
            path: `${path}.${key}`,
            code: 'exceedsCap',
            message: `${key} contains tier systems outside the provisioner-allowed universe`,
            disallowedValues: disallowed,
          });
        }
      }
    } else if (key === 'schedulingPolicy') {
      validateSchedulingPolicy(v, `${path}.${key}`, issues);
    } else if (key === 'scoringPolicy') {
      validateScoringPolicy(v, `${path}.${key}`, issues);
    } else if (key === 'seedingPolicy') {
      validateSeedingPolicy(v, `${path}.${key}`, issues);
    } else if (key === 'rankingPointsPolicy') {
      validateRankingPointsPolicy(v, `${path}.${key}`, issues);
    }
  }
}

// ── Interior policy shapes ──
//
// These validators encode the field universes accepted by the factory engine
// as of factory v5. Source of truth is `factory/src/fixtures/policies/`:
// POLICY_SCHEDULING_DEFAULT / POLICY_SCHEDULING_NO_DAILY_LIMITS,
// POLICY_SCORING_DEFAULT  / POLICY_SCORING_USTA,
// POLICY_SEEDING_DEFAULT  / POLICY_SEEDING_ITF / POLICY_SEEDING_NATIONAL /
// POLICY_SEEDING_BYES. When factory adds a new policy field, this file needs
// the same field added or writes that use it will be rejected here.

const SCHEDULING_POLICY_KEYS = new Set([
  'allowModificationWhenMatchUpsScheduled',
  'defaultTimes',
  'defaultDailyLimits',
  'matchUpAverageTimes',
  'matchUpRecoveryTimes',
  'matchUpDailyLimits',
]);

const SCORING_POLICY_KEYS = new Set([
  'requireParticipantsForScoring',
  'requireAllPositionsAssigned',
  'allowChangePropagation',
  'defaultMatchUpFormat',
  'allowDeletionWithScoresPresent',
  'stage',
  'processCodes',
  'matchUpFormats',
  'matchUpStatusCodes',
]);

const SEEDING_POLICY_KEYS = new Set([
  'seedingProfile',
  'validSeedPositions',
  'duplicateSeedNumbers',
  'drawSizeProgression',
  'containerByesIgnoreSeeding',
  'policyName',
  'seedsCountThresholds',
]);

function validateSchedulingPolicy(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!SCHEDULING_POLICY_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown schedulingPolicy key "${key}"` });
      continue;
    }
    const v = value[key];
    const fieldPath = `${path}.${key}`;
    if (key === 'allowModificationWhenMatchUpsScheduled') {
      validateOptionalBoolMap(v, fieldPath, new Set(['courts', 'venues']), issues);
    } else if (key === 'defaultTimes') {
      validateDefaultTimes(v, fieldPath, issues);
    } else if (key === 'defaultDailyLimits') {
      validateNumberMap(v, fieldPath, issues);
    } else if (key === 'matchUpAverageTimes') {
      validateFormatTimeBlockArray(v, fieldPath, 'averageTimes', issues);
    } else if (key === 'matchUpRecoveryTimes') {
      validateFormatTimeBlockArray(v, fieldPath, 'recoveryTimes', issues);
    } else if (key === 'matchUpDailyLimits') {
      if (!Array.isArray(v)) {
        issues.push({ path: fieldPath, code: 'wrongType', message: `${key} must be an array` });
      }
    }
  }
}

function validateScoringPolicy(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!SCORING_POLICY_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown scoringPolicy key "${key}"` });
      continue;
    }
    const v = value[key];
    const fieldPath = `${path}.${key}`;
    if (
      key === 'requireParticipantsForScoring' ||
      key === 'requireAllPositionsAssigned' ||
      key === 'allowChangePropagation'
    ) {
      if (v !== undefined && typeof v !== 'boolean') {
        issues.push({ path: fieldPath, code: 'wrongType', message: `${key} must be a boolean` });
      }
    } else if (key === 'defaultMatchUpFormat') {
      if (typeof v !== 'string') {
        issues.push({ path: fieldPath, code: 'wrongType', message: `${key} must be a string` });
      }
    } else if (key === 'allowDeletionWithScoresPresent') {
      validateOptionalBoolMap(v, fieldPath, new Set(['drawDefinitions', 'structures']), issues);
    } else if (key === 'stage') {
      validateStageMap(v, fieldPath, issues);
    } else if (key === 'processCodes') {
      validateStringArrayMap(v, fieldPath, issues);
    } else if (key === 'matchUpFormats') {
      validateMatchUpFormats(v, fieldPath, issues);
    } else if (key === 'matchUpStatusCodes') {
      validateMatchUpStatusCodes(v, fieldPath, issues);
    }
  }
}

function validateSeedingPolicy(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!SEEDING_POLICY_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown seedingPolicy key "${key}"` });
      continue;
    }
    const v = value[key];
    const fieldPath = `${path}.${key}`;
    if (key === 'seedingProfile') {
      validateSeedingProfile(v, fieldPath, issues);
    } else if (key === 'validSeedPositions') {
      validateOptionalBoolMap(v, fieldPath, new Set(['ignore']), issues);
    } else if (
      key === 'duplicateSeedNumbers' ||
      key === 'drawSizeProgression' ||
      key === 'containerByesIgnoreSeeding'
    ) {
      if (typeof v !== 'boolean') {
        issues.push({ path: fieldPath, code: 'wrongType', message: `${key} must be a boolean` });
      }
    } else if (key === 'policyName') {
      if (typeof v !== 'string') {
        issues.push({ path: fieldPath, code: 'wrongType', message: `${key} must be a string` });
      }
    } else if (key === 'seedsCountThresholds') {
      validateSeedsCountThresholds(v, fieldPath, issues);
    }
  }
}

const RANKING_POINTS_POLICY_KEYS = new Set(['kind', 'name', 'version']);
const RANKING_POINTS_POLICY_KIND_SET: Set<string> = new Set(RANKING_POINTS_POLICY_KINDS);

function validateRankingPointsPolicy(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!RANKING_POINTS_POLICY_KEYS.has(key)) {
      issues.push({
        path: `${path}.${key}`,
        code: 'unknownField',
        message: `unknown rankingPointsPolicy key "${key}"`,
      });
      continue;
    }
    const v = (value as Record<string, unknown>)[key];
    const fieldPath = `${path}.${key}`;
    if (key === 'kind') {
      if (typeof v !== 'string') {
        issues.push({ path: fieldPath, code: 'wrongType', message: `${key} must be a string` });
      } else if (!RANKING_POINTS_POLICY_KIND_SET.has(v)) {
        issues.push({
          path: fieldPath,
          code: 'exceedsCap',
          message: `${key} must be one of: ${[...RANKING_POINTS_POLICY_KIND_SET].join(', ')}`,
          disallowedValues: [v],
        });
      }
    } else if (key === 'name' || key === 'version') {
      if (typeof v !== 'string') {
        issues.push({ path: fieldPath, code: 'wrongType', message: `${key} must be a string` });
      }
    }
  }
  // kind is required when the field is declared (i.e. when the object exists at all)
  if (!Object.prototype.hasOwnProperty.call(value, 'kind')) {
    issues.push({
      path: `${path}.kind`,
      code: 'wrongType',
      message: `${path}.kind is required when rankingPointsPolicy is declared`,
    });
  }
}

// ── Shared interior helpers ──

function validateOptionalBoolMap(
  value: unknown,
  path: string,
  allowedKeys: Set<string>,
  issues: ValidationIssue[],
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const k of Object.keys(value)) {
    if (!allowedKeys.has(k)) {
      issues.push({ path: `${path}.${k}`, code: 'unknownField', message: `unknown key "${k}" under ${path}` });
      continue;
    }
    if (typeof value[k] !== 'boolean') {
      issues.push({ path: `${path}.${k}`, code: 'wrongType', message: `${path}.${k} must be a boolean` });
    }
  }
}

function validateNumberMap(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object of string → number` });
    return;
  }
  for (const k of Object.keys(value)) {
    if (typeof value[k] !== 'number') {
      issues.push({ path: `${path}.${k}`, code: 'wrongType', message: `${path}.${k} must be a number` });
    }
  }
}

function validateStringArrayMap(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object of string → string[]` });
    return;
  }
  for (const k of Object.keys(value)) {
    if (!isStringArray(value[k])) {
      issues.push({ path: `${path}.${k}`, code: 'wrongType', message: `${path}.${k} must be an array of strings` });
    }
  }
}

function validateDefaultTimes(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  const allowedKeys = new Set(['averageTimes', 'recoveryTimes']);
  for (const k of Object.keys(value)) {
    if (!allowedKeys.has(k)) {
      issues.push({ path: `${path}.${k}`, code: 'unknownField', message: `unknown key "${k}" under ${path}` });
      continue;
    }
    if (!Array.isArray(value[k])) {
      issues.push({ path: `${path}.${k}`, code: 'wrongType', message: `${path}.${k} must be an array` });
      continue;
    }
    for (let i = 0; i < value[k].length; i++) {
      if (!isPlainObject(value[k][i])) {
        issues.push({
          path: `${path}.${k}[${i}]`,
          code: 'wrongType',
          message: `${path}.${k}[${i}] must be an object`,
        });
      }
    }
  }
}

function validateFormatTimeBlockArray(
  value: unknown,
  path: string,
  innerKey: 'averageTimes' | 'recoveryTimes',
  issues: ValidationIssue[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an array` });
    return;
  }
  for (let i = 0; i < value.length; i++) {
    const entry = value[i];
    const entryPath = `${path}[${i}]`;
    if (!isPlainObject(entry)) {
      issues.push({ path: entryPath, code: 'wrongType', message: `${entryPath} must be an object` });
      continue;
    }
    if (!isStringArray(entry.matchUpFormatCodes)) {
      issues.push({
        path: `${entryPath}.matchUpFormatCodes`,
        code: 'wrongType',
        message: `${entryPath}.matchUpFormatCodes must be an array of strings`,
      });
    }
    if (!Array.isArray(entry[innerKey])) {
      issues.push({
        path: `${entryPath}.${innerKey}`,
        code: 'wrongType',
        message: `${entryPath}.${innerKey} must be an array`,
      });
    }
  }
}

function validateStageMap(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object keyed by stage name` });
    return;
  }
  for (const stage of Object.keys(value)) {
    const stageEntry = value[stage];
    const stagePath = `${path}.${stage}`;
    if (!isPlainObject(stageEntry)) {
      issues.push({ path: stagePath, code: 'wrongType', message: `${stagePath} must be an object` });
      continue;
    }
    if (stageEntry.stageSequence === undefined) continue;
    if (!isPlainObject(stageEntry.stageSequence)) {
      issues.push({
        path: `${stagePath}.stageSequence`,
        code: 'wrongType',
        message: `${stagePath}.stageSequence must be an object keyed by sequence number`,
      });
      continue;
    }
    for (const seq of Object.keys(stageEntry.stageSequence)) {
      const seqEntry = stageEntry.stageSequence[seq];
      const seqPath = `${stagePath}.stageSequence.${seq}`;
      if (!isPlainObject(seqEntry)) {
        issues.push({ path: seqPath, code: 'wrongType', message: `${seqPath} must be an object` });
        continue;
      }
      if (
        seqEntry.requireAllPositionsAssigned !== undefined &&
        typeof seqEntry.requireAllPositionsAssigned !== 'boolean'
      ) {
        issues.push({
          path: `${seqPath}.requireAllPositionsAssigned`,
          code: 'wrongType',
          message: `${seqPath}.requireAllPositionsAssigned must be a boolean`,
        });
      }
    }
  }
}

function validateMatchUpFormats(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an array` });
    return;
  }
  for (let i = 0; i < value.length; i++) {
    const entry = value[i];
    const entryPath = `${path}[${i}]`;
    if (!isPlainObject(entry)) {
      issues.push({ path: entryPath, code: 'wrongType', message: `${entryPath} must be an object` });
      continue;
    }
    if (typeof entry.matchUpFormat !== 'string') {
      issues.push({
        path: `${entryPath}.matchUpFormat`,
        code: 'wrongType',
        message: `${entryPath}.matchUpFormat must be a string`,
      });
    }
    if (entry.description !== undefined && typeof entry.description !== 'string') {
      issues.push({
        path: `${entryPath}.description`,
        code: 'wrongType',
        message: `${entryPath}.description must be a string`,
      });
    }
    if (entry.categoryNames !== undefined && !isStringArray(entry.categoryNames)) {
      issues.push({
        path: `${entryPath}.categoryNames`,
        code: 'wrongType',
        message: `${entryPath}.categoryNames must be an array of strings`,
      });
    }
    if (entry.categoryTypes !== undefined && !isStringArray(entry.categoryTypes)) {
      issues.push({
        path: `${entryPath}.categoryTypes`,
        code: 'wrongType',
        message: `${entryPath}.categoryTypes must be an array of strings`,
      });
    }
  }
}

function validateMatchUpStatusCodes(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object keyed by matchUpStatus` });
    return;
  }
  for (const status of Object.keys(value)) {
    const entries = value[status];
    const statusPath = `${path}.${status}`;
    if (!Array.isArray(entries)) {
      issues.push({ path: statusPath, code: 'wrongType', message: `${statusPath} must be an array` });
      continue;
    }
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const entryPath = `${statusPath}[${i}]`;
      if (!isPlainObject(entry)) {
        issues.push({ path: entryPath, code: 'wrongType', message: `${entryPath} must be an object` });
        continue;
      }
      if (typeof entry.matchUpStatusCode !== 'string') {
        issues.push({
          path: `${entryPath}.matchUpStatusCode`,
          code: 'wrongType',
          message: `${entryPath}.matchUpStatusCode must be a string`,
        });
      }
      for (const optionalStringKey of ['matchUpStatusCodeDisplay', 'label', 'description']) {
        if (entry[optionalStringKey] !== undefined && typeof entry[optionalStringKey] !== 'string') {
          issues.push({
            path: `${entryPath}.${optionalStringKey}`,
            code: 'wrongType',
            message: `${entryPath}.${optionalStringKey} must be a string`,
          });
        }
      }
    }
  }
}

function validateSeedingProfile(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  const allowedKeys = new Set(['drawTypes', 'positioning']);
  for (const k of Object.keys(value)) {
    if (!allowedKeys.has(k)) {
      issues.push({ path: `${path}.${k}`, code: 'unknownField', message: `unknown key "${k}" under ${path}` });
      continue;
    }
    if (k === 'positioning') {
      if (typeof value[k] !== 'string') {
        issues.push({ path: `${path}.${k}`, code: 'wrongType', message: `${path}.${k} must be a string` });
      }
    } else if (k === 'drawTypes') {
      if (!isPlainObject(value[k])) {
        issues.push({
          path: `${path}.${k}`,
          code: 'wrongType',
          message: `${path}.${k} must be an object keyed by draw type`,
        });
        continue;
      }
      for (const drawType of Object.keys(value[k])) {
        const dtEntry = value[k][drawType];
        const dtPath = `${path}.${k}.${drawType}`;
        if (!isPlainObject(dtEntry)) {
          issues.push({ path: dtPath, code: 'wrongType', message: `${dtPath} must be an object` });
          continue;
        }
        if (dtEntry.positioning !== undefined && typeof dtEntry.positioning !== 'string') {
          issues.push({
            path: `${dtPath}.positioning`,
            code: 'wrongType',
            message: `${dtPath}.positioning must be a string`,
          });
        }
      }
    }
  }
}

function validateSeedsCountThresholds(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an array` });
    return;
  }
  for (let i = 0; i < value.length; i++) {
    const entry = value[i];
    const entryPath = `${path}[${i}]`;
    if (!isPlainObject(entry)) {
      issues.push({ path: entryPath, code: 'wrongType', message: `${entryPath} must be an object` });
      continue;
    }
    for (const numericKey of ['drawSize', 'minimumParticipantCount', 'seedsCount']) {
      if (typeof entry[numericKey] !== 'number') {
        issues.push({
          path: `${entryPath}.${numericKey}`,
          code: 'wrongType',
          message: `${entryPath}.${numericKey} must be a number`,
        });
      }
    }
  }
}

// ── Defaults ──

function validateDefaults(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!SETTINGS_DEFAULTS_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown default key "${key}"` });
      continue;
    }
    if (typeof value[key] !== 'string') {
      issues.push({ path: `${path}.${key}`, code: 'wrongType', message: `${key} must be a string` });
    }
  }
}

// ── Integrations ──

function validateIntegrations(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!INTEGRATIONS_ALLOWED_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown integrations key "${key}"` });
      continue;
    }
    if (key === 'scoringLaunch') {
      validateScoringLaunch(value[key], `${path}.scoringLaunch`, issues);
      continue;
    }
    if (typeof value[key] !== 'string') {
      issues.push({ path: `${path}.${key}`, code: 'wrongType', message: `${key} must be a string` });
    }
  }
}

function validateScoringLaunch(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isPlainObject(value)) {
    issues.push({ path, code: 'wrongType', message: `${path} must be an object` });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!SCORING_LAUNCH_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, code: 'unknownField', message: `unknown scoringLaunch key "${key}"` });
    }
  }

  const app = value.app;
  if (typeof app !== 'string') {
    issues.push({ path: `${path}.app`, code: 'wrongType', message: 'app must be a string' });
  } else if (!SCORING_LAUNCH_APP_SET.has(app)) {
    issues.push({
      path: `${path}.app`,
      code: 'exceedsCap',
      message: `app must be one of: ${[...SCORING_LAUNCH_APP_SET].join(', ')}`,
      disallowedValues: [app],
    });
  }

  const urlTemplate = value.urlTemplate;
  if (urlTemplate !== undefined) {
    if (typeof urlTemplate !== 'string') {
      issues.push({ path: `${path}.urlTemplate`, code: 'wrongType', message: 'urlTemplate must be a string' });
    } else {
      const unknownPlaceholders = scoringLaunchPlaceholders(urlTemplate).filter(
        (name) => !SCORING_LAUNCH_PLACEHOLDER_SET.has(name),
      );
      if (unknownPlaceholders.length) {
        issues.push({
          path: `${path}.urlTemplate`,
          code: 'exceedsCap',
          message: `unknown placeholder(s): ${unknownPlaceholders.join(', ')}. Allowed: ${[...SCORING_LAUNCH_PLACEHOLDER_SET].join(', ')}`,
          disallowedValues: unknownPlaceholders,
        });
      }
    }
  }

  // urlTemplate is required (and must be non-empty) only for EXTERNAL.
  if (app === 'EXTERNAL' && (typeof urlTemplate !== 'string' || urlTemplate.length === 0)) {
    issues.push({
      path: `${path}.urlTemplate`,
      code: 'wrongType',
      message: 'urlTemplate is required when app is "EXTERNAL"',
    });
  }
}

// ── Helpers ──

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === 'string');
}

function isCategoryArray(v: unknown): v is Array<{ ageCategoryCode: string; categoryName?: string }> {
  if (!Array.isArray(v)) return false;
  return v.every(
    (c) =>
      isPlainObject(c) &&
      typeof c.ageCategoryCode === 'string' &&
      (c.categoryName === undefined || typeof c.categoryName === 'string'),
  );
}

function isTierSystemArray(v: unknown): v is Array<{ system: string; displayName?: string; values?: string[] }> {
  if (!Array.isArray(v)) return false;
  return v.every(
    (t) =>
      isPlainObject(t) &&
      typeof t.system === 'string' &&
      (t.displayName === undefined || typeof t.displayName === 'string') &&
      (t.values === undefined || isStringArray(t.values)),
  );
}
