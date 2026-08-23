# Changelog

## [0.17.0](https://github.com/CourtHive/provider-config/compare/v0.16.0...v0.17.0) (2026-08-23)


### Features

* **permissions:** gate per-matchUp check-in mutations ([#76](https://github.com/CourtHive/provider-config/issues/76)) ([4f2688a](https://github.com/CourtHive/provider-config/commit/4f2688a12eed0f955bee04efb2df5c1270c31c2a))

## [0.16.0](https://github.com/CourtHive/provider-config/compare/v0.15.0...v0.16.0) (2026-08-23)


### Features

* **permissions:** map every client-reachable mutation ([#74](https://github.com/CourtHive/provider-config/issues/74)) ([e5b15e7](https://github.com/CourtHive/provider-config/commit/e5b15e77880fe3140b758c2665bd71cbc450934d))

## [0.15.0](https://github.com/CourtHive/provider-config/compare/v0.14.0...v0.15.0) (2026-08-21)


### Features

* **privacy:** per-provider person.sex toggle, enabled by the provisioner ([#72](https://github.com/CourtHive/provider-config/issues/72)) ([ac86b9d](https://github.com/CourtHive/provider-config/commit/ac86b9d5a8cc7e97819b9d485bacba85fc86b1f7))

## [0.14.0](https://github.com/CourtHive/provider-config/compare/v0.13.0...v0.14.0) (2026-08-21)


### Features

* **privacy:** reference a named participant-privacy policy, and let a provisioner set a floor ([#69](https://github.com/CourtHive/provider-config/issues/69)) ([47204c4](https://github.com/CourtHive/provider-config/commit/47204c4de4ecdfd8566fdd8bad161f2891520a3f))

## [0.13.0](https://github.com/CourtHive/provider-config/compare/v0.12.0...v0.13.0) (2026-08-13)


### Features

* **policies:** add governing bodies + college divisions, fix dropped tier systems ([#64](https://github.com/CourtHive/provider-config/issues/64)) ([feeb3ef](https://github.com/CourtHive/provider-config/commit/feeb3ef63eb54abf1e7998eacb77d24e9be22574))

## [0.12.0](https://github.com/CourtHive/provider-config/compare/v0.11.1...v0.12.0) (2026-08-07)


### Features

* **permissions:** gate matchUp scorekeeper/timekeeper assignment on canCreateOfficials ([01a0c1e](https://github.com/CourtHive/provider-config/commit/01a0c1e858fa7bf18316c81c0b36e6d9738a55df))

## [0.11.1](https://github.com/CourtHive/provider-config/compare/v0.11.0...v0.11.1) (2026-07-14)


### Bug Fixes

* **deps:** pin typescript to 6.0.3 to block native ts7 ([bf0cea4](https://github.com/CourtHive/provider-config/commit/bf0cea4f28620be02db629993f658ab8dc3882ac))

## [0.11.0](https://github.com/CourtHive/provider-config/compare/v0.10.0...v0.11.0) (2026-07-08)


### Features

* **settings:** add provider crowd-scoring enable gate (default on) ([2f23466](https://github.com/CourtHive/provider-config/commit/2f234660fccebf0a46237d39a584e63c98646b8e))

## [0.10.0](https://github.com/CourtHive/provider-config/compare/v0.9.0...v0.10.0) (2026-07-06)


### Features

* gate proColumnResolve on canModifySchedule ([6a0adb9](https://github.com/CourtHive/provider-config/commit/6a0adb91eaa591dbe9a69bd0d2ef83ac2c208597))


### Documentation

* expand readme api reference and add CLAUDE.md ([0620f8f](https://github.com/CourtHive/provider-config/commit/0620f8fcbee5e0f96198c95eb01c84d4993d8770))

## [0.9.0](https://github.com/CourtHive/provider-config/compare/v0.8.0...v0.9.0) (2026-07-03)


### Features

* **settings:** add provider-editable branding and participant-privacy policy ([#37](https://github.com/CourtHive/provider-config/issues/37)) ([71dd025](https://github.com/CourtHive/provider-config/commit/71dd02545ec188e9f57e79db5b34e9ceffb267f0))

## [0.8.0](https://github.com/CourtHive/provider-config/compare/v0.7.0...v0.8.0) (2026-06-29)


### Features

* **scoring-launch:** add provider scoringLaunch integration config ([e4c2391](https://github.com/CourtHive/provider-config/commit/e4c239146e2f3a436d2ee9882f0bb5b68528d90b))

## [0.7.0](https://github.com/CourtHive/provider-config/compare/v0.6.0...v0.7.0) (2026-06-21)


### Features

* **permissions:** add canUseChat provider permission ([9a5172f](https://github.com/CourtHive/provider-config/commit/9a5172f88865bc6e91d8ddf082a616df864c778f))

## [0.6.0](https://github.com/CourtHive/provider-config/compare/v0.5.0...v0.6.0) (2026-06-08)


### Features

* **types:** allowedTierSystems on provider policy + caps ([9cec8ac](https://github.com/CourtHive/provider-config/commit/9cec8ac658b6ff566cfb67db78b91d1e5f741c3a))
* **types:** export AllowedTierSystem ([4a0204f](https://github.com/CourtHive/provider-config/commit/4a0204f909aab31735b26b3c3650eb6960e80ee6))
* **types:** rankingPointsPolicy field + resolver (closed-enum kind) ([305b670](https://github.com/CourtHive/provider-config/commit/305b67027347c4e2b66391b5b84964965e7da3fe))

## [0.5.0](https://github.com/CourtHive/provider-config/compare/v0.4.0...v0.5.0) (2026-06-06)


### Features

* **validators:** deeper L3 type-checking on policy interiors ([#23](https://github.com/CourtHive/provider-config/issues/23)) ([c621d1b](https://github.com/CourtHive/provider-config/commit/c621d1bd250680bde5a36721f535bf90e5672df0))

## [0.4.0](https://github.com/CourtHive/provider-config/compare/v0.3.0...v0.4.0) (2026-05-31)


### Features

* **types:** add themeTokens + stylesheetUrl to ProviderBranding ([25a11c9](https://github.com/CourtHive/provider-config/commit/25a11c9620a6e0b379ab7f6a6b9017dfe0e13cb8))

## [0.3.0](https://github.com/CourtHive/provider-config/compare/v0.2.0...v0.3.0) (2026-05-26)

### Features

- **defaults:** add provider defaultPdfFont setting ([#10](https://github.com/CourtHive/provider-config/issues/10)) ([bdeadba](https://github.com/CourtHive/provider-config/commit/bdeadba7ca96d053ca29a355467895d49f6b0e3c))
