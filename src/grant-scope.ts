/**
 * Scoped capability grants — the canonical predicate, shared by every consumer.
 *
 * A permission without a scope answers the wrong question. `canEnterScores` is a
 * global boolean: it cannot express that a volunteer may score on Court 7 but
 * not the final on Centre. A grant supplies the missing dimension.
 *
 * ## Why this lives here
 *
 * The server enforces scope and the client shapes its UI to match. Two
 * implementations of one predicate WILL drift, and a drift means TMX offers a
 * control the server then refuses. This package is the one artifact both repos
 * already import — the same argument that put `MUTATION_PERMISSIONS` here.
 *
 * ## Vocabulary
 *
 * Scope keys are the factory's `filterMatchUps` parameters: same names, same
 * meanings. A second predicate language would drift from the first.
 *
 * A **target** names the single thing a mutation acts on, in singular fields
 * (`courtId`), while a **scope** lists permitted values in plural keys
 * (`courtIds`). Keeping the two shapes distinct avoids the awkward
 * `matchUpIds: 'm1'` — a plural key holding one value — that an earlier
 * server-local version used.
 *
 * ## Two rules that fail closed
 *
 * A target that cannot answer a constrained dimension is refused: an
 * unscheduled matchUp is not on Court 7, so a Court-7 grant does not cover it.
 * A scope carrying an unrecognized key is refused rather than ignored — the safe
 * reading of an unintelligible restriction is not to wave the mutation through.
 */
import { MUTATION_PERMISSIONS } from './mutation-permissions';

import type { ProviderPermissions } from './types';

/** Scope dimensions, drawn from the factory's filterMatchUps vocabulary. */
export const SCOPE_KEYS = [
  'eventIds',
  'drawIds',
  'structureIds',
  'venueIds',
  'courtIds',
  'scheduledDates',
  'matchUpIds',
] as const;

export type ScopeKey = (typeof SCOPE_KEYS)[number];

/** Permitted values per dimension. `{}` means tournament-wide. */
export type GrantScope = Partial<Record<ScopeKey, string[]>>;

/** The single thing a mutation acts on. Singular by design — see the note above. */
export type ScopeTarget = {
  matchUpId?: string;
  eventId?: string;
  drawId?: string;
  structureId?: string;
  venueId?: string;
  courtId?: string;
  scheduledDate?: string;
};

/** Which scope key each target field answers. */
export const SCOPE_KEY_FOR_FIELD: Readonly<Record<keyof ScopeTarget, ScopeKey>> = {
  matchUpId: 'matchUpIds',
  eventId: 'eventIds',
  drawId: 'drawIds',
  structureId: 'structureIds',
  venueId: 'venueIds',
  courtId: 'courtIds',
  scheduledDate: 'scheduledDates',
};

const FIELD_FOR_SCOPE_KEY = Object.fromEntries(
  Object.entries(SCOPE_KEY_FOR_FIELD).map(([field, key]) => [key, field]),
) as Readonly<Record<ScopeKey, keyof ScopeTarget>>;

const SCOPE_KEY_SET: ReadonlySet<string> = new Set(SCOPE_KEYS);

/** A grant capability covering every method — a full grant narrowed only by scope. */
export const GRANT_CAPABILITY_ALL = '*';

export function isTournamentWide(scope: GrantScope | undefined): boolean {
  return !scope || Object.keys(scope).length === 0;
}

/** Is every key in this scope one this predicate can evaluate? */
export function isEvaluableScope(scope: GrantScope | undefined): boolean {
  if (!scope) return true;
  return Object.keys(scope).every((key) => SCOPE_KEY_SET.has(key));
}

/**
 * Is the grant live right now?
 *
 * Delivery roles are shift-based and handed over; a grant that outlives its
 * shift is the same class of defect as one that was never scoped.
 */
export function isWithinWindow(
  grant: { notBefore?: string | Date | null; notAfter?: string | Date | null },
  now: Date = new Date(),
): boolean {
  if (grant.notBefore && new Date(grant.notBefore) > now) return false;
  if (grant.notAfter && new Date(grant.notAfter) < now) return false;
  return true;
}

/** Does `target` fall inside `scope`? AND across keys, OR within a key. */
export function isTargetInScope(scope: GrantScope | undefined, target: ScopeTarget): boolean {
  if (isTournamentWide(scope)) return true;
  if (!isEvaluableScope(scope)) return false;

  for (const [key, allowed] of Object.entries(scope as Record<string, string[]>)) {
    if (!Array.isArray(allowed) || !allowed.length) continue; // empty list = unrestricted on this axis
    const field = FIELD_FOR_SCOPE_KEY[key as ScopeKey];
    const value = field ? target[field] : undefined;
    if (!value) return false; // target cannot answer this dimension → not covered
    if (!allowed.includes(value)) return false;
  }
  return true;
}

/**
 * Target fields a scope actually constrains.
 *
 * Lets a caller resolve only what it must — some fields are free from mutation
 * params while others require walking the tournament record, and that walk
 * should not be paid for by grants that do not need it.
 */
export function requiredTargetFields(scope: GrantScope | undefined): (keyof ScopeTarget)[] {
  if (isTournamentWide(scope)) return [];
  return Object.entries(scope as Record<string, string[]>)
    .filter(([key, allowed]) => SCOPE_KEY_SET.has(key) && Array.isArray(allowed) && allowed.length > 0)
    .map(([key]) => FIELD_FOR_SCOPE_KEY[key as ScopeKey]);
}

/** Does a grant's capability cover this permission key? */
export function grantCoversCapability(
  capability: string | undefined,
  key: keyof ProviderPermissions | undefined,
): boolean {
  if (capability === GRANT_CAPABILITY_ALL) return true;
  if (!capability || !key) return false;
  return capability === key;
}

/**
 * Does a grant's capability cover this mutation method?
 *
 * Capabilities are stored as `ProviderPermissions` keys, which is what
 * `MUTATION_PERMISSIONS` already maps methods onto, so the two vocabularies
 * cannot drift.
 *
 * A method with no entry in that map is covered ONLY by an explicit wildcard:
 * an unmapped method reaching a grant-holder is something new and unclassified,
 * and the safe reading of "I cannot tell what capability this needs" is to
 * refuse. Subjects holding no grants are unaffected — the check is skipped.
 */
export function grantCoversMethod(capability: string | undefined, method: string): boolean {
  if (capability === GRANT_CAPABILITY_ALL) return true;
  if (!capability) return false;
  return MUTATION_PERMISSIONS[method] === capability;
}
