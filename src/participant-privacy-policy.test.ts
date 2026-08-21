import { describe, expect, it } from 'vitest';

import { computeEffectiveConfig, resolveParticipantPrivacy } from './effective-config';
import { validateCaps, validateSettings } from './validators';

const ITA = { name: 'ITA' };
const STRICT = { name: 'STANFORD_STRICT', version: '2026.1' };

describe('resolveParticipantPrivacy', () => {
  it('reports NONE when neither tier declares anything', () => {
    expect(resolveParticipantPrivacy({}, {})).toEqual({ source: 'NONE' });
  });

  it('resolves the provisioner floor as the policy when the provider declares nothing', () => {
    // The ITA case: one provisioner declares once, ~1,032 schools inherit it
    // without configuring anything.
    expect(resolveParticipantPrivacy({ participantPrivacyPolicyRef: ITA }, {})).toEqual({
      policyRef: ITA,
      floor: ITA,
      source: 'CAPS',
    });
  });

  it('lets the provider declaration win over the floor', () => {
    // The floor is a MINIMUM, not an override — a school must be able to be
    // stricter than its federation.
    const result = resolveParticipantPrivacy(
      { participantPrivacyPolicyRef: ITA },
      { participantPrivacyPolicyRef: STRICT },
    );
    expect(result.policyRef).toEqual(STRICT);
    expect(result.source).toBe('SETTINGS');
  });

  it('STILL reports the floor when the provider declares its own policy', () => {
    // Load-bearing: a consumer enforces "at least as restrictive as the floor"
    // using this field. Dropping it when settings wins is exactly how a provider
    // would silently loosen a provisioner's floor — the failure this exists to
    // prevent. This assertion fails if `floor` is only returned in the CAPS case.
    const viaRef = resolveParticipantPrivacy(
      { participantPrivacyPolicyRef: ITA },
      { participantPrivacyPolicyRef: STRICT },
    );
    expect(viaRef.floor).toEqual(ITA);

    const viaInline = resolveParticipantPrivacy(
      { participantPrivacyPolicyRef: ITA },
      { participantPrivacyPolicy: { participant: { policyName: 'inline' } } },
    );
    expect(viaInline.floor).toEqual(ITA);
  });

  it('returns the inline policy when that is what the provider declared', () => {
    const inline = { participant: { policyName: 'One-off' } };
    const result = resolveParticipantPrivacy({}, { participantPrivacyPolicy: inline });
    expect(result).toEqual({ policy: inline, floor: undefined, source: 'SETTINGS' });
  });

  it('treats an empty inline object as no declaration, not as an empty policy', () => {
    // An empty object would otherwise resolve to "a policy that names nothing",
    // and `attributeFilter` copies only what a template names — i.e. it would
    // strip everything rather than mean "unset".
    expect(resolveParticipantPrivacy({}, { participantPrivacyPolicy: {} })).toEqual({ source: 'NONE' });
  });

  it('tolerates undefined tiers', () => {
    expect(resolveParticipantPrivacy(undefined, undefined)).toEqual({ source: 'NONE' });
  });
});

describe('computeEffectiveConfig — participant privacy policy', () => {
  it('surfaces the caps ref as both the effective ref and the floor', () => {
    const result = computeEffectiveConfig({ participantPrivacyPolicyRef: ITA }, {});
    expect(result.participantPrivacyPolicyRef).toEqual(ITA);
    expect(result.participantPrivacyPolicyFloor).toEqual(ITA);
  });

  it('surfaces the settings ref as effective while keeping the caps floor visible', () => {
    const result = computeEffectiveConfig(
      { participantPrivacyPolicyRef: ITA },
      { participantPrivacyPolicyRef: STRICT },
    );
    expect(result.participantPrivacyPolicyRef).toEqual(STRICT);
    expect(result.participantPrivacyPolicyFloor).toEqual(ITA);
  });

  it('leaves both undefined when neither tier declares one', () => {
    const result = computeEffectiveConfig({}, {});
    expect(result.participantPrivacyPolicyRef).toBeUndefined();
    expect(result.participantPrivacyPolicyFloor).toBeUndefined();
  });

  it('does not disturb the pre-existing inline field', () => {
    const inline = { participant: { policyName: 'Legacy' } };
    expect(computeEffectiveConfig({}, { participantPrivacyPolicy: inline }).participantPrivacyPolicy).toEqual(inline);
  });
});

describe('validation — participantPrivacyPolicyRef', () => {
  it('accepts a well-formed ref on either tier', () => {
    expect(validateCaps({ participantPrivacyPolicyRef: ITA })).toEqual([]);
    expect(validateSettings({ participantPrivacyPolicyRef: STRICT }, {})).toEqual([]);
  });

  it('rejects a ref with no usable name', () => {
    for (const bad of [{}, { name: '' }, { name: '   ' }, { name: 7 }]) {
      const issues = validateSettings({ participantPrivacyPolicyRef: bad }, {});
      expect(issues.map((i) => i.path)).toContain('participantPrivacyPolicyRef.name');
    }
  });

  it('rejects a non-object ref', () => {
    const issues = validateSettings({ participantPrivacyPolicyRef: 'ITA' }, {});
    expect(issues.map((i) => i.path)).toContain('participantPrivacyPolicyRef');
  });

  it('rejects a non-string version', () => {
    const issues = validateSettings({ participantPrivacyPolicyRef: { name: 'ITA', version: 3 } }, {});
    expect(issues.map((i) => i.path)).toContain('participantPrivacyPolicyRef.version');
  });

  it('rejects unknown keys on the ref rather than ignoring them', () => {
    // A typo'd key that is silently dropped is how a provider believes it
    // configured something it did not.
    const issues = validateSettings({ participantPrivacyPolicyRef: { name: 'ITA', polcy: {} } }, {});
    expect(issues.map((i) => i.path)).toContain('participantPrivacyPolicyRef.polcy');
  });

  it('rejects declaring the inline policy and the ref together', () => {
    // Mutually exclusive by design: inventing a precedence here would make the
    // effective policy depend on a rule nobody wrote down.
    const issues = validateSettings(
      { participantPrivacyPolicy: { participant: {} }, participantPrivacyPolicyRef: ITA },
      {},
    );
    expect(issues.map((i) => i.code)).toContain('conflict');
  });

  it('validates the caps ref too, not only the settings one', () => {
    const issues = validateCaps({ participantPrivacyPolicyRef: { name: '' } });
    expect(issues.map((i) => i.path)).toContain('participantPrivacyPolicyRef.name');
  });

  it('still rejects genuinely unknown top-level keys', () => {
    // Control: proves the allow-list widening did not open the gate generally.
    expect(validateCaps({ participantPrivacyPolicyRefs: ITA }).map((i) => i.code)).toContain('unknownField');
    expect(validateSettings({ participantPrivacyPolicyReff: ITA }, {}).map((i) => i.code)).toContain('unknownField');
  });
});

describe('participantPrivacy.sex — the per-provider gender opt-in', () => {
  const eff = (caps: any, settings: any) => computeEffectiveConfig(caps, settings).participantPrivacy;

  it('is closed when nobody has said anything', () => {
    // Privacy-first: the shipped default strips person.sex and that does not change.
    expect(eff({}, {})?.sex).toBe(false);
  });

  it('opens when the provisioner enables it — the ITA case, set once for ~1,032 schools', () => {
    expect(eff({ participantPrivacy: { sex: true } }, {})?.sex).toBe(true);
  });

  it('does NOT open on a provider asserting it alone', () => {
    // A provider cannot grant itself an attribute the provisioner has not enabled.
    expect(eff({}, { participantPrivacy: { sex: true } })?.sex).toBe(false);
  });

  it('lets a provider turn it back off — more private is always allowed', () => {
    expect(eff({ participantPrivacy: { sex: true } }, { participantPrivacy: { sex: false } })?.sex).toBe(false);
  });

  it('stays open when the provider simply says nothing', () => {
    expect(eff({ participantPrivacy: { sex: true } }, { participantPrivacy: {} })?.sex).toBe(true);
  });

  it('leaves cityState on its original settings-only rule', () => {
    // Unchanged behaviour: nothing relying on cityState moves because sex arrived.
    expect(eff({}, { participantPrivacy: { cityState: true } })?.cityState).toBe(true);
    expect(eff({ participantPrivacy: { cityState: true } }, {})?.cityState).toBe(false);
  });

  it('accepts the toggle on both tiers and still rejects unknown privacy keys', () => {
    expect(validateCaps({ participantPrivacy: { sex: true } })).toEqual([]);
    expect(validateSettings({ participantPrivacy: { sex: false } }, {})).toEqual([]);
    expect(validateSettings({ participantPrivacy: { sexe: true } }, {}).map((i) => i.code)).toContain('unknownField');
  });
});
