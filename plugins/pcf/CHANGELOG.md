# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2024-05-15

### Added

- Added support for managed solutions in package executor and generator. ART-362

## [1.2.0] - 2024-05-07

### Changed

- Fixed versioning of control manifest. The version in the manifest now cuts label from the semver because of microsoft restrictions. ART-344
- Solution manifest version is now create from package.json version instead of control manifest version because the manifest doesn't contain the label version number now and we need it as 4th version number. ART-344

## [1.1.0] - 2024-04-28

### Added

- Added non-generic DataSet of-type support. ART-284
- Added publish target generation to generator. ART-283
- Introduced `componentName` generator parameter. ART-283
- Added proxy target generation to generator. ART-282

### Changed

- Updated tsconfig.spec.json generation to include powerapps-component-framework types. ART-284
- Set sensible defaults to generator parameters. ART-283
- Don't use hashes in dev mode build. ART-283

## [1.0.0] - 2024-04-19

### Fixed

- Fixed `outputPath` for `package` executor config generation, also with `{version}` placeholder added. ART-239
