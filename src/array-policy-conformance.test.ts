import { describe, it, expect } from 'vitest';

import { ARRAY_POLICY_KEYS, computeEffectiveConfig, validateCaps, validateSettings } from './index';

/**
 * Every array policy must survive the caps ∩ settings merge.
 *
 * `allowedTierSystems` was declared in both config tiers, listed in ARRAY_POLICY_KEYS, and
 * documented as driving TMX's tier-system select — but `mergePolicies` never intersected it, so
 * `computeEffectiveConfig` dropped it silently. Nothing failed: the effective config was simply
 * missing the key, and every consumer read `?? []` and rendered its "nothing configured"
 * fallback. TMX's select and the courthive-ams sanctioning wizard's tier control were both
 * unreachable in production for as long as the field had existed.
 *
 * A per-key test would not have caught it either, because nobody writes a test for the key they
 * forgot. This iterates ARRAY_POLICY_KEYS itself, so adding a key without merging it fails
 * here — the omission is what is under test, not any individual policy.
 */

/** A representative non-empty value for each array policy, keyed by identity where relevant. */
const SAMPLES: Record<string, unknown[]> = {
  allowedMatchUpFormats: ['SET3-S:6/TB7'],
  allowedCategories: [{ ageCategoryCode: 'U18' }],
  allowedTierSystems: [{ system: 'ITF_JUNIOR', displayName: 'ITF Junior', values: ['J100'] }],
  allowedGoverningBodies: [{ governingBodyId: 'itf', displayName: 'ITF World Tennis Tour' }],
  allowedCollegeDivisions: ['DI'],
};

describe('array policies survive computeEffectiveConfig', () => {
  it('has a sample for every declared array policy', () => {
    // Guards the guard: a new key with no sample would otherwise skip its own conformance case.
    expect(Object.keys(SAMPLES).toSorted((a, b) => a.localeCompare(b))).toEqual(
      [...ARRAY_POLICY_KEYS].toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it.each([...ARRAY_POLICY_KEYS])('%s survives when set on caps and settings alike', (key) => {
    const value = SAMPLES[key];
    const effective = computeEffectiveConfig({ policies: { [key]: value } }, { policies: { [key]: value } });
    expect(effective.policies?.[key]).toEqual(value);
  });

  it.each([...ARRAY_POLICY_KEYS])('%s survives when set on settings only', (key) => {
    const value = SAMPLES[key];
    const effective = computeEffectiveConfig({}, { policies: { [key]: value } });
    expect(effective.policies?.[key]).toEqual(value);
  });

  it.each([...ARRAY_POLICY_KEYS])('%s survives when set on caps only', (key) => {
    // A cap with no provider narrowing still constrains the provider.
    const value = SAMPLES[key];
    const effective = computeEffectiveConfig({ policies: { [key]: value } }, {});
    expect(effective.policies?.[key]).toEqual(value);
  });

  it.each([...ARRAY_POLICY_KEYS])('%s is absent when neither tier sets it', (key) => {
    const effective = computeEffectiveConfig({}, {});
    expect(effective.policies?.[key]).toBeUndefined();
  });
});

describe('array policy intersection', () => {
  it('narrows tier systems to those the cap permits', () => {
    const effective = computeEffectiveConfig(
      { policies: { allowedTierSystems: [{ system: 'ITF_JUNIOR' }, { system: 'ATP' }] } },
      { policies: { allowedTierSystems: [{ system: 'ATP' }] } },
    );
    expect(effective.policies?.allowedTierSystems).toEqual([{ system: 'ATP' }]);
  });

  it('drops a tier system the provider asks for but the cap does not permit', () => {
    const effective = computeEffectiveConfig(
      { policies: { allowedTierSystems: [{ system: 'ITF_JUNIOR' }] } },
      { policies: { allowedTierSystems: [{ system: 'NOT_PERMITTED' }] } },
    );
    expect(effective.policies?.allowedTierSystems).toEqual([]);
  });

  it('narrows governing bodies to those the cap permits', () => {
    const effective = computeEffectiveConfig(
      { policies: { allowedGoverningBodies: [{ governingBodyId: 'itf' }, { governingBodyId: 'usta' }] } },
      { policies: { allowedGoverningBodies: [{ governingBodyId: 'usta' }] } },
    );
    expect(effective.policies?.allowedGoverningBodies).toEqual([{ governingBodyId: 'usta' }]);
  });

  it('leaves college divisions absent for a provider whose provisioner grants none', () => {
    // The ITA-only case: no cap, no setting -> the courthive-ams wizard omits the field
    // entirely rather than offering college divisions to a provider that runs no college play.
    const effective = computeEffectiveConfig({}, { policies: { allowedTierSystems: [{ system: 'ATP' }] } });
    expect(effective.policies?.allowedCollegeDivisions).toBeUndefined();
  });

  it('passes college divisions through for a provider under a college provisioner', () => {
    const effective = computeEffectiveConfig({ policies: { allowedCollegeDivisions: ['DI', 'DII'] } }, {});
    expect(effective.policies?.allowedCollegeDivisions).toEqual(['DI', 'DII']);
  });
});

describe('validators for the new policies', () => {
  it('accepts a well-formed governing-body cap', () => {
    const issues = validateCaps({ policies: { allowedGoverningBodies: [{ governingBodyId: 'itf' }] } });
    expect(issues).toEqual([]);
  });

  it('rejects a malformed governing-body entry', () => {
    const issues = validateCaps({ policies: { allowedGoverningBodies: [{ displayName: 'no id' }] } as any });
    expect(issues.map((i) => i.code)).toContain('wrongType');
  });

  it('rejects a settings governing body outside the cap universe', () => {
    const issues = validateSettings(
      { policies: { allowedGoverningBodies: [{ governingBodyId: 'usta' }] } },
      { policies: { allowedGoverningBodies: [{ governingBodyId: 'itf' }] } },
    );
    expect(issues.map((i) => i.code)).toContain('exceedsCap');
    expect(issues[0].disallowedValues).toEqual(['usta']);
  });

  it('accepts college divisions the provisioner granted', () => {
    const issues = validateSettings(
      { policies: { allowedCollegeDivisions: ['DI'] } },
      { policies: { allowedCollegeDivisions: ['DI', 'DII'] } },
    );
    expect(issues).toEqual([]);
  });

  it('refuses college divisions when the provisioner granted NONE', () => {
    // Deliberately stricter than the other allowedX lists, where an absent cap means "no
    // opinion". College play is provisioner-enabled: a provider under a non-college
    // provisioner must not be able to grant itself divisions.
    const issues = validateSettings({ policies: { allowedCollegeDivisions: ['DI'] } }, {});
    expect(issues.map((i) => i.code)).toContain('exceedsCap');
    expect(issues[0].disallowedValues).toEqual(['DI']);
  });

  it('refuses a division outside a granted universe', () => {
    const issues = validateSettings(
      { policies: { allowedCollegeDivisions: ['DI', 'NAIA'] } },
      { policies: { allowedCollegeDivisions: ['DI'] } },
    );
    expect(issues[0].disallowedValues).toEqual(['NAIA']);
  });
});
